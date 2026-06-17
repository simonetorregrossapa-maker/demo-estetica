# MIGRAZIONE — dal sito Barbieri al sito Centri Estetici

Documento richiesto dalla Fase 0: cosa è stato **riutilizzato**, **adattato** e **aggiunto** rispetto al progetto esistente `~/demo-barber`.

## Stack di partenza (analizzato in `~/demo-barber`)
Sito **statico single-file** (`index.html`, vanilla JS, nessun build) con:
- **Supabase** (Postgres + Auth + Realtime) → tabelle `prenotazioni`, `blocchi`, `annunci`, `settings`.
- **EmailJS** → email di conferma al cliente.
- **Web3Forms** → notifica della prenotazione al titolare.
- **Resend** via **Supabase Edge Function** (`supabase/functions/recensioni`) → richiesta recensione automatica.
- Hosting **GitHub Pages**.
- Sistema di **personalizzazione demo via parametri URL** + `genera-link.html` (outreach WhatsApp).
- Pannello **admin** in overlay; flusso di **cancellazione** con `cancel_token`.

Lo stesso stack è stato riusato integralmente per coerenza e manutenibilità.

## ✅ Riutilizzato (stessa logica)
| Componente | Note |
|---|---|
| Motore prenotazione | calendario con giorni chiusi/passati disabilitati, **disponibilità realtime** da Supabase (slot prenotati + blocchi, blocco `GIORNO`), validazioni form. |
| Doppia notifica | Web3Forms al centro + EmailJS al cliente. |
| Cancellazione | `cancel_token` univoco + pagina dedicata (`annulla.html`). |
| Edge Function recensioni | gestione fuso `Europe/Rome`, finestra invio (≥ N ore, ≤ 2 giorni), flag `recensione_inviata`, parametri da tabella `settings`. |
| Smart routing recensioni | soddisfatta → Google · insoddisfatta → feedback privato (protezione stelle pubbliche). |
| Personalizzazione demo | parametri URL ribrandizzano il sito al volo + banner demo. |
| `genera-link.html` | strumento commerciale di outreach via WhatsApp. |
| Annunci realtime | banner in tempo reale a tutte le clienti (tabella `annunci`). |

## 🔧 Adattato (barbiere → centro estetico)
| Prima | Dopo |
|---|---|
| `barbiere` | `operatrice` / estetista (tabella, query, UI) |
| "taglio" a prezzo fisso | **trattamenti** con **durata variabile** (20–90′) e categorie (viso, corpo, epilazione, mani&piedi, massaggi) |
| slot fissi barbiere | slot con **pausa pranzo** e durata trattamento nel riepilogo |
| recensione a 2 bottoni nell'email | **star-gate a 5 stelle** (`recensione.html`) con soglia configurabile, usato anche per il **QR in sede** |
| tema scuro/oro | **tema chiaro editoriale beauty** (cipria/salvia/crema), variabili da config |
| costanti inline nell'HTML | tutto spostato in **`config.js`** centrale |
| single-file SPA | **multi-pagina** statico (vedi sotto) |

## ➕ Aggiunto (richiesto dal brief estetica)
- **`config.js`**: un unico file con tutti i dati personalizzabili (brand, colori, font, contatti, orari, trattamenti, team, pacchetti, acconto, social, integrazioni, parametri recensioni, SEO, legal).
- **Architettura multi-pagina** con chrome condiviso (`components.js` inietta header/footer/cookie/SEO/JSON-LD da config) → URL reali, meta uniche per pagina, sitemap multi-URL (più SEO-friendly del single-file).
- **Pagine nuove**: Trattamenti, Pacchetti/Buoni regalo, Chi siamo, Galleria (con spazio before/after), Recensioni, FAQ, Blog (+3 articoli SEO), Privacy/Cookie/Termini.
- **Dashboard recensioni** (`dashboard.html`): statistiche, feedback privati, **generatore QR** per la raccolta in sede.
- **Feedback privato** (`feedback.html`) e **landing star-gate** (`recensione.html`) come pagine a sé.
- **Predisposizione acconto/caparra** (`config.acconto`, disattivata di default).
- **Tabella `feedback`** + `settings` ampliata; **RLS** documentata in `schema.sql`.
- **Degradazione elegante**: senza Supabase configurato la demo è pienamente navigabile (slot lato client, prenotazione simulata, star-gate funzionante).

## File non riprodotti
Il **pannello admin overlay** del barbiere non è stato re-incollato pixel per pixel: la sua funzione di gestione è coperta dal pannello Supabase + dalla `dashboard.html`. Reintegrabile riusando le funzioni `adm*` del barbiere se il cliente vuole l'overlay self-service.
