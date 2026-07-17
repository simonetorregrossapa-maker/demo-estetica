/* ============================================================================
   CLIENTI.JS — Schede demo dei potenziali clienti (outreach)
   ----------------------------------------------------------------------------
   Ogni voce ribrandizza il sito sui dati REALI di un'attività. Si attiva con
   ?c=<slug> su qualsiasi pagina:  index.html?c=yumii-nail
   Il contenuto qui sovrascrive window.SITE (merge profondo in components.js):
   scrivi SOLO i campi che cambiano, il resto resta quello di config.js.
   Gli array (categorie, orari.testo, slot...) si sostituiscono INTERI.

   Nuove schede: generale con genera-link.html, che sputa il blocco già pronto.
   Regola dati: solo informazioni pubbliche e verificate del cliente. Mai
   inventare prezzi o recensioni — se un dato non c'è, si lascia il default.

   ATTENZIONE — questo file è PUBBLICO (GitHub Pages + repo pubblico): qui
   dentro solo dati che il cliente stesso pubblica già. Ricerca, pain e note
   di vendita vanno in note-outreach.md, che resta fuori dal repo.
   ============================================================================ */

window.CLIENTI = {

  /* ── YUMII NAIL — Trieste (San Giacomo) ─────────────────────────────── */
  "yumii-nail": {
    brand: {
      nome:         "Yumii Nail",
      claim:        "Unghie & epilazione a San Giacomo",
      tipo:         "Nail salon",
      citta:        "Trieste",
      provincia:    "TS",
      cap:          "34137",
      indirizzo:    "Via dell'Istria 4",
      quartiere:    "San Giacomo",
      anniAttivita: 2,
      pIva:         "",
    },

    contatti: {
      telDisplay: "+39 040 233 5967",
      telHref:    "+390402335967",
      whatsapp:   "393395719649",              // il secondo numero pubblico (mobile)
      email:      "",
      mapsQuery:  "Yumii Nail, Via dell'Istria 4, 34137 Trieste",
      instagram:  "yumii.nail_",
    },

    seo: { titleSuffix: "Nail Salon a Trieste", dominio: "", ogImage: "/assets/og-cover.jpg" },

    // Il template parla di viso, corpo e SPA: qui si parla di unghie.
    testi: {
      heroLead:  "Manicure, semipermanente e ricostruzione. Prenoti in trenta secondi, anche quando siamo chiuse.",
      introLead: "Unghie curate nel dettaglio, epilazione e pedicure: scegli il trattamento, l'orario che ti comoda e ricevi subito la conferma.",
      manifesto: "Le mani si notano prima di tutto il resto. Per questo non abbiamo fretta: ogni unghia esce come deve.",
    },

    // Ragione sociale e P.IVA non sono pubbliche: si lasciano vuote (il footer
    // le omette da solo) invece di inventarle.
    legal: { titolare: "Yumii Nail", pIva: "", annoInizio: 2024, emailPrivacy: "" },

    // Orario continuato lun–sab 9:00–20:00, domenica chiusa (dichiarato da loro).
    orari: {
      chiusoGiorni: [0],
      testo: [
        { g: "Lunedì — Sabato", o: "09:00 – 20:00 (orario continuato)" },
        { g: "Domenica",        o: "Chiuso" },
      ],
      slot: ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30",
             "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
             "17:00","17:30","18:00","18:30","19:00"],
    },

    // Nail salon: niente bronzo/SPA. Rosa cipria + nero grafite, più "nail bar".
    tema: {
      colori: {
        "rosa":        "#b0567a",
        "rosa-light":  "#fdeef3",
        "rosa-dark":   "#8d3f5f",
        "salvia":      "#c9aab4",
        "salvia-dark": "#2a2126",
        "crema":       "#ffffff",
        "crema-2":     "#fcf7f8",
        "sabbia":      "#efe2e7",
        "carbone":     "#1a1a1a",
        "grigio":      "#6f6169",
        "gold":        "#d9a8b8",
        "gold-dark":   "#8d3f5f",
      },
    },

    // Loro fanno unghie + epilazione (bio IG). Niente viso/corpo/massaggi.
    categorie: [
      {
        id: "unghie", nome: "Unghie", foto: "1607779097040-26e80aa78e66",
        descr: "Manicure, semipermanente e ricostruzione — cura del dettaglio e tenuta.",
        trattamenti: [
          { nome: "Manicure classica",           durata: 40, prezzo: 20, descr: "Cura delle cuticole, limatura e smalto a scelta." },
          { nome: "Semipermanente",              durata: 60, prezzo: 30, richiamo: 21, descr: "Smalto semipermanente ad alta tenuta, fino a 3 settimane." },
          { nome: "Ricostruzione unghie",        durata: 90, prezzo: 50, richiamo: 28, descr: "Ricostruzione in gel su misura, forma e lunghezza a scelta." },
          { nome: "Refill ricostruzione",        durata: 75, prezzo: 40, richiamo: 28, descr: "Mantenimento della ricostruzione esistente." },
          { nome: "Nail art",                    durata: 30, prezzo: 10, descr: "Decorazioni e disegni personalizzati sulle unghie." },
        ],
      },
      {
        id: "piedi", nome: "Piedi", foto: "1519014816548-bf5fe059798b",
        descr: "Pedicure estetica e semipermanente sui piedi.",
        trattamenti: [
          { nome: "Pedicure estetica",           durata: 50, prezzo: 30, richiamo: 35, descr: "Cura completa del piede con esfoliazione e smalto." },
          { nome: "Pedicure + semipermanente",   durata: 70, prezzo: 40, richiamo: 35, descr: "Pedicure completa con smalto semipermanente ad alta tenuta." },
        ],
      },
      {
        id: "epilazione", nome: "Ceretta", foto: "1598440947619-2c35fc9aa908",
        descr: "Epilazione con cera professionale e prodotti lenitivi.",
        trattamenti: [
          { nome: "Gambe complete",              durata: 40, prezzo: 25, richiamo: 28, descr: "Epilazione gambe intere con trattamento post-epilatorio." },
          { nome: "Mezza gamba",                 durata: 25, prezzo: 15, descr: "Epilazione metà gamba." },
          { nome: "Inguine + ascelle",           durata: 30, prezzo: 22, descr: "Zone sensibili con cera tiepida lenitiva." },
          { nome: "Sopracciglia / labbro",       durata: 20, prezzo: 10, descr: "Definizione sopracciglia e rifinitura labbro superiore." },
        ],
      },
    ],

    // I nomi del team non sono pubblici: una voce sola e neutra, niente nomi
    // inventati come quelli del template di default.
    team: [
      { nome: "Il team", ruolo: "Onicotecniche", esperienza: "", spec: "Unghie, semipermanente, ricostruzione",
        bio: "Manicure, ricostruzione ed epilazione in Via dell'Istria, a San Giacomo.",
        foto: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=70&w=400&h=400" },
    ],

    // ESEMPI da confermare col loro listino — non sono offerte reali di Yumii.
    pacchetti: [
      { nome: "5 semipermanenti",   prezzo: 130, vecchio: 150, durata: "5 appuntamenti", descr: "Cinque semipermanenti da usare quando vuoi, con il richiamo che ti ricorda quando tornare." },
      { nome: "Mani + piedi",       prezzo: 60,  vecchio: 70,  durata: "Unica seduta",   descr: "Semipermanente mani e pedicure con semipermanente nella stessa seduta." },
      { nome: "Buono Regalo",       prezzo: null, vecchio: null, durata: "Importo libero", descr: "Regala un trattamento: buono valido su unghie, piedi e ceretta." },
    ],

    // Dati veri e verificabili (scheda Google + orari dichiarati).
    numeri: [
      { valore: "5,0",  label: "Media recensioni Google" },
      { valore: "30",   label: "Recensioni, tutte a 5 stelle" },
      { valore: "11h",  label: "Aperte al giorno, orario continuato" },
      { valore: "6/7",  label: "Giorni su sette" },
    ],

    // Foto: solo id già usati e verificati nel template (niente id inventati,
    // che darebbero immagini rotte). Da sostituire con le loro foto Instagram.
    media: {
      hero:     "1607779097040-26e80aa78e66",
      chiSiamo: "1604654894610-df63bc536371",
      ambiente: ["1607779097040-26e80aa78e66","1604654894610-df63bc536371","1632345031435-8727f6897d53",
                 "1633681926022-84c23e8cb2d6","1612817288484-6f916006741a","1519014816548-bf5fe059798b",
                 "1556228578-8c89e6adf883","1600334089648-b0d9d3028eb2"],
    },

    // Facebook: l'URL /people/YuMii-Nail/ risponde 404 (agli URL /people/ serve
    // l'ID numerico). Vuoto finché non è verificato: il footer lo omette da solo,
    // meglio nessun link che un link rotto sul demo.
    social: {
      instagram: "https://instagram.com/yumii.nail_",
      facebook:  "",
      tiktok:    "",
    },

    // Le recensioni vere sono su Google ma il testo non è stato raccolto: qui
    // restano ESEMPI dichiarati, mai spacciati per recensioni di Yumii.
    recensioni: [
      { nome: "Esempio", voto: 5, testo: "Qui compariranno le vostre recensioni Google reali, aggiornate da sole.", fonte: "Esempio — non è una recensione reale" },
    ],
  },

  /* ── FOR ME BEAUTY CENTER — Volla (NA) ──────────────────────────────── */
  "for-me-beauty": {
    brand: {
      nome:         "For Me Beauty Center",
      // Il footer costruisce "<claim> a <città>": la città qui darebbe "a Volla a Volla".
      claim:        "Estetica avanzata & benessere",
      tipo:         "Centro estetico",
      citta:        "Volla",
      provincia:    "NA",
      cap:          "80040",
      indirizzo:    "Via San Giorgio 76",
      quartiere:    "Complesso Carpe Diem",
      anniAttivita: 0,
      pIva:         "",
    },

    contatti: {
      telDisplay: "",
      telHref:    "",
      whatsapp:   "",
      email:      "",
      mapsQuery:  "For Me Beauty Center, Via San Giorgio 76, 80040 Volla NA",
      instagram:  "formebeautycenter_volla",
    },

    seo: { titleSuffix: "Centro Estetico a Volla", dominio: "", ogImage: "/assets/og-cover.jpg" },

    // Il loro brand è teal petrolio + oro (logo "FM For Me Beauty" e tutta la
    // grafica dei post), non il bronzo/crema del template.
    tema: {
      colori: {
        "rosa":        "#1d5c5c",
        "rosa-light":  "#e8f1f0",
        "rosa-dark":   "#123f40",
        "salvia":      "#8fb3b0",
        "salvia-dark": "#12312f",
        "crema":       "#ffffff",
        "crema-2":     "#f6faf9",
        "sabbia":      "#e2eceb",
        "carbone":     "#102a2a",
        "grigio":      "#5f7573",
        "gold":        "#c9a227",
        "gold-dark":   "#9a7b18",

        // Tappe del gradiente dei titoli, DENTRO la famiglia teal (come yumii
        // le tiene nel rosa). Lasciandole al default il riflesso partiva da
        // questo oro e finiva su --rosa-dark: giallo → petrolio, cioè due
        // famiglie quasi complementari, ed è la cosa che stonava.
        // Contrasto su bianco: 4.8 / 7.7 / 11.6 — leggibile per tutta la parola.
        // L'oro non sparisce: resta sugli eyebrow, sulle spunte e sui bordi,
        // che è dove un oro sta bene.
        "grad-1":      "#2f7d7a",
        "grad-2":      "#1d5c5c",
        "grad-3":      "#123f40",
      },
    },

    // Bio IG: "Specialiste in estetica avanzata · Percorsi personalizzati".
    // Il centro vero sono i macchinari (Endospheres, radiofrequenza, laser),
    // non la manicure: il copy segue quello, non la vetrina Treatwell.
    testi: {
      heroTitle: `For Me <span class="italic">Beauty Center</span>`,
      heroLead:  "Specialiste in estetica avanzata: Endospheres, radiofrequenza, laser. Percorsi personalizzati, prenotabili anche quando siamo chiusi.",
      introLead: "Ogni percorso parte da una consulenza e da un'anamnesi accurata: scegli il trattamento, l'orario che ti comoda e ricevi subito la conferma.",
      manifesto: "Prima del trattamento viene l'ascolto. Capiamo di cosa hai bisogno davvero, poi costruiamo insieme il percorso giusto per te.",
    },

    // Ragione sociale e P.IVA non sono pubbliche: vuote, il footer le omette.
    legal: { titolare: "For Me Beauty Center", pIva: "", annoInizio: null, emailPrivacy: "" },

    // Orari dichiarati sulla loro pagina: lun–ven 09:30–19:00, sab 09:30–18:30.
    orari: {
      chiusoGiorni: [0],
      testo: [
        { g: "Lunedì — Venerdì", o: "09:30 – 19:00" },
        { g: "Sabato",           o: "09:30 – 18:30" },
        { g: "Domenica",         o: "Chiuso" },
      ],
      slot: ["09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00",
             "13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00",
             "17:30","18:00","18:30"],
    },

    // Trattamenti: quelli che pubblicano su Instagram (macchinari) + quelli in
    // vetrina Treatwell. Prezzi PIENI dichiarati su Treatwell, non le promo
    // (scrub 20€ da 30€, laser 100€ da 150€ sono sconti). I macchinari li
    // vendono solo a percorso → prezzo null = "su valutazione", non inventato.
    // Le durate non dichiarate sono stime — vedi note-outreach.md.
    categorie: [
      {
        id: "corpo-avanzato", nome: "Corpo — estetica avanzata", foto: "1600334089648-b0d9d3028eb2",
        descr: "Endospheres, radiofrequenza e pressoterapia su cellulite, ritenzione e rimodellamento.",
        trattamenti: [
          { nome: "Endospheres",                 durata: 45, prezzo: null, richiamo: 7,  descr: "Trattamento su cellulite e ritenzione, in percorso costruito dopo la consulenza." },
          { nome: "Radiofrequenza corpo",        durata: 45, prezzo: null, richiamo: 10, descr: "Rassodamento e tonificazione, in ciclo di sedute." },
          { nome: "Pressoterapia",               durata: 40, prezzo: null, richiamo: 7,  descr: "Drenaggio di gambe e caviglie, spesso abbinato agli Endospheres." },
          { nome: "Trattamento corpo modeling",  durata: 60, prezzo: null, richiamo: 10, descr: "Rimodellamento della silhouette in percorso personalizzato." },
          { nome: "Massaggio personalizzato",    durata: 50, prezzo: 30,   descr: "Massaggio su misura, scelto insieme in base alle tue esigenze." },
          { nome: "Scrub corpo",                 durata: 20, prezzo: 30,   descr: "Esfoliazione completa che prepara la pelle e la lascia liscia." },
        ],
      },
      {
        id: "viso", nome: "Viso", foto: "1570172619644-dfd03ed5d881",
        descr: "Pulizia del viso con tecnologia avanzata: Hydra Face e radiofrequenza.",
        trattamenti: [
          { nome: "Pulizia viso Hydra Face",     durata: 60, prezzo: null, richiamo: 30, descr: "Deterge in profondità con tecnologia avanzata: pelle più luminosa, tonica e rigenerata." },
          { nome: "Radiofrequenza viso",         durata: 45, prezzo: null, richiamo: 21, descr: "Tonificazione del viso, in ciclo di sedute." },
          { nome: "Laminazione ciglia",          durata: 60, prezzo: 40,   richiamo: 42, descr: "Ciglia curve e definite a lungo, senza extension." },
        ],
      },
      {
        id: "laser", nome: "Epilazione laser", foto: "1598440947619-2c35fc9aa908",
        descr: "Laser con sistema di raffreddamento integrato: più comfort, più protezione.",
        trattamenti: [
          { nome: "Epilazione laser total body", durata: 60, prezzo: 150, richiamo: 30, descr: "Epilazione laser su tutto il corpo, con valutazione preliminare della pelle." },
          { nome: "Epilazione laser zona",       durata: 30, prezzo: null, richiamo: 30, descr: "Singola zona a scelta, con sistema di raffreddamento integrato." },
        ],
      },
      {
        id: "mani-piedi", nome: "Mani & piedi", foto: "1519014816548-bf5fe059798b",
        descr: "Manicure e pedicure con prodotti professionali OPI.",
        trattamenti: [
          { nome: "Manicure",                    durata: 30, prezzo: 12, richiamo: 21, descr: "Cura delle cuticole, limatura e smalto a scelta." },
          { nome: "Pedicure",                    durata: 45, prezzo: 15, richiamo: 35, descr: "Cura completa del piede con rifinitura e smalto." },
        ],
      },
    ],

    // La titolare è pubblica (Rosalba Calcide), gli altri nomi no. Voce unica e
    // neutra: la foto del template non è lei, quindi non le si mette il nome sopra.
    // "Specialiste" al plurale come la loro bio: non lavora da sola.
    team: [
      { nome: "Le specialiste", ruolo: "Estetiste", esperienza: "", spec: "Estetica avanzata, laser, viso e corpo",
        bio: "Il centro è guidato da Rosalba Calcide: consulenza e anamnesi accurata prima di ogni percorso, con prodotti OPI, Dermatrophine, Mesoestetic e Keenwell.",
        foto: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=70&w=400&h=400" },
    ],

    // I loro pacchetti VERI, dal post in griglia su Instagram ("offerte limitate":
    // sono promo, non listino fisso — vanno riconfermate prima di mandare il link).
    pacchetti: [
      { nome: "5 Endospheres + 5 massaggi",   prezzo: 450, vecchio: 580, durata: "5 appuntamenti", descr: "Cinque Endospheres, cinque massaggi personalizzati e drenante da bere." },
      { nome: "5 Endospheres + 5 presso",     prezzo: 280, vecchio: 430, durata: "5 appuntamenti", descr: "Cinque Endospheres, cinque pressoterapie e drenante da bere." },
      { nome: "3 Corpo modeling",             prezzo: 250, vecchio: 420, durata: "3 appuntamenti", descr: "Tre trattamenti corpo modeling, tre massaggi personalizzati e tre pressoterapie." },
      { nome: "3 Radiofrequenza corpo",       prezzo: 200, vecchio: 270, durata: "3 appuntamenti", descr: "Tre sedute di radiofrequenza corpo con drenante da bere." },
      { nome: "Pulizia viso Hydra",           prezzo: 200, vecchio: 270, durata: "Percorso viso",  descr: "Pulizia viso Hydra con acido, due radiofrequenze e drenante antiossidante." },
    ],

    // Dati veri e verificabili (Treatwell 4,7 · 87 recensioni; IG 2.342 follower).
    numeri: [
      { valore: "4,7",  label: "Media recensioni" },
      { valore: "87",   label: "Recensioni dei clienti" },
      { valore: "6/7",  label: "Giorni su sette" },
      { valore: "3",    label: "Linee professionali usate" },
    ],

    // Foto: gli id del template, già verificati. Da sostituire con le loro.
    media: {
      hero:     "1519823551278-64ac92734fb1",
      chiSiamo: "1512290923902-8a9f81dc236c",
      ambiente: ["1519823551278-64ac92734fb1","1580618672591-eb180b1a973f","1512290923902-8a9f81dc236c",
                 "1519014816548-bf5fe059798b","1600334089648-b0d9d3028eb2","1556228578-8c89e6adf883",
                 "1542848284-8afa78a08ccb","1559599101-f09722fb4948"],
    },

    social: {
      instagram: "https://instagram.com/formebeautycenter_volla",
      facebook:  "",
      tiktok:    "",
    },

    // Le 87 recensioni vere stanno su Treatwell: il testo non è stato raccolto e
    // non si copia. Qui restano ESEMPI dichiarati.
    recensioni: [
      { nome: "Esempio", voto: 5, testo: "Qui compariranno le vostre recensioni Google reali, aggiornate da sole.", fonte: "Esempio — non è una recensione reale" },
    ],
  },

};
