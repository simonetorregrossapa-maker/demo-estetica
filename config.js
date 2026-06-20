/* ============================================================================
   CONFIGURAZIONE CENTRALE — Torregrossa Studio (template centri estetici)
   ----------------------------------------------------------------------------
   Questo è L'UNICO file da modificare per ribrandizzare il sito su un nuovo
   cliente. Cambia nome, colori, contatti, orari, trattamenti, team, pacchetti,
   parametri del sistema di recensioni automatiche e chiavi dei servizi.
   Tutte le pagine (.html) leggono da qui tramite window.SITE.
   ============================================================================ */

window.SITE = {

  /* ── IDENTITÀ ATTIVITÀ ─────────────────────────────────────────────── */
  brand: {
    nome:        "Torregrossa Studio",
    claim:       "Istituto di bellezza & SPA urbana",
    citta:       "Palermo",
    provincia:   "PA",
    cap:         "90144",
    indirizzo:   "Via della Libertà 128",
    quartiere:   "Libertà",
    anniAttivita: 12,
    pIva:        "01234567890",
  },

  /* ── CONTATTI ──────────────────────────────────────────────────────── */
  contatti: {
    // Telefono in formato display e href (href senza spazi, con prefisso)
    telDisplay:  "+39 091 123 4567",
    telHref:     "+39091234567",
    whatsapp:    "393201234567",          // solo cifre, con prefisso internazionale
    email:       "info@torregrossastudio.it",
    // Coordinate o query per la mappa Google embed (nome + indirizzo come fallback)
    mapsQuery:   "Via della Libertà 128, Palermo",
    mapsEmbed:   "",                        // opzionale: URL embed diretto (pb=...). Se vuoto usa mapsQuery
  },

  /* ── ORARI DI APERTURA ─────────────────────────────────────────────── */
  // Giorni chiusi: 0=Dom, 1=Lun ... 6=Sab. Qui chiuso Domenica e Lunedì.
  orari: {
    chiusoGiorni: [0, 1],
    testo: [
      { g: "Lunedì",            o: "Chiuso" },
      { g: "Martedì — Venerdì", o: "09:00 – 19:30" },
      { g: "Sabato",            o: "09:00 – 18:00" },
      { g: "Domenica",          o: "Chiuso" },
    ],
    // Slot prenotabili (start di ogni appuntamento). Pausa pranzo 13:30–15:00.
    slot: ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00",
           "15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"],
  },

  /* ── TEMA (colori + font) ──────────────────────────────────────────── */
  // Palette beauty: cipria/rosa antico + verde salvia + crema. Modificabile qui.
  tema: {
    // I valori vengono iniettati come CSS custom properties (--nome) da components.js
    // Palette beauty sofisticata e calda — NIENTE oro. Rosa antico/cipria +
    // verde salvia + crema/tortora. Tonalità verificate per contrasto AA.
    colori: {
      // Palette TWINS BEAUTY — bianco/crema + nero + ORO/bronzo. (Scelta esplicita del cliente.)
      // Accenti con testo bianco usano il bronzo (AA); l'oro chiaro è solo decorativo (gradienti/bordi).
      "rosa":        "#8c6a3f",   // bronzo — accento con testo bianco (nav CTA, chip, link) — nome mantenuto per compat.
      "rosa-light":  "#f4ecdd",   // oro pallido/crema — sfondi morbidi, blob, community
      "rosa-dark":   "#6e4e2e",   // bronzo profondo — azioni/CTA, testo accento (AA su bianco)
      "salvia":      "#b9ac9a",   // taupe caldo — accento secondario
      "salvia-dark": "#2c2823",   // espresso quasi nero — sezioni scure (testo crema AA)
      "crema":       "#ffffff",   // bianco — sfondo principale (come twins)
      "crema-2":     "#faf7f1",   // crema appena calda — sezioni alternate
      "sabbia":      "#e9e2d6",   // sabbia chiara — bordi e divisori
      "carbone":     "#1a1a1a",   // near-black — testo (come twins)
      "grigio":      "#6f665a",   // grigio caldo — testo tenue (AA su bianco)
      "gold":        "#c9a36a",   // ORO chiaro — accento decorativo (gradienti titoli, bordi)
      "gold-dark":   "#8c6a3f",   // bronzo — oro scuro
    },
    fontTitoli:  "'Poppins', sans-serif",
    fontTesto:   "'Montserrat', sans-serif",
  },

  /* ── CATEGORIE E TRATTAMENTI ───────────────────────────────────────── */
  // durata in minuti; prezzo in € (numero). I trattamenti guidano: pagina
  // Trattamenti, selettore in prenotazione, schema.org Service.
  categorie: [
    {
      id: "viso", nome: "Viso", foto: "1570172619644-dfd03ed5d881",
      descr: "Trattamenti viso personalizzati: pulizia profonda, idratazione e anti-età.",
      trattamenti: [
        { nome: "Pulizia viso profonda",      durata: 60, prezzo: 55, descr: "Detersione, esfoliazione, estrazione e maschera su misura del tuo tipo di pelle." },
        { nome: "Trattamento idratante",      durata: 50, prezzo: 50, descr: "Reidratazione intensa per pelli secche e spente, con acido ialuronico." },
        { nome: "Trattamento anti-age",       durata: 75, prezzo: 80, richiamo: 30, descr: "Protocollo distensivo con peptidi e massaggio liftante per ridurre i segni del tempo." },
        { nome: "Trattamento purificante",    durata: 60, prezzo: 60, descr: "Per pelli miste e impure: riequilibra il sebo e affina la grana della pelle." },
      ],
    },
    {
      id: "corpo", nome: "Corpo", foto: "1542848284-8afa78a08ccb",
      descr: "Rituali corpo rimodellanti, drenanti e rilassanti.",
      trattamenti: [
        { nome: "Massaggio rilassante",        durata: 50, prezzo: 55, descr: "Manualità lente e avvolgenti per sciogliere tensioni e ritrovare equilibrio." },
        { nome: "Massaggio drenante",          durata: 50, prezzo: 60, descr: "Linfodrenaggio per gambe leggere e ritenzione idrica." },
        { nome: "Trattamento anticellulite",   durata: 60, prezzo: 70, descr: "Protocollo rimodellante con fanghi attivi e massaggio mirato." },
        { nome: "Scrub & idratazione corpo",   durata: 45, prezzo: 45, descr: "Esfoliazione total body e applicazione di burro nutriente." },
      ],
    },
    {
      id: "epilazione", nome: "Epilazione", foto: "1598440947619-2c35fc9aa908",
      descr: "Epilazione con cera tiepida e prodotti lenitivi professionali.",
      trattamenti: [
        { nome: "Gambe complete",     durata: 40, prezzo: 28, richiamo: 28, descr: "Epilazione gambe intere con cera delicata e trattamento post-epilatorio." },
        { nome: "Mezza gamba",        durata: 25, prezzo: 18, descr: "Epilazione metà gamba." },
        { nome: "Inguine + ascelle",  durata: 30, prezzo: 25, descr: "Zone sensibili con cera tiepida lenitiva." },
        { nome: "Viso (sopracciglia/labbro)", durata: 20, prezzo: 12, descr: "Definizione sopracciglia e rifinitura labbro superiore." },
      ],
    },
    {
      id: "mani-piedi", nome: "Mani & Piedi", foto: "1607779097040-26e80aa78e66",
      descr: "Manicure e pedicure curate, con smalti semipermanenti di alta tenuta.",
      trattamenti: [
        { nome: "Manicure classica",          durata: 40, prezzo: 25, descr: "Cura delle cuticole, limatura e smalto a scelta." },
        { nome: "Manicure semipermanente",    durata: 55, prezzo: 35, richiamo: 21, descr: "Smalto semipermanente ad alta tenuta, fino a 3 settimane." },
        { nome: "Pedicure estetica",          durata: 50, prezzo: 38, richiamo: 35, descr: "Cura completa del piede con esfoliazione e smalto." },
        { nome: "Pedicure curativa",          durata: 60, prezzo: 45, descr: "Trattamento mirato per piedi che necessitano cure specifiche." },
      ],
    },
    {
      id: "massaggi", nome: "Massaggi & Benessere", foto: "1540555700478-4be289fbecef",
      descr: "Percorsi benessere per corpo e mente.",
      trattamenti: [
        { nome: "Massaggio decontratturante", durata: 50, prezzo: 60, descr: "Mirato su collo, spalle e schiena per sciogliere le contratture." },
        { nome: "Massaggio aromaterapico",    durata: 60, prezzo: 65, descr: "Oli essenziali selezionati per un profondo rilassamento sensoriale." },
        { nome: "Hot stone",                  durata: 70, prezzo: 75, descr: "Massaggio con pietre laviche calde per un benessere avvolgente." },
        { nome: "Percorso SPA (90')",         durata: 90, prezzo: 95, descr: "Rituale completo: scrub, massaggio e trattamento viso express." },
      ],
    },
  ],

  /* ── OPERATRICI / ESTETISTE ────────────────────────────────────────── */
  // Equivalente della "scelta barbiere". La prima è il default.
  team: [
    { nome: "Giulia",   ruolo: "Titolare · Estetista qualificata", esperienza: "12 anni", spec: "Trattamenti viso e anti-age", bio: "Diplomata estetista e specializzata in dermocosmesi, fonda Torregrossa Studio nel 2014.", foto: "https://i.pravatar.cc/400?img=45" },
    { nome: "Martina",  ruolo: "Estetista · Massoterapista",        esperienza: "8 anni",  spec: "Massaggi e rituali corpo",   bio: "Esperta in tecniche di massaggio e linfodrenaggio, segue i percorsi benessere.", foto: "https://i.pravatar.cc/400?img=47" },
    { nome: "Sara",     ruolo: "Onicotecnica",                       esperienza: "5 anni",  spec: "Mani, piedi e nail care",   bio: "Specializzata in ricostruzione e nail art, cura mani e piedi nei minimi dettagli.", foto: "https://i.pravatar.cc/400?img=44" },
  ],

  /* ── PACCHETTI / PERCORSI / BUONI REGALO ───────────────────────────── */
  pacchetti: [
    { nome: "Percorso Viso Luminosità",  prezzo: 199, vecchio: 240, durata: "5 sedute viso", descr: "Cinque trattamenti viso personalizzati per una pelle visibilmente più luminosa." },
    { nome: "Percorso Corpo Rimodella",  prezzo: 280, vecchio: 350, durata: "6 sedute corpo", descr: "Programma drenante e rimodellante per ritrovare tonicità." },
    { nome: "Abbonamento Massaggi",      prezzo: 250, vecchio: 300, durata: "5 massaggi 50'", descr: "Cinque massaggi a scelta, per il tuo benessere costante." },
    { nome: "Buono Regalo",              prezzo: null, vecchio: null, durata: "Importo libero", descr: "Regala benessere: buono valido su tutti i trattamenti, personalizzabile nell'importo." },
  ],

  /* ── CAPARRA / ACCONTO (punto di integrazione, disattivato di default)─ */
  acconto: {
    attivo: false,            // metti true per richiedere un acconto in prenotazione
    percentuale: 30,          // % del prezzo trattamento
    testo: "Per confermare è richiesto un acconto del {PERC}% del trattamento.",
    // provider: "stripe" | "paypal" — collega qui il checkout quando attivi
  },

  /* ── PROVE SOCIALI / NUMERI ────────────────────────────────────────── */
  numeri: [
    { valore: "12",     label: "Anni di attività" },
    { valore: "4.000+", label: "Clienti soddisfatte" },
    { valore: "4,9",    label: "Media recensioni Google" },
    { valore: "100%",   label: "Prodotti professionali" },
  ],

  /* ── RECENSIONI IN VETRINA (testimonianze statiche) ────────────────── */
  recensioni: [
    { nome: "Chiara R.",     voto: 5, testo: "Ambiente curatissimo e mani esperte. Esco sempre rigenerata, il trattamento viso anti-age è una coccola.", fonte: "Recensione Google" },
    { nome: "Federica M.",   voto: 5, testo: "Professionalità e pulizia impeccabili. Giulia capisce subito di cosa ha bisogno la mia pelle.", fonte: "Recensione Google" },
    { nome: "Valentina S.",  voto: 5, testo: "Il percorso drenante ha fatto la differenza. Mi sono sentita seguita seduta dopo seduta.", fonte: "Recensione Google" },
    { nome: "Alessia D.",    voto: 5, testo: "Prenotazione online comodissima e conferma immediata. La pedicure curativa è top.", fonte: "Recensione Google" },
  ],

  /* ── MEDIA / FOTO ──────────────────────────────────────────────────── */
  // ID foto Unsplash (verificate). Helper SITEUI.photo(id,w,h) costruisce l'URL.
  // Sostituibili con foto reali del centro: stesso id Unsplash o un percorso /assets.
  media: {
    hero:        "1519823551278-64ac92734fb1",
    chiSiamo:    "1512290923902-8a9f81dc236c",
    ambiente:    ["1519823551278-64ac92734fb1","1580618672591-eb180b1a973f","1512290923902-8a9f81dc236c",
                  "1519014816548-bf5fe059798b","1600334089648-b0d9d3028eb2","1556228578-8c89e6adf883",
                  "1542848284-8afa78a08ccb","1559599101-f09722fb4948"],
    beforeAfter: [["1633681926022-84c23e8cb2d6","1632345031435-8727f6897d53"],
                  ["1612817288484-6f916006741a","1540555700478-4be289fbecef"],
                  ["1604654894610-df63bc536371","1607779097040-26e80aa78e66"]],
    blog:        ["1503236823255-94609f598e71","1487412947147-5cebf100ffc2","1604654894610-df63bc536371"],
  },

  /* ── SOCIAL ────────────────────────────────────────────────────────── */
  social: {
    instagram: "https://instagram.com/",
    facebook:  "https://facebook.com/",
    tiktok:    "",
  },

  /* ── INTEGRAZIONI / CHIAVI SERVIZI ─────────────────────────────────── */
  // Lascia i placeholder per far girare la demo SENZA backend (degrada in
  // modo elegante). Compila per attivare prenotazioni reali e recensioni.
  integrazioni: {
    supabaseUrl:        "https://ykpujseilqkificwqfnd.supabase.co",
    supabaseAnon:       "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHVqc2VpbHFraWZpY3dxZm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjI4NTksImV4cCI6MjA5NzQzODg1OX0.14FEDt1NRYuWLkV8uvbvWS09SR4CaiHES5aB5NkQwDc",
    // EmailJS — email di conferma al cliente
    emailjsKey:         "YOUR_EMAILJS_PUBLIC_KEY",
    emailjsService:     "YOUR_EMAILJS_SERVICE",
    emailjsTemplate:    "YOUR_EMAILJS_TEMPLATE",
    emailjsTemplateAvviso: "YOUR_EMAILJS_TEMPLATE_AVVISO",
    // Web3Forms — notifica al centro estetico
    web3formsKey:       "YOUR_WEB3FORMS_KEY",
  },

  /* ── SISTEMA RECENSIONI AUTOMATICHE ────────────────────────────────── */
  // Tutti i parametri sono qui, riadattabili per ogni cliente.
  recensioniAuto: {
    // Link diretto "lascia recensione" della scheda Google Business del cliente.
    // Si ottiene da: search.google.com/local/writereview?placeid=PLACE_ID
    googlePlaceId:    "YOUR_GOOGLE_PLACE_ID",
    googleReviewUrl:  "",   // opzionale: incolla qui il link completo se già lo hai
    canale:           "email",   // "email" | "sms" | "whatsapp" (riusa il canale del sito)
    oreAttesa:        2,          // ore dopo l'appuntamento prima di inviare la richiesta
    sogliaStelle:     4,          // >= soglia → Google ; < soglia → feedback privato
    // Template messaggi (segnaposto: {nome}, {trattamento}, {attivita})
    messaggi: {
      richiesta:  "Ciao {nome}, grazie per essere stata da {attivita}. Com'è andato il tuo {trattamento}? Ci basta un attimo del tuo tempo.",
      ringraziamentoPubblico: "Grazie di cuore {nome}. Ci faresti felici lasciando due righe su Google.",
      ringraziamentoPrivato:  "Grazie {nome}. Ci dispiace non essere stati all'altezza: raccontaci cosa è andato storto, vogliamo rimediare.",
    },
    consensoObbligatorio: true,   // GDPR: invio solo con consenso esplicito
  },

  /* ── AUTOMAZIONI (ciclo di vita cliente) ───────────────────────────────
     Suite di automazioni che lavorano da sole via Supabase Edge Functions:
       • conferma prenotazione      → function prenotazione-email (webhook)
       • promemoria appuntamento     → function promemoria        (cron orario)
       • recensione post-trattamento → function recensioni        (cron, vedi recensioniAuto)
       • riattivazione dormienti     → function riattivazione     (cron giornaliero)
       • recupero contatti persi     → tabella contatti_persi + contatto-email (webhook)
       • email offerte a tutte       → function broadcast         (dal pannello)
     I PARAMETRI OPERATIVI reali vivono nella tabella `settings` di Supabase
     (lette dalle function). I valori qui sotto documentano la configurazione e
     guidano il COMPORTAMENTO FRONT-END (quando proporre il richiamo). */
  automazioni: {
    // Promemoria: gentile reminder X ore prima, riduce i no-show.
    promemoria:     { attivo: true, orePrima: 24 },
    // Riattivazione: win-back di chi non torna da troppo tempo, con un incentivo.
    riattivazione:  { attivo: true, giorniDormiente: 60, cooldownGiorni: 90,
                      incentivo: "uno sconto del 20% sul tuo prossimo trattamento" },
    // Recupero contatti persi: cattura il lead che sarebbe una chiamata persa.
    recuperoContatti: {
      attivo: true,
      // true = il box "Ti richiamiamo noi" appare SOLO quando il centro è chiuso;
      // false = sempre disponibile (es. su Contatti).
      soloQuandoChiuso: false,
      testo: "Linea occupata o sei di fretta? Lasciaci il numero, ti richiamiamo noi.",
    },
    // Lista d'attesa / posti last-minute: quando un giorno è pieno la cliente si
    // iscrive; alla prima cancellazione viene avvisata che si è liberato un posto.
    listaAttesa: { attivo: true },
    // Richiesta automatica di nuovo appuntamento ("è ora del ritocco"). L'intervallo
    // si prende dal trattamento (campo `richiamo` in giorni) o da `giorniDefault`.
    nuovoAppuntamento: { attivo: true, giorniDefault: 30 },
  },

  /* ── SEO ───────────────────────────────────────────────────────────── */
  seo: {
    dominio:     "https://torregrossastudio.it",   // dominio reale del cliente (per canonical/sitemap/OG)
    ogImage:     "/assets/og-cover.jpg",
    twitter:     "",
    // Title/description di default; ogni pagina può sovrascrivere via SITE.page()
    titleSuffix: "Centro Estetico a Palermo",
  },

  /* ── LEGAL ─────────────────────────────────────────────────────────── */
  legal: {
    titolare:    "Torregrossa Studio di Giulia Rossi",
    pIva:        "01234567890",
    annoInizio:  2014,
    emailPrivacy:"privacy@torregrossastudio.it",
  },
};
