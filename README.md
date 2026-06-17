# Bellezza Studio — Sito per Centri Estetici (template riusabile)

Sito web completo, ad alta conversione e SEO, per centri estetici / istituti di bellezza.
**Stack:** HTML/CSS/JS statico (nessun build) · Supabase · EmailJS · Web3Forms · Resend (Edge Function).
Pensato come **template**: per un nuovo cliente si modifica (quasi) solo `config.js`.

---

## 1. Avvio in locale

Serve un piccolo web server (i file usano `fetch`/moduli, non aprire con `file://`):

```bash
cd demo-estetica
python3 -m http.server 8000
# poi apri http://localhost:8000
```

La demo funziona **anche senza backend**: gli slot sono mostrati lato client, la prenotazione viene simulata e lo star-gate recensioni è pienamente navigabile.

### Pagine principali
| URL | Pagina |
|---|---|
| `/` | Home |
| `/trattamenti.html` | Listino trattamenti (+ prenota per trattamento) |
| `/prenota.html` | Prenotazione online |
| `/pacchetti.html` · `/chi-siamo.html` · `/galleria.html` · `/recensioni.html` · `/contatti.html` · `/faq.html` | Contenuti |
| `/blog/` | Blog + 3 articoli SEO |
| `/recensione.html` | **Star-gate** recensioni (link email/QR) |
| `/feedback.html` | Feedback privato (voti sotto soglia) |
| `/dashboard.html` | Dashboard recensioni + **QR in sede** |
| `/annulla.html` | Disdetta prenotazione |
| `/genera-link.html` | Strumento commerciale (demo personalizzata via WhatsApp) |
| `/privacy.html` · `/cookie.html` · `/termini.html` | Pagine legali |

---

## 2. Configurare la PRENOTAZIONE (Supabase + email)

1. Crea un progetto su [supabase.com](https://supabase.com).
2. SQL Editor → incolla ed esegui `supabase/schema.sql` (crea tabelle, RLS, realtime).
3. In `config.js → integrazioni` inserisci `supabaseUrl` e `supabaseAnon` (Project Settings → API).
4. **Email di conferma cliente (EmailJS):** crea account su [emailjs.com](https://emailjs.com), collega un servizio Gmail, crea un template con i campi `{{to_name}} {{to_email}} {{servizio}} {{operatrice}} {{data}} {{orario}} {{prezzo}} {{durata}} {{cancel_link}} {{attivita}}` e copia `emailjsKey/Service/Template` in `config.js`.
5. **Notifica al centro (Web3Forms):** ottieni una access key su [web3forms.com](https://web3forms.com) e mettila in `config.js → integrazioni.web3formsKey`.

Senza questi valori il sito resta in **modalità demo** (nessuna persistenza).

---

## 3. Configurare le RECENSIONI AUTOMATICHE

Tutti i parametri sono in `config.js → recensioniAuto`:

| Parametro | Significato |
|---|---|
| `googlePlaceId` / `googleReviewUrl` | scheda Google del cliente (link "lascia recensione") |
| `canale` | `email` / `sms` / `whatsapp` |
| `oreAttesa` | ritardo invio dopo l'appuntamento (es. 3 ore) |
| `sogliaStelle` | ≥ soglia → Google · < soglia → feedback privato |
| `messaggi.*` | testi in italiano con segnaposto `{nome} {trattamento} {attivita}` |
| `consensoObbligatorio` | GDPR: invio solo con consenso esplicito |

**Invio automatico (Edge Function):**
```bash
supabase functions deploy recensioni
supabase secrets set RESEND_API_KEY=...  SITE_URL=https://tuodominio.it
# poi schedula con pg_cron (vedi commento in supabase/functions/recensioni/index.ts)
```
La function legge i parametri runtime dalla tabella `settings` (allineata a `config.js`).

**Raccolta in sede:** apri `dashboard.html` → c'è il **QR** che punta a `recensione.html` (stesso filtro intelligente). Stampalo per la reception.

---

## 4. Personalizzare per un NUOVO cliente

Nella maggior parte dei casi basta `config.js`:

1. **Brand**: nome, città, indirizzo, quartiere, CAP, anni attività.
2. **Tema**: `tema.colori` (le variabili CSS si aggiornano da sole) e i font.
3. **Contatti & orari**: telefono, WhatsApp, email, mappa, giorni chiusi, slot.
4. **Trattamenti**: `categorie` (nome, durata, prezzo, descrizione) → aggiornano automaticamente Home, Trattamenti, selettore prenotazione e schema.org.
5. **Team / pacchetti / recensioni / numeri / social**.
6. **Integrazioni e `recensioniAuto`** (vedi sopra).
7. **SEO/Legal**: `seo.dominio`, `legal.*`. Aggiorna anche `sitemap.xml` e `robots.txt` col dominio reale.

> Demo al volo per un prospect: `genera-link.html` crea un link con i parametri URL che ribrandizzano il sito (`?nome=...&citta=...&tel=...`) senza toccare i file.

---

## 5. Deploy

**GitHub Pages** (come il sito barbieri):
```bash
git add . && git commit -m "Sito centro estetico"
git push   # poi Settings → Pages → branch main
```
Funziona su qualsiasi hosting statico (Netlify, Vercel, Cloudflare Pages). Ricordati di impostare il dominio in `config.js → seo.dominio` per canonical/OG corretti.

---

## 6. SEO inclusa
Meta `title`/`description` unici per pagina, canonical, Open Graph/Twitter, JSON-LD (`BeautySalon`, `Service`, `Review`/`AggregateRating`, `FAQPage`, `Article`), un solo `<h1>` per pagina, breadcrumb, alt text, sitemap multi-URL, robots, favicon, `lang="it"`, font con `display=swap` e immagini lazy. Per i Core Web Vitals: sostituisci i placeholder con immagini reali in **WebP/AVIF**.

## Struttura
```
config.js          ← UNICO file da personalizzare (dati + tema + chiavi)
components.js       ← header/footer/cookie/SEO/JSON-LD condivisi
app.js             ← motore prenotazione + recensioni (smart routing)
styles.css         ← tema beauty chiaro
*.html             ← pagine
blog/              ← blog + articoli
supabase/          ← schema.sql + edge function recensioni
sitemap.xml robots.txt
README.md MIGRAZIONE.md
```
Vedi `MIGRAZIONE.md` per cosa è stato riusato/adattato/aggiunto rispetto al sito barbieri.
