// ============================================================================
// EDGE FUNCTION — Invio email massivo alle clienti (offerte, novità, last minute)
// Chiamata dal pannello gestione (scheda "Messaggi") → _sb.functions.invoke("broadcast").
// Invia SOLO alle clienti con consenso = true (GDPR). De-duplica le email.
//
// Deploy:  supabase functions deploy broadcast
// Secret:  RESEND_API_KEY, SITE_NOME, EMAIL_MITTENTE (oltre a SUPABASE_URL/SERVICE_ROLE)
// Sicurezza: protetta dal JWT del titolare loggato (verify_jwt attivo di default).
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function emailHtml(testo: string, siteNome: string): string {
  const body = testo.replace(/\n/g, "<br>");
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
    <p>${body}</p>
    <p style="font-size:13px;color:#8c8378;margin-top:24px">A presto,<br>${siteNome}</p>
    <p style="font-size:11px;color:#b3aa9e">Non vuoi più ricevere questi messaggi? Rispondi con "STOP".</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    // Sicurezza: solo un utente LOGGATO (la titolare) può inviare email massive.
    // La chiave anon pubblica NON è un utente → getUser fallisce → bloccato.
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u, error: uerr } = await supabase.auth.getUser(jwt);
    if (uerr || !u?.user) return new Response(JSON.stringify({ error: "non autorizzato" }), { status: 401, headers: CORS });

    const { subject, text } = await req.json();
    if (!text) return new Response(JSON.stringify({ error: "messaggio vuoto" }), { status: 400, headers: CORS });

    // Nome attività e mittente dalle impostazioni (come le altre funzioni)
    const { data: settings } = await supabase.from("settings").select("key,value");
    const getS = (k: string, def = "") => settings?.find((s: any) => s.key === k)?.value ?? def;
    const siteNome = getS("nome_attivita", "Il nostro centro");
    const mittente = getS("email_mittente", "Novità <onboarding@resend.dev>");

    const { data: rows, error } = await supabase
      .from("prenotazioni").select("email").eq("consenso", true);
    if (error) throw error;

    const emails = [...new Set((rows ?? []).map((r: any) => (r.email || "").trim().toLowerCase()).filter(Boolean))];
    let inviate = 0;
    for (const to of emails) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: mittente, to, subject: subject || `Novità da ${siteNome}`, html: emailHtml(text, siteNome) }),
      });
      if (r.ok) inviate++;
    }
    return new Response(JSON.stringify({ inviate, totale: emails.length }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
