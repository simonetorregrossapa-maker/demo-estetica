/* ============================================================================
   COMPONENTS.JS — Layer condiviso "chrome" per tutte le pagine
   Da config.js costruisce: variabili tema, <head> SEO/OG, JSON-LD, header,
   footer, cookie banner, FAB, reveal-on-scroll e la personalizzazione demo
   via parametri URL. Ogni pagina chiama SITEUI.mount({...}) nel suo script.
   ============================================================================ */
(function () {
  const S = window.SITE;
  if (!S) { console.error("config.js non caricato"); return; }

  /* ── Personalizzazione DEMO via URL (?nome=&citta=&tel=&indirizzo=...) ── */
  const qp = new URLSearchParams(location.search);
  const isDemo = qp.has("nome");
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

  /* ── Helper ──────────────────────────────────────────────────────── */
  const waLink = (msg) => `https://wa.me/${S.contatti.whatsapp}?text=${encodeURIComponent(msg || "Ciao! Vorrei informazioni / prenotare un trattamento.")}`;
  const telLink = "tel:" + S.contatti.telHref;
  // Costruisce l'URL di una foto (Unsplash id verificato, o percorso /assets locale)
  const photo = (id, w, h) => id && id.startsWith("/") ? id
    : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${w || 900}${h ? "&h=" + h : ""}`;

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
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "187" },
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
    const el = document.createElement("header"); el.className = "site";
    el.innerHTML = `<div class="nav-inner">
      <a class="logo" href="${base}index.html"><b>${S.brand.nome}</b><span class="logo-sub">${S.brand.citta}</span></a>
      <ul class="nav-links" id="navLinks">${links}
        <li><a class="nav-cta" href="${base}prenota.html">Prenota</a></li>
      </ul>
      <button class="burger" id="burger" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>`;
    document.body.prepend(el);
    const burger = el.querySelector("#burger"), nav = el.querySelector("#navLinks");
    burger.addEventListener("click", () => { burger.classList.toggle("open"); nav.classList.toggle("open"); });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { burger.classList.remove("open"); nav.classList.remove("open"); }));
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
        <p style="margin-top:1rem;font-size:.84rem">${S.social.instagram ? `<a href="${S.social.instagram}" target="_blank" rel="noopener">Instagram</a> · ` : ""}${S.social.facebook ? `<a href="${S.social.facebook}" target="_blank" rel="noopener">Facebook</a>` : ""}</p>
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
      <span>© ${new Date().getFullYear()} ${S.legal.titolare} · P.IVA ${S.legal.pIva}</span>
      <span><a href="${base}privacy.html">Privacy</a> · <a href="${base}cookie.html">Cookie</a> · <a href="${base}termini.html">Termini</a></span>
    </div>`;
    document.body.appendChild(f);
  }

  /* ── FAB + COOKIE + REVEAL ───────────────────────────────────────── */
  function extras(base) {
    base = base || "";
    const fab = document.createElement("a"); fab.className = "fab"; fab.href = base + "prenota.html"; fab.textContent = "Prenota"; document.body.appendChild(fab);

    if (localStorage.getItem("cookie_ok") == null) {
      const c = document.createElement("div"); c.id = "cookieBanner"; c.className = "show";
      c.innerHTML = `<p style="margin:0;flex:1;min-width:220px">Usiamo cookie tecnici e, previo consenso, di terze parti (mappa, recensioni). <a href="${base}cookie.html">Cookie Policy</a>.</p>
        <div class="cookie-btns"><button class="cookie-rej" onclick="localStorage.setItem('cookie_ok','no');this.closest('#cookieBanner').remove()">Solo necessari</button>
        <button class="cookie-acc" onclick="localStorage.setItem('cookie_ok','yes');this.closest('#cookieBanner').remove()">Accetta</button></div>`;
      document.body.appendChild(c);
    }

    const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }), { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));

    if (isDemo) {
      const b = document.createElement("div"); b.className = "demo-banner";
      b.textContent = `Demo personalizzata per ${S.brand.nome} — questo sito potrebbe essere tuo`;
      document.body.prepend(b);
    }
  }

  /* ── API pubblica ─────────────────────────────────────────────────── */
  window.SITEUI = {
    S, waLink, telLink, indirizzoFull, isDemo, photo, icon, stars,
    mount(page) {
      page = page || {};
      const base = page.base || "";
      head(page);
      jsonld(page.schema);
      document.addEventListener("DOMContentLoaded", () => {
        header(page.active, base);
        footer(base);
        if (page.onReady) page.onReady();   // pagine iniettano i loro .reveal qui…
        extras(base);                        // …poi l'observer li aggancia tutti
      });
    },
  };
})();
