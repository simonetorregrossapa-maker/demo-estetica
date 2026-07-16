/* ============================================================================
   COMPONENTS.JS — Layer condiviso "chrome" per tutte le pagine
   Da config.js costruisce: variabili tema, <head> SEO/OG, JSON-LD, header,
   footer, cookie banner, FAB, reveal-on-scroll e la personalizzazione demo
   via parametri URL. Ogni pagina chiama SITEUI.mount({...}) nel suo script.
   ============================================================================ */
(function () {
  const S = window.SITE;
  if (!S) { console.error("config.js non caricato"); return; }

  /* ── MOTORE ANIMAZIONI: GSAP + ScrollTrigger + Lenis (CDN) ──────────
     Caricato qui (in <head>) così è pronto prima delle animazioni.
     Degrada con eleganza: se le CDN sono bloccate o l'utente preferisce
     meno movimento, i contenuti restano visibili senza animazioni.        */
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOTION_CDN = {
    gsap: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js",
    st:   "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js",
    lenis:"https://unpkg.com/lenis@1.1.14/dist/lenis.min.js",
  };
  const loadScript = (src) => new Promise((ok, no) => {
    const s = document.createElement("script"); s.src = src; s.async = false;
    s.onload = ok; s.onerror = no; document.head.appendChild(s);
  });
  // Pre-nascondi (solo se animeremo) per evitare il flash prima dell'entrata.
  if (!REDUCED) document.documentElement.classList.add("gsap-on");
  // Avvia subito i download; ScrollTrigger dopo GSAP, Lenis in parallelo.
  const motionReady = REDUCED ? Promise.reject(new Error("reduced-motion")) :
    loadScript(MOTION_CDN.gsap).then(() => Promise.all([loadScript(MOTION_CDN.st), loadScript(MOTION_CDN.lenis)]));

  /* ── Personalizzazione DEMO via URL (?nome=&citta=&tel=&indirizzo=...) ── */
  const qp = new URLSearchParams(location.search);

  /* Scheda cliente completa (?c=slug → clienti.js): sovrascrive config.js in
     profondità. Oggetti fusi ricorsivamente, array e valori sostituiti interi
     (così `categorie` diventa quella del cliente, non un ibrido col default).
     Gira PRIMA degli override singoli qui sotto, che restano l'ultima parola. */
  (function scheda() {
    const slug = qp.get("c");
    if (!slug) return;
    const dati = (window.CLIENTI || {})[slug];
    if (!dati) { console.warn("Scheda cliente non trovata:", slug); return; }
    (function fondi(dest, src) {
      Object.entries(src).forEach(([k, v]) => {
        const merge = v && typeof v === "object" && !Array.isArray(v) &&
                      dest[k] && typeof dest[k] === "object" && !Array.isArray(dest[k]);
        if (merge) fondi(dest[k], v); else dest[k] = v;
      });
    })(S, dati);
  })();

  const isDemo = qp.has("nome") || qp.has("c");
  if (qp.get("nome"))       S.brand.nome = qp.get("nome");
  if (qp.get("citta"))      S.brand.citta = qp.get("citta");
  if (qp.get("indirizzo"))  S.brand.indirizzo = qp.get("indirizzo");
  if (qp.get("quartiere"))  S.brand.quartiere = qp.get("quartiere");
  if (qp.get("cap"))        S.brand.cap = qp.get("cap");
  if (qp.get("tel"))      { S.contatti.telDisplay = "+39 " + qp.get("tel"); S.contatti.telHref = "+39" + qp.get("tel").replace(/\s/g, ""); }
  if (qp.get("wa"))         S.contatti.whatsapp = qp.get("wa");

  /* ── Iniezione variabili tema come CSS custom properties ──────────── */
  const root = document.documentElement.style;
  Object.entries(S.tema.colori).forEach(([k, v]) => root.setProperty("--" + k, v));
  root.setProperty("--font-titoli", S.tema.fontTitoli);
  root.setProperty("--font-testo", S.tema.fontTesto);

  /* ── LOADER elegante (preloader con logo) — solo una volta per sessione ── */
  (function loader() {
    try { if (sessionStorage.getItem("ts_loaded")) return; sessionStorage.setItem("ts_loaded", "1"); } catch (e) {}
    const gold = S.tema.colori.gold || "#c9a36a", goldD = S.tema.colori["gold-dark"] || "#8c6a3f";
    const el = document.createElement("div");
    el.id = "loader"; el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      `<div class="loader-inner">
        <svg class="loader-mark" viewBox="0 0 100 100" aria-hidden="true">
          <defs><linearGradient id="lmg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${gold}"/><stop offset="1" stop-color="${goldD}"/>
          </linearGradient></defs>
          <circle class="lm-ring" cx="50" cy="50" r="40"/>
          <path class="lm-leaf" d="M50 84 C30 64 30 34 50 14 C70 34 70 64 50 84 Z"/>
          <path class="lm-stem" d="M50 84 V40"/>
          <path class="lm-vein" d="M50 58 C45 53 41 48 39 42 M50 58 C55 53 59 48 61 42"/>
        </svg>
        <div class="loader-word">${(S.brand.nome || "").toUpperCase()}</div>
        <div class="loader-sub">${(S.brand.citta || "").toUpperCase()}</div>
      </div>`;
    (document.body || document.documentElement).appendChild(el);
    // Rimozione dal DOM dopo l'uscita (la sparizione è comunque garantita via CSS).
    setTimeout(() => el.remove(), 3600);
  })();

  /* ── Helper ──────────────────────────────────────────────────────── */
  const waLink = (msg) => `https://wa.me/${S.contatti.whatsapp}?text=${encodeURIComponent(msg || "Ciao! Vorrei informazioni / prenotare un trattamento.")}`;
  const telLink = "tel:" + S.contatti.telHref;
  // Costruisce l'URL di una foto (Unsplash id verificato, o percorso /assets locale)
  const photo = (id, w, h) => id && id.startsWith("/") ? id
    : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${w || 900}${h ? "&h=" + h : ""}`;

  // Prezzo: non tutti i trattamenti ne hanno uno pubblico (i macchinari si
  // vendono a percorso, dopo consulenza). Senza guardia usciva "null€".
  const prezzo = (v) => typeof v === "number" ? `${v}€` : "su valutazione";

  // Icone SVG line (stroke 1.5, set coerente — niente emoji)
  const ICON_PATHS = {
    shield: '<path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    award:  '<circle cx="12" cy="8" r="5"/><path d="M9 12.5L7.5 21 12 18l4.5 3-1.5-8.5"/>',
    leaf:   '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16z"/><path d="M9 16c3-3 5-5 8-6"/>',
    chat:   '<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"/>',
    heart:  '<path d="M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z"/>',
    sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check:  '<path d="M20 6L9 17l-5-5"/>',
    pin:    '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    phone:  '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L21 13l1 4v0a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 1-2z"/>',
    clock2: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const icon = (name, cls) => `<svg class="${cls || "ico"}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.sparkle}</svg>`;
  // Stelle piene per le valutazioni (SVG, colore via currentColor)
  const stars = (n) => `<span class="stars-row" role="img" aria-label="${n} stelle su 5">${Array.from({length:5},(_,i)=>`<svg viewBox="0 0 24 24" width="15" height="15" fill="${i<n?'currentColor':'none'}" stroke="currentColor" stroke-width="1.3"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.9 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>`).join("")}</span>`;
  const indirizzoFull = `${S.brand.indirizzo}, ${S.brand.cap} ${S.brand.citta} (${S.brand.provincia})`;

  /* ── SEO / <head> ─────────────────────────────────────────────────── */
  function head(page) {
    const title = page.title ? `${page.title} — ${S.brand.nome}` : `${S.brand.nome} — ${S.seo.titleSuffix}`;
    const desc = page.description || `${S.brand.nome}, ${S.brand.claim.toLowerCase()} a ${S.brand.citta}. Trattamenti viso e corpo, massaggi, epilazione. Prenota online in 30 secondi.`;
    const url = S.seo.dominio + location.pathname;
    document.title = title;
    document.documentElement.lang = "it";
    const meta = (name, content) => { const m = document.createElement("meta"); m.name = name; m.content = content; document.head.appendChild(m); };
    const prop = (p, content) => { const m = document.createElement("meta"); m.setAttribute("property", p); m.content = content; document.head.appendChild(m); };
    meta("description", desc);
    meta("theme-color", S.tema.colori.rosa);
    const link = document.createElement("link"); link.rel = "canonical"; link.href = url; document.head.appendChild(link);
    prop("og:type", "website"); prop("og:title", title); prop("og:description", desc); prop("og:url", url); prop("og:locale", "it_IT"); prop("og:site_name", S.brand.nome); prop("og:image", S.seo.dominio + S.seo.ogImage);
    meta("twitter:card", "summary_large_image"); meta("twitter:title", title); meta("twitter:description", desc);
    // favicon emoji
    const ini = (S.brand.nome.trim()[0] || "B").toUpperCase();
    const fav = document.createElement("link"); fav.rel = "icon"; fav.href = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='${S.tema.colori.rosa}'/><text x='50' y='72' font-size='62' font-family='Georgia,serif' fill='white' text-anchor='middle'>${ini}</text></svg>`); document.head.appendChild(fav);
  }

  /* ── JSON-LD strutturato ──────────────────────────────────────────── */
  function jsonld(extra) {
    const biz = {
      "@context": "https://schema.org", "@type": "BeautySalon",
      name: S.brand.nome, image: S.seo.dominio + S.seo.ogImage,
      "@id": S.seo.dominio, url: S.seo.dominio,
      telephone: S.contatti.telDisplay, priceRange: "€€",
      address: { "@type": "PostalAddress", streetAddress: S.brand.indirizzo, addressLocality: S.brand.citta, postalCode: S.brand.cap, addressRegion: S.brand.provincia, addressCountry: "IT" },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "19:30" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "18:00" },
      ],
      sameAs: [S.social.instagram, S.social.facebook].filter(Boolean),
    };
    const blocks = [biz].concat(extra || []);
    const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(blocks.length === 1 ? blocks[0] : blocks); document.head.appendChild(s);
  }

  /* ── HEADER ───────────────────────────────────────────────────────── */
  const NAV = [
    ["index.html", "Home"], ["trattamenti.html", "Trattamenti"], ["pacchetti.html", "Pacchetti"],
    ["chi-siamo.html", "Il Centro"], ["galleria.html", "Galleria"], ["blog/index.html", "Blog"],
    ["recensioni.html", "Recensioni"], ["contatti.html", "Contatti"],
  ];
  function header(active, base) {
    base = base || "";
    const links = NAV.map(([href, lbl]) => {
      const cls = active === href ? "active" : "";
      return `<li><a href="${base + href}" class="${cls}">${lbl}</a></li>`;
    }).join("");
    const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.contatti.mapsQuery || indirizzoFull)}`;
    const el = document.createElement("header"); el.className = "site";
    el.innerHTML = `<div class="topbar">
      <div class="topbar-inner">
        <span class="tb-left">${icon("pin","ico-sm")} ${S.brand.indirizzo}, ${S.brand.citta}</span>
        <div class="tb-right">
          <a href="${telLink}">${icon("phone","ico-sm")} ${S.contatti.telDisplay}</a>
          <a href="${waLink()}" target="_blank" rel="noopener">${icon("chat","ico-sm")} WhatsApp</a>
          <a href="${mapsHref}" target="_blank" rel="noopener">${icon("pin","ico-sm")} Mappa</a>
        </div>
      </div>
    </div>
    <div class="nav-inner">
      <a class="logo" href="${base}index.html"><b>${S.brand.nome}</b><span class="logo-sub">${S.brand.citta}</span></a>
      <ul class="nav-links" id="navLinks">${links}
        <li><a class="nav-cta" href="${base}prenota.html">Prenota</a></li>
      </ul>
      <button class="burger" id="burger" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>`;
    document.body.prepend(el);
    const burger = el.querySelector("#burger"), nav = el.querySelector("#navLinks");
    const scrim = document.createElement("div"); scrim.className = "nav-scrim"; el.appendChild(scrim);
    const setMenu = (open) => {
      burger.classList.toggle("open", open);
      nav.classList.toggle("open", open);
      scrim.classList.toggle("open", open);
      document.body.classList.toggle("nav-open", open);
    };
    burger.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
    scrim.addEventListener("click", () => setMenu(false));
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  /* ── FOOTER ───────────────────────────────────────────────────────── */
  function footer(base) {
    base = base || "";
    const f = document.createElement("footer"); f.className = "site";
    const orari = S.orari.testo.map(r => `<li><span style="opacity:.7">${r.g}</span> · ${r.o}</li>`).join("");
    f.innerHTML = `<div class="foot-grid">
      <div>
        <div class="foot-logo">${S.brand.nome}</div>
        <p style="opacity:.8;max-width:34ch;font-size:.9rem">${S.brand.claim} a ${S.brand.citta}. Bellezza, cura e benessere con prodotti professionali e mani esperte.</p>
        <p style="margin-top:1rem;font-size:.84rem">${
          [["Instagram", S.social.instagram], ["Facebook", S.social.facebook], ["TikTok", S.social.tiktok]]
            .filter(([, url]) => url)
            .map(([nome, url]) => `<a href="${url}" target="_blank" rel="noopener">${nome}</a>`)
            .join(" · ")
        }</p>
      </div>
      <div><h4>Esplora</h4><ul>
        <li><a href="${base}trattamenti.html">Trattamenti</a></li>
        <li><a href="${base}pacchetti.html">Pacchetti & Regali</a></li>
        <li><a href="${base}chi-siamo.html">Il Centro</a></li>
        <li><a href="${base}blog/index.html">Consigli di bellezza</a></li>
        <li><a href="${base}faq.html">Domande frequenti</a></li>
      </ul></div>
      <div><h4>Contatti</h4><ul>
        <li><a href="${telLink}">${S.contatti.telDisplay}</a></li>
        <li><a href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a></li>
        <li><a href="mailto:${S.contatti.email}">${S.contatti.email}</a></li>
        <li style="opacity:.8">${indirizzoFull}</li>
      </ul></div>
      <div><h4>Orari</h4><ul style="font-size:.84rem">${orari}</ul></div>
    </div>
    <div class="foot-bottom">
      <span>© ${new Date().getFullYear()} ${S.legal.titolare}${S.legal.pIva ? " · P.IVA " + S.legal.pIva : ""}</span>
      <span><a href="${base}privacy.html">Privacy</a> · <a href="${base}cookie.html">Cookie</a> · <a href="${base}termini.html">Termini</a></span>
    </div>`;
    document.body.appendChild(f);
    // Accesso nascosto all'area gestione: 5 click rapidi (entro 2.5s) sul copyright.
    const secret = f.querySelector(".foot-bottom span");
    if (secret) {
      let n = 0, t0 = 0;
      secret.addEventListener("click", () => {
        const now = Date.now(); n = (now - t0 < 2500) ? n + 1 : 1; t0 = now;
        if (n >= 5) { n = 0; location.href = base + "gestione.html"; }
      });
    }
  }

  /* ── FAB + COOKIE + REVEAL ───────────────────────────────────────── */
  function extras(base, page) {
    base = base || "";
    if (!(page && page.hideFab)) {
      const fab = document.createElement("a"); fab.className = "fab"; fab.href = base + "prenota.html";
      fab.setAttribute("aria-label", "Prenota ora il tuo trattamento");
      fab.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg> Prenota ora`;
      document.body.appendChild(fab);
    }

    if (localStorage.getItem("cookie_ok") == null) {
      const c = document.createElement("div"); c.id = "cookieBanner"; c.className = "show";
      c.innerHTML = `<p style="margin:0;flex:1;min-width:220px">Usiamo cookie tecnici e, previo consenso, di terze parti (mappa, recensioni). <a href="${base}cookie.html">Cookie Policy</a>.</p>
        <div class="cookie-btns"><button class="cookie-rej" onclick="localStorage.setItem('cookie_ok','no');this.closest('#cookieBanner').remove()">Solo necessari</button>
        <button class="cookie-acc" onclick="localStorage.setItem('cookie_ok','yes');this.closest('#cookieBanner').remove()">Accetta</button></div>`;
      document.body.appendChild(c);
    }

    if (isDemo) {
      const b = document.createElement("div"); b.className = "demo-banner";
      b.textContent = `Demo personalizzata per ${S.brand.nome} — questo sito potrebbe essere tuo`;
      document.body.prepend(b);
    }
  }

  /* ── MOTION: orchestrazione reveal + animazioni GSAP ──────────────── */
  function revealNow() {
    document.documentElement.classList.remove("gsap-on");
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
  }

  function setupAnimations() {
    const g = window.gsap;
    if (!g) return revealNow();
    const ST = window.ScrollTrigger;
    if (ST) g.registerPlugin(ST);

    // Smooth scroll premium (Lenis) — disattivo su touch coarse per non rompere lo scroll nativo
    const coarse = window.matchMedia("(pointer:coarse)").matches;
    if (window.Lenis && ST && !coarse) {
      const lenis = new window.Lenis({ duration: 1.05, wheelMultiplier: 0.9, smoothWheel: true });
      lenis.on("scroll", ST.update);
      g.ticker.add((t) => lenis.raf(t * 1000));
      g.ticker.lagSmoothing(0);
      window.__lenis = lenis;
    }

    // Soft easing coerente (niente rimbalzi: la skill sconsiglia "harsh animations")
    const EASE = "power3.out";

    // Reveal on scroll: stagger di gruppo (~60ms), ingressi morbidi
    g.set(".reveal", { opacity: 0, y: 38 });
    if (ST && ST.batch) {
      ST.batch(".reveal", {
        start: "top 86%",
        onEnter: (els) => g.to(els, { opacity: 1, y: 0, duration: 0.7, ease: EASE, stagger: 0.06, overwrite: true }),
      });
    } else {
      g.utils.toArray(".reveal").forEach((el) =>
        g.to(el, { opacity: 1, y: 0, duration: 0.7, ease: EASE, scrollTrigger: { trigger: el, start: "top 86%" } }));
    }

    // HERO: entrata a cascata + svelamento immagine (clip-path) + Ken Burns
    // NB: uso .fromTo con stato finale ESPLICITO perché il CSS .gsap-on pre-nasconde
    // l'hero (opacity:0) — un semplice .from animerebbe da invisibile a invisibile.
    if (document.querySelector(".hero")) {
      const tl = g.timeline({ defaults: { ease: EASE } });
      const inUp = (sel, y, d, pos) => tl.fromTo(sel, { y: y, opacity: 0 }, { y: 0, opacity: 1, duration: d }, pos);
      inUp(".hero .eyebrow", 16, 0.6)
      inUp(".hero h1", 30, 0.85, "-=0.30");
      inUp(".hero .lead", 22, 0.7, "-=0.50");
      inUp(".hero-cta", 18, 0.6, "-=0.45");
      inUp(".hero-micro", 14, 0.55, "-=0.45");
      tl.fromTo(".hero-media", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.05, ease: "power4.out" }, "-=0.95");
      inUp(".hero-badge", 16, 0.55, "-=0.30");

      if (ST) {
        const scrub = (trigger) => ({ trigger, start: "top top", end: "bottom top", scrub: true });
        g.to(".hero-blob.a", { yPercent: 28, ease: "none", scrollTrigger: scrub(".hero") });
        g.to(".hero-blob.b", { yPercent: -18, ease: "none", scrollTrigger: scrub(".hero") });
        g.fromTo(".hero-media img", { scale: 1.0 }, { scale: 1.12, ease: "none", scrollTrigger: scrub(".hero") });
      }
    }

    // Contatori numerici (solo interi; i decimali tipo "4,9" restano statici)
    if (ST) {
      g.utils.toArray(".stat .v").forEach((el) => {
        const m = el.textContent.trim().match(/^([^\d]*)([\d.]+)([^\d]*)$/);
        if (!m) return;
        const target = parseInt(m[2].replace(/\./g, ""), 10);
        if (isNaN(target) || target <= 0) return;
        const grp = m[2].includes("."), pre = m[1], suf = m[3], o = { n: 0 };
        ST.create({
          trigger: el, start: "top 90%", once: true,
          onEnter: () => g.to(o, {
            n: target, duration: 1.5, ease: "power2.out",
            onUpdate: () => { el.textContent = pre + (grp ? Math.round(o.n).toLocaleString("it-IT") : Math.round(o.n)) + suf; },
          }),
        });
      });
    }

    // Header compatto allo scroll (micro-interazione)
    const hdr = document.querySelector("header.site");
    if (hdr) {
      const onScroll = () => hdr.classList.toggle("scrolled", (window.scrollY || document.documentElement.scrollTop) > 40);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    if (ST) window.addEventListener("load", () => ST.refresh());
  }

  /* ── Effetto 3D: tilt al puntatore sulle card .tilt (indipendente da GSAP) ── */
  function initTilt() {
    if (REDUCED) return;
    if (window.matchMedia("(pointer:coarse)").matches) return; // solo mouse/trackpad
    document.querySelectorAll(".tilt").forEach((card) => {
      const MAX = 10;
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateY(${dx * MAX}deg) rotateX(${-dy * MAX}deg) translateY(-8px) scale(1.02)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  function initMotion() {
    // Rende rivelabili anche i blocchi titolo centrati (non marcati .reveal in HTML)
    document.querySelectorAll(".container > .center, section.center").forEach((el) => el.classList.add("reveal"));
    if (REDUCED) return revealNow();
    let settled = false;
    const fallback = setTimeout(() => { if (!settled) { settled = true; revealNow(); } }, 2500);
    motionReady
      .then(() => {
        if (settled) return;
        clearTimeout(fallback);
        try { setupAnimations(); settled = true; }
        catch (e) { console.error("animazioni:", e); settled = true; revealNow(); }
      })
      .catch(() => { if (settled) return; settled = true; clearTimeout(fallback); revealNow(); });
  }

  /* Propaga i parametri demo (?c=slug e gli override singoli) su TUTTI i link
     interni. Senza questo, il prospect che clicca "Prenota" o cambia pagina
     esce dalla sua scheda e si ritrova il template di default: il demo si
     smonta da solo alla prima navigazione. Gira dopo il render, così prende
     anche i link generati dalle pagine (card, "Prenota" dei trattamenti…). */
  const PARAM_DEMO = ["c", "nome", "citta", "indirizzo", "quartiere", "cap", "tel", "wa"];
  function propagaDemo() {
    const attivi = PARAM_DEMO.filter(k => qp.has(k));
    if (!attivi.length) return;
    document.querySelectorAll("a[href]").forEach(a => {
      const href = a.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return;
      // Si lavora sulla stringa, non su new URL(): quello normalizza in path
      // assoluto ("../index.html" → "/index.html") e su GitHub Pages, dove il
      // sito sta in un sottopercorso, ogni link finirebbe 404.
      const [senzaHash, hash] = href.split("#");
      const [path, query] = senzaHash.split("?");
      const params = new URLSearchParams(query || "");
      // I parametri già sul link vincono (es. ?trattamento=…).
      attivi.forEach(k => { if (!params.has(k)) params.set(k, qp.get(k)); });
      a.setAttribute("href", path + "?" + params.toString() + (hash ? "#" + hash : ""));
    });
  }

  /* ── API pubblica ─────────────────────────────────────────────────── */
  window.SITEUI = {
    S, waLink, telLink, indirizzoFull, isDemo, photo, icon, stars, prezzo,
    mount(page) {
      page = page || {};
      const base = page.base || "";
      head(page);
      jsonld(page.schema);
      document.addEventListener("DOMContentLoaded", () => {
        header(page.active, base);
        footer(base);
        if (page.onReady) page.onReady();   // pagine iniettano i loro .reveal qui…
        extras(base, page);                  // FAB, cookie, banner demo
        propagaDemo();                       // …poi ?c= finisce su ogni link interno
        initMotion();                        // …poi GSAP rivela e anima tutto
        initTilt();                          // effetto 3D sulle card (indip. da GSAP)
      });
    },
  };
})();
