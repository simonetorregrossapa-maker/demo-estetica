// ============================================================================
// EDGE FUNCTION — Richiesta automatica di nuovo appuntamento ("è ora del ritocco")
// Da schedulare con un cron Supabase GIORNALIERO (es. ogni mattina alle 9):
//   select cron.schedule('nuovo-appuntamento','0 9 * * *',
//     $$ select net.http_post('https://<ref>.functions.supabase.co/nuovo-appuntamento') $$);
//
// Logica: a chi ha dato il consenso, è passato l'intervallo di "ricarica" del
// trattamento (campo richiamo_giorni sulla prenotazione, impostato dal sito dal
// config; se NULL si usa GIORNI_NUOVO_APPUNTAMENTO da settings) e NON ha già un
// appuntamento futuro, invia un invito a riprenotare. Marca richiamo_inviato per
// non insistere. Le clienti inattive da molto tempo restano alla function
// `riattivazione`: qui ci fermiamo a una finestra di ~30 giorni dopo la scadenza.
//
// Deploy:  supabase functions deploy nuovo-appuntamento --no-verify-jwt
// Secrets: RESEND_API_KEY, SITE_URL (+ SUPABASE_URL/SERVICE_ROLE auto)
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");

const GIORNO = 86400000;
const FINESTRA_EXTRA = 30 * GIORNO;   // oltre questa finestra → è "dormiente", la gestisce riattivazione

function emailHtml(nome: string, attivita: string, trattamento: string, msg: string, link: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
    <p>Ciao ${nome},</p>
    <p>${msg.replace("{nome}", nome).replace("{attivita}", attivita).replace("{trattamento}", trattamento)}</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="display:inline-block;background:#6e4e2e;color:#fff;text-decoration:none;padding:14px 26px;border-radius:50px;font-size:16px">Prenota il prossimo appuntamento</a>
    </p>
    <p style="font-size:13px;color:#8c8378">A presto,<br>${attivita}</p>
    <p style="font-size:11px;color:#b3aa9e">Non vuoi più ricevere questi promemoria? Rispondi con "STOP".</p>
  </div>`;
}

Deno.serve(async () => {
  const { data: settings } = await supabase.from("settings").select("key,value");
  const get = (k: string, def = "") => settings?.find((s: any) => s.key === k)?.value ?? def;

  const attivita = get("nome_attivita", "il nostro centro");
  const mittente = get("email_mittente", "Promemoria <onboarding@resend.dev>");
  const giorniDefault = Number(get("giorni_nuovo_appuntamento", "30"));
  const msg = get("msg_nuovo_appuntamento", "È passato un po' dal tuo {trattamento}: è il momento giusto per il prossimo appuntamento.");

  const oggi = new Date().toISOString().slice(0, 10);

  // Candidate: con consenso, non cancellate, non ancora richiamate.
  const { data: prenotazioni, error } = await supabase
    .from("prenotazioni")
    .select("id,nome,email,servizio,data,richiamo_giorni")
    .eq("consenso", true)
    .neq("stato", "cancellata")
    .eq("richiamo_inviato", false);
  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  // Email che hanno GIÀ un appuntamento futuro → niente invito (hanno già riprenotato).
  const { data: future } = await supabase
    .from("prenotazioni")
    .select("email")
    .neq("stato", "cancellata")
    .gte("data", oggi);
  const giaPrenotate = new Set((future ?? []).map((r: any) => (r.email || "").trim().toLowerCase()));

  const now = Date.now();
  let inviati = 0;

  for (const p of prenotazioni ?? []) {
    if (!p.email) continue;
    const interval = (p.richiamo_giorni && p.richiamo_giorni > 0) ? p.richiamo_giorni : giorniDefault;
    if (!interval || interval <= 0) continue;

    const dataMs = Date.parse(p.data + "T00:00:00Z");
    if (Number.isNaN(dataMs)) continue;
    const scadenza = dataMs + interval * GIORNO;
    if (now < scadenza) continue;                  // non è ancora ora
    if (now - scadenza > FINESTRA_EXTRA) {         // troppo tardi → la gestisce riattivazione
      await supabase.from("prenotazioni").update({ richiamo_inviato: true }).eq("id", p.id);
      continue;
    }
    if (giaPrenotate.has((p.email || "").trim().toLowerCase())) {
      await supabase.from("prenotazioni").update({ richiamo_inviato: true }).eq("id", p.id);
      continue;
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mittente, to: p.email,
        subject: `È il momento del prossimo appuntamento — ${attivita}`,
        html: emailHtml(p.nome, attivita, p.servizio, msg, `${SITE_URL}/prenota.html`),
      }),
    });
    if (r.ok) {
      await supabase.from("prenotazioni").update({ richiamo_inviato: true }).eq("id", p.id);
      inviati++;
    }
  }

  return new Response(JSON.stringify({ inviati }), { headers: { "Content-Type": "application/json" } });
});
