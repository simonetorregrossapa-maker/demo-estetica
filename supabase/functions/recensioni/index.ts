// ============================================================================
// EDGE FUNCTION — Richiesta recensione automatica post-trattamento
// Adattata dal sito barbieri. Da schedulare con un cron Supabase (es. ogni ora):
//   select cron.schedule('recensioni','0 * * * *',
//     $$ select net.http_post('https://<ref>.functions.supabase.co/recensioni') $$);
//
// Logica: trova le prenotazioni completate da >= ORE_ATTESA ore, con consenso,
// non ancora contattate, e invia (via Resend) un messaggio con il link allo
// SMART ROUTING (recensione.html): la cliente sceglie le stelle e viene
// indirizzata a Google (>= soglia) o al feedback privato (< soglia).
// Tutti i parametri operativi stanno nella tabella `settings` (vedi schema.sql),
// così restano allineati a config.js → recensioniAuto.
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL")!; // es. https://bellezzastudio.it

function romeOffsetMs(d: Date): number {
  const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  const rome = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  return rome.getTime() - utc.getTime();
}
function appuntamentoUTC(data: string, orario: string): number {
  const [y, m, dd] = data.split("-").map(Number);
  const [hh, mi] = orario.replace(".", ":").split(":").map(Number);
  const naive = Date.UTC(y, m - 1, dd, hh, mi || 0);
  return naive - romeOffsetMs(new Date(naive));
}

function emailHtml(nome: string, attivita: string, trattamento: string, link: string, msg: string): string {
  return `
  <div style="font-family:'Outfit',Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
    <p>Ciao ${nome},</p>
    <p>${msg.replace("{nome}", nome).replace("{attivita}", attivita).replace("{trattamento}", trattamento)}</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="display:inline-block;background:#c98a8a;color:#fff;text-decoration:none;padding:14px 26px;border-radius:8px;font-size:16px">
        ★ Dicci com'è andata
      </a>
    </p>
    <p style="font-size:13px;color:#8c8378">Un abbraccio,<br>${attivita}</p>
    <p style="font-size:11px;color:#b3aa9e">Non vuoi più ricevere questi messaggi? Rispondi a questa email con "STOP".</p>
  </div>`;
}

Deno.serve(async () => {
  const { data: settings } = await supabase.from("settings").select("key,value");
  const get = (k: string, def = "") => settings?.find((s: any) => s.key === k)?.value ?? def;

  const attivita = get("nome_attivita", "il nostro centro");
  const mittente = get("email_mittente", "Bellezza Studio <onboarding@resend.dev>");
  const oreAttesa = Number(get("ore_attesa", "3"));
  const msgRichiesta = get("msg_richiesta", "Com'è andato il tuo {trattamento}? Ci basta un attimo del tuo tempo.");

  const dueGiorniFa = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const { data: prenotazioni, error } = await supabase
    .from("prenotazioni")
    .select("*")
    .eq("consenso", true)
    .eq("recensione_inviata", false)
    .neq("stato", "cancellata")
    .gte("data", dueGiorniFa);

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  const ora = Date.now();
  let inviate = 0;

  for (const p of prenotazioni ?? []) {
    const appMs = appuntamentoUTC(p.data, p.orario);
    if (Number.isNaN(appMs)) continue;
    const trascorse = ora - appMs;
    if (trascorse < oreAttesa * 3600000) continue;  // troppo presto
    if (trascorse > 2 * 86400000) continue;          // troppo tardi

    // Link allo smart routing, pre-popolato con nome e id (per il feedback privato)
    const link = `${SITE_URL}/recensione.html?nome=${encodeURIComponent(p.nome)}&id=${p.id}`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mittente, to: p.email,
        subject: `Com'è andata da ${attivita}? 🌸`,
        html: emailHtml(p.nome, attivita, p.servizio, link, msgRichiesta),
      }),
    });

    if (r.ok) {
      await supabase.from("prenotazioni").update({ recensione_inviata: true }).eq("id", p.id);
      inviate++;
    }
  }

  return new Response(JSON.stringify({ inviate }), { headers: { "Content-Type": "application/json" } });
});
