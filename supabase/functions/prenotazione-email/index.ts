// ============================================================================
// EDGE FUNCTION — Email alla creazione di una prenotazione
// Innescata da un DATABASE WEBHOOK di Supabase su INSERT in `prenotazioni`.
// Manda: 1) conferma al cliente (con link di disdetta) · 2) avviso al titolare.
//
// Deploy:   supabase functions deploy prenotazione-email --no-verify-jwt
// Secrets:  RESEND_API_KEY, SITE_URL, WEBHOOK_SECRET (+ SUPABASE_URL/SERVICE_ROLE auto)
// Webhook:  Database → Webhooks → su INSERT di `prenotazioni`, POST a questa
//           function, con header  x-webhook-secret: <WEBHOOK_SECRET>
// Mittente/destinatario titolare: dalla tabella `settings`
//           (email_mittente, email_titolare, nome_attivita).
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

async function sendEmail(from: string, to: string, subject: string, html: string): Promise<boolean> {
  if (!to) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!r.ok) console.error("resend", r.status, await r.text());
  return r.ok;
}

function box(rows: [string, string][]): string {
  return rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#8c8378">${k}</td><td style="padding:6px 0;text-align:right;font-weight:600">${v}</td></tr>`).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET)
    return new Response("Unauthorized", { status: 401 });

  try {
    const payload = await req.json();
    const p = payload.record ?? payload;   // webhook: { type, record } · oppure body diretto
    if (!p || !p.email) return new Response(JSON.stringify({ skip: "no record" }), { status: 200 });

    const { data: settings } = await supabase.from("settings").select("key,value");
    const get = (k: string, def = "") => settings?.find((s: any) => s.key === k)?.value ?? def;
    const attivita = get("nome_attivita", "il nostro centro");
    const mittente = get("email_mittente", "Prenotazioni <onboarding@resend.dev>");
    const emailTitolare = get("email_titolare", "");

    const cancelUrl = `${SITE_URL}/annulla.html?token=${p.cancel_token}`;
    const dett = box([
      ["Trattamento", p.servizio],
      ["Operatrice", p.operatrice],
      ["Quando", `${p.data} · ${p.orario}`],
      ["Durata", p.durata ?? "—"],
      ["Prezzo", (p.prezzo ?? "—") + "€"],
    ]);

    // 1) Conferma al cliente
    const htmlCliente = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
        <p>Ciao ${p.nome},</p>
        <p>la tua prenotazione da <strong>${attivita}</strong> è stata registrata. Ecco il riepilogo:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${dett}</table>
        <p style="font-size:13px;color:#8c8378">Hai un imprevisto? Puoi <a href="${cancelUrl}">annullare qui</a>.</p>
        <p style="font-size:13px;color:#8c8378">A presto,<br>${attivita}</p>
      </div>`;
    const okCliente = await sendEmail(mittente, p.email, `Prenotazione confermata — ${attivita}`, htmlCliente);

    // 2) Avviso al titolare
    let okTitolare = false;
    if (emailTitolare) {
      const htmlTit = `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
          <p><strong>Nuova prenotazione</strong></p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            ${box([["Cliente", p.nome], ["Email", p.email], ["Telefono", p.telefono ?? "—"]])}
            ${dett}
            ${box([["Note", p.note ?? "—"]])}
          </table>
        </div>`;
      okTitolare = await sendEmail(mittente, emailTitolare, `Nuova prenotazione — ${p.nome} (${p.data} ${p.orario})`, htmlTit);
    }

    return new Response(JSON.stringify({ okCliente, okTitolare }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
