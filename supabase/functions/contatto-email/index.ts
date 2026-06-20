// ============================================================================
// EDGE FUNCTION — Avviso al titolare di una richiesta di richiamo (lead)
// Innescata da un DATABASE WEBHOOK di Supabase su INSERT in `contatti_persi`.
// È il "recupero chiamate perse" lato sito: una cliente che non riesce a
// telefonare lascia il numero, e il titolare riceve subito una mail per
// richiamarla finché è calda. La cliente NON riceve email (ha solo lasciato un
// numero), così evitiamo invii non richiesti.
//
// Deploy:   supabase functions deploy contatto-email --no-verify-jwt
// Secrets:  RESEND_API_KEY, WEBHOOK_SECRET (+ SUPABASE_URL/SERVICE_ROLE auto)
// Webhook:  Database → Webhooks → su INSERT di `contatti_persi`, POST a questa
//           function, con header  x-webhook-secret: <WEBHOOK_SECRET>
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
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
    const c = payload.record ?? payload;   // webhook: { type, record } · oppure body diretto
    if (!c || !c.telefono) return new Response(JSON.stringify({ skip: "no telefono" }), { status: 200 });

    const { data: settings } = await supabase.from("settings").select("key,value");
    const get = (k: string, def = "") => settings?.find((s: any) => s.key === k)?.value ?? def;
    const attivita = get("nome_attivita", "il nostro centro");
    const mittente = get("email_mittente", "Sito <onboarding@resend.dev>");
    const emailTitolare = get("email_titolare", "");

    if (!emailTitolare) return new Response(JSON.stringify({ skip: "no email_titolare" }), { status: 200 });

    const origineLabel: Record<string, string> = {
      callback: "Richiesta di richiamo dal sito",
      chiusura: "Richiamo richiesto a centro chiuso",
      telefonia: "Chiamata persa al centralino",
    };
    const titolo = origineLabel[c.origine ?? "callback"] ?? "Richiesta di richiamo";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
        <p><strong>${titolo}</strong></p>
        <p>Richiamala finché è calda:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${box([
            ["Nome", c.nome || "—"],
            ["Telefono", c.telefono],
            ["Desiderava", c.motivo || "—"],
          ])}
        </table>
        <p style="text-align:center;margin:22px 0">
          <a href="tel:${String(c.telefono).replace(/\s+/g, "")}" style="display:inline-block;background:#6e4e2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-size:15px">Chiama ${c.nome || "la cliente"}</a>
        </p>
        <p style="font-size:13px;color:#8c8378">${attivita}</p>
      </div>`;

    const ok = await sendEmail(mittente, emailTitolare, `${titolo} — ${c.nome || c.telefono}`, html);
    return new Response(JSON.stringify({ ok }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
