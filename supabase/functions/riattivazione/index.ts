// ============================================================================
// EDGE FUNCTION — Riattivazione clienti dormienti (win-back)
// Da schedulare con un cron Supabase GIORNALIERO (es. ogni mattina alle 9):
//   select cron.schedule('riattivazione','0 9 * * *',
//     $$ select net.http_post('https://<ref>.functions.supabase.co/riattivazione') $$);
//
// Logica: una cliente è "dormiente" se il suo ultimo appuntamento è più vecchio
// di GIORNI_DORMIENTE giorni. A chi ha dato il consenso e non è stata già
// ricontattata negli ultimi COOLDOWN_RIATTIVAZIONE giorni, invia (via Resend)
// un messaggio "ci manchi" con un incentivo e il link per riprenotare; registra
// l'invio nella tabella `riattivazioni` per non insistere troppo spesso.
// Parametri nella tabella `settings` (vedi schema.sql → allineati a config.js).
//
// Deploy:  supabase functions deploy riattivazione --no-verify-jwt
// Secrets: RESEND_API_KEY, SITE_URL (+ SUPABASE_URL/SERVICE_ROLE auto)
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");

// CORS: serve perché oltre al cron (server-side) questa function è chiamata anche
// dal pannello gestione nel browser ("Invia win-back ora") → il preflight OPTIONS
// va gestito, altrimenti il browser blocca la richiesta.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function emailHtml(nome: string, attivita: string, ultimoServizio: string, incentivo: string, link: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
    <p>Ciao ${nome},</p>
    <p>è passato un po' di tempo dalla tua ultima visita da <strong>${attivita}</strong>${ultimoServizio ? ` (${ultimoServizio})` : ""} e ci manchi.</p>
    <p>Per rivederti ti riserviamo <strong>${incentivo}</strong>.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="display:inline-block;background:#6e4e2e;color:#fff;text-decoration:none;padding:14px 26px;border-radius:50px;font-size:16px">
        Prenota ora
      </a>
    </p>
    <p style="font-size:13px;color:#8c8378">A prestissimo,<br>${attivita}</p>
    <p style="font-size:11px;color:#b3aa9e">Non vuoi più ricevere questi messaggi? Rispondi con "STOP".</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const { data: settings } = await supabase.from("settings").select("key,value");
  const get = (k: string, def = "") => settings?.find((s: any) => s.key === k)?.value ?? def;

  const attivita = get("nome_attivita", "il nostro centro");
  const mittente = get("email_mittente", "Novità <onboarding@resend.dev>");
  const giorniDormiente = Number(get("giorni_dormiente", "60"));
  const cooldown = Number(get("cooldown_riattivazione", "90"));
  const incentivo = get("incentivo_riattivazione", "uno sconto sul prossimo trattamento");

  // Tutte le prenotazioni con consenso (escluse le cancellate): aggrega per email
  // per trovare l'ULTIMO appuntamento di ogni cliente.
  const { data: prenotazioni, error } = await supabase
    .from("prenotazioni")
    .select("nome,email,servizio,data")
    .eq("consenso", true)
    .neq("stato", "cancellata");
  if (error) return new Response(JSON.stringify({ error }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });

  type Cliente = { nome: string; email: string; servizio: string; ultima: string };
  const perEmail = new Map<string, Cliente>();
  for (const p of prenotazioni ?? []) {
    const email = (p.email || "").trim().toLowerCase();
    if (!email) continue;
    const cur = perEmail.get(email);
    // 'YYYY-MM-DD' si confronta lessicograficamente = cronologicamente.
    if (!cur || p.data > cur.ultima) perEmail.set(email, { nome: p.nome, email, servizio: p.servizio, ultima: p.data });
  }

  // Email già ricontattate entro il cooldown → da saltare.
  const cooldownDa = new Date(Date.now() - cooldown * 86400000).toISOString();
  const { data: recenti } = await supabase
    .from("riattivazioni")
    .select("email")
    .gte("created_at", cooldownDa);
  const giaContattate = new Set((recenti ?? []).map((r: any) => (r.email || "").trim().toLowerCase()));

  // Soglia "dormiente": ultimo appuntamento prima di questa data.
  const sogliaDormiente = new Date(Date.now() - giorniDormiente * 86400000).toISOString().slice(0, 10);

  let inviate = 0;
  for (const c of perEmail.values()) {
    if (c.ultima >= sogliaDormiente) continue;        // ancora "attiva"
    if (giaContattate.has(c.email)) continue;         // già ricontattata di recente

    const link = `${SITE_URL}/prenota.html`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mittente, to: c.email,
        subject: `Ci manchi — ${attivita}`,
        html: emailHtml(c.nome, attivita, c.servizio, incentivo, link),
      }),
    });
    if (r.ok) {
      await supabase.from("riattivazioni").insert([{ email: c.email }]);
      inviate++;
    }
  }

  return new Response(JSON.stringify({ inviate }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
