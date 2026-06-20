// ============================================================================
// EDGE FUNCTION — Promemoria appuntamento (riduce i no-show)
// Da schedulare con un cron Supabase ORARIO:
//   select cron.schedule('promemoria','0 * * * *',
//     $$ select net.http_post('https://<ref>.functions.supabase.co/promemoria') $$);
//
// Logica: trova le prenotazioni non cancellate il cui appuntamento cade entro le
// prossime ORE_PROMEMORIA ore e per cui non è ancora partito il promemoria, e
// invia (via Resend) un gentile reminder. Imposta `promemoria_inviato=true` per
// non inviarlo due volte. Parametri nella tabella `settings` (vedi schema.sql).
//
// Deploy:  supabase functions deploy promemoria --no-verify-jwt
// Secrets: RESEND_API_KEY, SITE_URL (+ SUPABASE_URL/SERVICE_ROLE auto)
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");

// Stesso calcolo fuso Europe/Rome usato dalla function recensioni.
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

function emailHtml(nome: string, attivita: string, trattamento: string, operatrice: string, quando: string, msg: string, cancelUrl: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
    <p>Ciao ${nome},</p>
    <p>${msg.replace("{nome}", nome).replace("{attivita}", attivita).replace("{trattamento}", trattamento)}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#8c8378">Trattamento</td><td style="padding:6px 0;text-align:right;font-weight:600">${trattamento}</td></tr>
      <tr><td style="padding:6px 0;color:#8c8378">Operatrice</td><td style="padding:6px 0;text-align:right;font-weight:600">${operatrice}</td></tr>
      <tr><td style="padding:6px 0;color:#8c8378">Quando</td><td style="padding:6px 0;text-align:right;font-weight:600">${quando}</td></tr>
    </table>
    ${cancelUrl ? `<p style="font-size:13px;color:#8c8378">Un imprevisto? Puoi <a href="${cancelUrl}">annullare o spostare qui</a>.</p>` : ``}
    <p style="font-size:13px;color:#8c8378">A presto,<br>${attivita}</p>
  </div>`;
}

Deno.serve(async () => {
  const { data: settings } = await supabase.from("settings").select("key,value");
  const get = (k: string, def = "") => settings?.find((s: any) => s.key === k)?.value ?? def;

  const attivita = get("nome_attivita", "il nostro centro");
  const mittente = get("email_mittente", "Promemoria <onboarding@resend.dev>");
  const oreP = Number(get("ore_promemoria", "24"));
  const msg = get("msg_promemoria", "Ti aspettiamo per il tuo {trattamento}. A presto!");

  const oggi = new Date().toISOString().slice(0, 10);
  const { data: prenotazioni, error } = await supabase
    .from("prenotazioni")
    .select("*")
    .neq("stato", "cancellata")
    .eq("promemoria_inviato", false)
    .gte("data", oggi);

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  const ora = Date.now();
  let inviati = 0;

  for (const p of prenotazioni ?? []) {
    if (!p.email) continue;
    const appMs = appuntamentoUTC(p.data, p.orario);
    if (Number.isNaN(appMs)) continue;
    const mancano = appMs - ora;
    if (mancano <= 0) continue;                     // già passato
    if (mancano > oreP * 3600000) continue;         // ancora troppo lontano

    const cancelUrl = p.cancel_token ? `${SITE_URL}/annulla.html?token=${p.cancel_token}` : "";
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mittente, to: p.email,
        subject: `Promemoria appuntamento — ${attivita}`,
        html: emailHtml(p.nome, attivita, p.servizio, p.operatrice, `${p.data} · ${p.orario}`, msg, cancelUrl),
      }),
    });

    if (r.ok) {
      await supabase.from("prenotazioni").update({ promemoria_inviato: true }).eq("id", p.id);
      inviati++;
    }
  }

  return new Response(JSON.stringify({ inviati }), { headers: { "Content-Type": "application/json" } });
});
