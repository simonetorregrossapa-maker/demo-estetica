// ============================================================================
// EDGE FUNCTION — Posto liberato → avvisa la lista d'attesa (last-minute)
// Innescata da un DATABASE WEBHOOK su UPDATE di `prenotazioni`. Quando una
// prenotazione passa a 'cancellata', cerca la PRIMA iscritta in lista d'attesa
// che combacia (stesso giorno e operatrice, oppure "qualsiasi") e la avvisa via
// Resend che si è liberato un posto. La marca 'avvisata' per non insistere e per
// fairness (un solo avviso per posto, alla più in attesa da più tempo).
//
// Deploy:   supabase functions deploy posto-libero --no-verify-jwt
// Secrets:  RESEND_API_KEY, SITE_URL, WEBHOOK_SECRET (+ SUPABASE_URL/SERVICE_ROLE auto)
// Webhook:  Database → Webhooks → su UPDATE di `prenotazioni`, POST a questa
//           function, con header  x-webhook-secret: <WEBHOOK_SECRET>
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

function emailHtml(nome: string, attivita: string, quando: string, link: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2e2a26">
    <p>Ciao ${nome || ""},</p>
    <p>buone notizie: si è <strong>liberato un posto ${quando}</strong> da <strong>${attivita}</strong>, come da te richiesto in lista d'attesa.</p>
    <p>I posti vanno in fretta: se ti fa comodo, prenotalo subito.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="display:inline-block;background:#6e4e2e;color:#fff;text-decoration:none;padding:14px 26px;border-radius:50px;font-size:16px">Prenota il posto</a>
    </p>
    <p style="font-size:13px;color:#8c8378">A presto,<br>${attivita}</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET)
    return new Response("Unauthorized", { status: 401 });

  try {
    const payload = await req.json();
    const rec = payload.record ?? payload;
    const old = payload.old_record ?? null;
    // Ci interessa SOLO la transizione verso 'cancellata' (non confermata, ecc.).
    if (!rec || rec.stato !== "cancellata") return new Response(JSON.stringify({ skip: "not a cancellation" }), { status: 200 });
    if (old && old.stato === "cancellata") return new Response(JSON.stringify({ skip: "already cancelled" }), { status: 200 });

    const { data: settings } = await supabase.from("settings").select("key,value");
    const get = (k: string, def = "") => settings?.find((s: any) => s.key === k)?.value ?? def;
    const attivita = get("nome_attivita", "il nostro centro");
    const mittente = get("email_mittente", "Posti liberi <onboarding@resend.dev>");

    // Prima in lista che combacia: stesso giorno (o qualsiasi) e operatrice (o qualsiasi).
    const { data: cand } = await supabase
      .from("liste_attesa")
      .select("*")
      .eq("stato", "attiva")
      .eq("consenso", true)
      .or(`data.eq.${rec.data},data.is.null`)
      .or(`operatrice.eq.${rec.operatrice},operatrice.is.null`)
      .order("created_at", { ascending: true })
      .limit(1);

    const w = (cand ?? [])[0];
    if (!w) return new Response(JSON.stringify({ avvisate: 0 }), { headers: { "Content-Type": "application/json" } });

    const quando = `${rec.data} alle ${rec.orario}${rec.operatrice ? ` con ${rec.operatrice}` : ""}`;
    const link = `${SITE_URL}/prenota.html`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: mittente, to: w.email, subject: `Si è liberato un posto — ${attivita}`, html: emailHtml(w.nome, attivita, quando, link) }),
    });

    let avvisate = 0;
    if (r.ok) { await supabase.from("liste_attesa").update({ stato: "avvisata" }).eq("id", w.id); avvisate = 1; }
    return new Response(JSON.stringify({ avvisate }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
