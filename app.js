/* ============================================================================
   APP.JS — Logica prenotazione + recensioni (riusa l'architettura barbieri)
   Stack: Supabase (Postgres+Auth+Realtime) · EmailJS · Web3Forms.
   Degrada in modo elegante: senza Supabase configurato la demo resta
   pienamente navigabile (slot mostrati lato client, niente persistenza).
   ============================================================================ */
(function () {
  const S = window.SITE;
  const I = S.integrazioni;
  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const WD = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const hasSupabase = I.supabaseUrl && I.supabaseUrl !== "YOUR_SUPABASE_URL";

  /* ── Supabase ─────────────────────────────────────────────────────── */
  let _sb = null;
  function initSupabase() {
    if (_sb || !hasSupabase || !window.supabase) return;
    try { _sb = window.supabase.createClient(I.supabaseUrl, I.supabaseAnon); } catch (e) { }
  }
  function initEmailJS() {
    if (window.emailjs && I.emailjsKey && I.emailjsKey !== "YOUR_EMAILJS_PUBLIC_KEY")
      emailjs.init({ publicKey: I.emailjsKey });
  }

  /* ── Helper toast ─────────────────────────────────────────────────── */
  // toast(text, type) — type: 'ok' | 'warn' | 'err'. Niente emoji: pallino colorato.
  function toast(text, type) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
    t.innerHTML = `<span class="toast-dot ${"toast-" + (type || "ok")}"></span><span>${text}</span>`;
    t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 4500);
  }

  /* ════════════════════════════════════════════════════════════════════
     MODULO PRENOTAZIONE
     ════════════════════════════════════════════════════════════════════ */
  const Booking = {
    service: null, op: S.team[0].nome, date: null, time: null, calM: 0, calY: 0,
    lastId: null, lastToken: null, _rt: null, _bl: null,

    flatTreatments() {
      return S.categorie.flatMap(c => c.trattamenti.map(t => ({ ...t, cat: c.nome })));
    },

    init() {
      initSupabase(); initEmailJS();
      const now = new Date(); this.calM = now.getMonth() + 1; this.calY = now.getFullYear();
      // preselezione da URL ?trattamento= (link dai trattamenti)
      const want = new URLSearchParams(location.search).get("trattamento");
      const list = this.flatTreatments();
      this.service = (want && list.find(t => t.nome === want)) || list[0];
      this.renderServices(); this.renderOps(); this.buildCal(); this.refreshSummary();
      // Le CDN Supabase/EmailJS caricano in async: ritenta quando sono pronte
      window.addEventListener("load", () => {
        if (!_sb) { initSupabase(); initEmailJS(); if (_sb && this.date) this.loadAvailability(); }
      });
    },

    renderServices() {
      const box = document.getElementById("svcSelect"); if (!box) return;
      box.innerHTML = S.categorie.map(c => `
        <optgroup label="${c.nome}">
          ${c.trattamenti.map(t => `<option value="${t.nome}" ${this.service.nome === t.nome ? "selected" : ""}>${t.nome} · ${t.durata}′ · ${SITEUI.prezzo(t.prezzo)}</option>`).join("")}
        </optgroup>`).join("");
      box.onchange = () => { this.service = this.flatTreatments().find(t => t.nome === box.value); this.refreshSummary(); };
    },

    renderOps() {
      const box = document.getElementById("opSelect"); if (!box) return;
      box.innerHTML = S.team.map(m => `
        <button type="button" class="op-btn ${this.op === m.nome ? "sel" : ""}" data-op="${m.nome}">
          <div class="av">${m.nome[0]}</div><div class="nm">${m.nome}</div><div class="rl">${m.spec}</div>
        </button>`).join("");
      box.querySelectorAll(".op-btn").forEach(b => b.onclick = () => {
        box.querySelectorAll(".op-btn").forEach(x => x.classList.remove("sel"));
        b.classList.add("sel"); this.op = b.dataset.op;
        if (this.date) this.loadAvailability();
      });
    },

    buildCal() {
      const grid = document.getElementById("calGrid"); if (!grid) return;
      document.getElementById("calLabel").textContent = MESI[this.calM - 1] + " " + this.calY;
      grid.innerHTML = "";
      const first = new Date(this.calY, this.calM - 1, 1).getDay();
      const off = first === 0 ? 6 : first - 1;
      const days = new Date(this.calY, this.calM, 0).getDate();
      const td = new Date(); const tY = td.getFullYear(), tM = td.getMonth(), tD = td.getDate();
      for (let i = 0; i < off; i++) { const e = document.createElement("button"); e.className = "cal-day empty dis"; e.disabled = true; grid.appendChild(e); }
      for (let d = 1; d <= days; d++) {
        const btn = document.createElement("button"); btn.className = "cal-day"; btn.textContent = d;
        const dow = new Date(this.calY, this.calM - 1, d).getDay();
        const past = (this.calY < tY) || (this.calY === tY && this.calM - 1 < tM) || (this.calY === tY && this.calM - 1 === tM && d < tD);
        if (S.orari.chiusoGiorni.includes(dow) || past) { btn.classList.add("dis"); btn.disabled = true; }
        else {
          const ds = `${this.calY}-${String(this.calM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (this.calY === tY && this.calM - 1 === tM && d === tD) btn.classList.add("today");
          if (this.date === ds) btn.classList.add("sel");
          btn.onclick = () => this.selectDay(ds);
        }
        grid.appendChild(btn);
      }
    },
    changeMonth(delta) {
      let m = this.calM + delta, y = this.calY;
      if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
      const now = new Date();
      if (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) return;
      this.calM = m; this.calY = y; this.date = null; this.time = null;
      this.buildCal(); document.getElementById("timeGrid").innerHTML = `<p class="hint">Seleziona una data per vedere gli orari</p>`;
      this.refreshSummary();
    },
    selectDay(ds) {
      document.querySelectorAll(".cal-day").forEach(b => b.classList.remove("sel"));
      this.date = ds; this.time = null; this.buildCal(); this.loadAvailability(); this.refreshSummary();
    },

    async loadAvailability() {
      const grid = document.getElementById("timeGrid"); if (!grid) return;
      const render = (booked) => {
        grid.innerHTML = "";
        const now = new Date();
        const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const isToday = this.date === todayISO, nowMin = now.getHours() * 60 + now.getMinutes();
        let liberi = 0;
        S.orari.slot.forEach(t => {
          const b = document.createElement("button"); b.type = "button"; b.className = "time-btn"; b.textContent = t;
          const [h, mi] = t.split(":").map(Number);
          const past = isToday && (h * 60 + mi) <= nowMin;
          if (booked.includes(t) || past) { b.classList.add("booked"); b.disabled = true; }
          else { liberi++; if (this.time === t) b.classList.add("sel"); b.onclick = () => { grid.querySelectorAll(".time-btn").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); this.time = t; this.refreshSummary(); }; }
          grid.appendChild(b);
        });
        // Giorno pieno: proponi la lista d'attesa (momento di massimo intento).
        if (liberi === 0 && ((S.automazioni && S.automazioni.listaAttesa.attivo) !== false)) {
          const cta = document.createElement("div");
          cta.style.cssText = "grid-column:1/-1;margin-top:.6rem;padding:.9rem;background:var(--crema-2);border:1px solid var(--sabbia);border-radius:8px;text-align:center";
          cta.innerHTML = `<p class="muted small" style="margin:0 0 .6rem">Nessun posto libero questo giorno.</p><button type="button" class="btn btn-outline" id="wlOpen" style="justify-content:center">Avvisami se si libera un posto</button>`;
          grid.appendChild(cta);
          cta.querySelector("#wlOpen").onclick = () => Waitlist.open({ data: this.date, operatrice: this.op, servizio: this.service.nome });
        }
      };
      if (!_sb) { render([]); return; }
      grid.innerHTML = `<p class="hint">Caricamento disponibilità…</p>`;
      try {
        // Legge la VISTA `disponibilita` (solo data/orario/operatrice/stato): nessun
        // dato personale esposto al pubblico. La doppia prenotazione è impedita a DB
        // dall'indice unico; ricontrolliamo la disponibilità a ogni scelta di giorno/orario.
        const [pre, blo] = await Promise.all([
          _sb.from("disponibilita").select("orario").eq("data", this.date).eq("operatrice", this.op),
          _sb.from("blocchi").select("orario").eq("data", this.date).eq("operatrice", this.op),
        ]);
        const blocked = (blo.data || []).flatMap(r => r.orario === "GIORNO" ? S.orari.slot : [r.orario]);
        render([...(pre.data || []).map(r => r.orario), ...blocked]);
      } catch (e) { render([]); }
    },

    refreshSummary() {
      const s = document.getElementById("bookSummary"); if (!s) return;
      // Niente acconto sui trattamenti senza prezzo pubblico: si calcolerebbe su null → "0€".
      const acc = S.acconto.attivo && typeof this.service.prezzo === "number"
        ? `<div class="bsum-row"><span class="k">Acconto richiesto</span><span>${Math.round(this.service.prezzo * S.acconto.percentuale / 100)}€</span></div>` : "";
      s.innerHTML = `
        <div class="bsum-row"><span class="k">Trattamento</span><span>${this.service.nome}</span></div>
        <div class="bsum-row"><span class="k">Durata</span><span>${this.service.durata} min</span></div>
        <div class="bsum-row"><span class="k">Operatrice</span><span>${this.op}</span></div>
        <div class="bsum-row"><span class="k">Data</span><span>${this.date ? this.fmt(this.date) : "—"}</span></div>
        <div class="bsum-row"><span class="k">Orario</span><span>${this.time || "—"}</span></div>
        <div class="bsum-row"><span class="k">Prezzo</span><span class="price">${SITEUI.prezzo(this.service.prezzo)}</span></div>${acc}`;
    },
    fmt(iso) { const [y, m, d] = iso.split("-").map(Number); return `${WD[new Date(y, m - 1, d).getDay()]} ${d} ${MESI[m - 1].toLowerCase()} ${y}`; },

    async submit() {
      const g = id => (document.getElementById(id)?.value || "").trim();
      const name = g("bName"), email = g("bEmail"), phone = g("bPhone"), notes = g("bNotes");
      const consent = document.getElementById("bConsent")?.checked;
      if (!name) return toast("Inserisci il tuo nome", "warn");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Email non valida", "warn");
      if (!this.date) return toast("Seleziona una data", "warn");
      if (!this.time) return toast("Seleziona un orario", "warn");
      if (S.recensioniAuto.consensoObbligatorio && !consent) return toast("Serve il consenso per procedere", "warn");

      const btn = document.getElementById("submitBtn"); btn.disabled = true; const old = btn.textContent; btn.textContent = "Invio in corso…";
      const token = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
      try {
        if (_sb) {
          // Niente .select(): il pubblico non può rileggere la tabella (privacy),
          // quindi non chiediamo la rappresentazione della riga, solo l'inserimento.
          const { error } = await _sb.from("prenotazioni").insert([{
            nome: name, email, telefono: phone || null, note: notes || null, consenso: !!consent,
            servizio: this.service.nome, prezzo: this.service.prezzo, durata: this.service.durata + " min",
            operatrice: this.op, data: this.date, orario: this.time, stato: "in_attesa",
            cancel_token: token, created_at: new Date().toISOString(),
            // Cadenza per la richiesta automatica di nuovo appuntamento (NULL → default da settings)
            richiamo_giorni: this.service.richiamo ?? null,
          }]);
          if (error) throw error;
        }
        this.lastToken = token;
        const apptStr = this.fmt(this.date);

        // Notifica al centro (Web3Forms)
        if (I.web3formsKey && I.web3formsKey !== "YOUR_WEB3FORMS_KEY") {
          await this.w3f(`NUOVA PRENOTAZIONE\n\nCliente: ${name}\nEmail: ${email}\nTel: ${phone || "—"}\n\nTrattamento: ${this.service.nome}\nOperatrice: ${this.op}\nData: ${apptStr}\nOrario: ${this.time}\nPrezzo: ${SITEUI.prezzo(this.service.prezzo)}\n\nNote: ${notes || "nessuna"}`, name, email);
        }
        // Conferma al cliente (EmailJS)
        if (window.emailjs && I.emailjsTemplate && I.emailjsTemplate !== "YOUR_EMAILJS_TEMPLATE") {
          const cancelUrl = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}annulla.html?token=${token}`;
          await emailjs.send(I.emailjsService, I.emailjsTemplate, {
            to_name: name, to_email: email, servizio: this.service.nome, operatrice: this.op,
            data: apptStr, orario: this.time, prezzo: SITEUI.prezzo(this.service.prezzo), durata: this.service.durata + " min",
            cancel_link: cancelUrl, attivita: S.brand.nome,
          });
        }
        this.showConfirm(apptStr, email);
        if (this.date) this.time = null, this.loadAvailability();
      } catch (err) {
        console.error(err);
        const dup = err && (err.code === "23505" || /duplicate|unique/i.test(err.message || ""));
        toast(dup ? "Quell'orario è appena stato prenotato. Scegline un altro." : "Errore. Chiama il " + S.contatti.telDisplay, dup ? "warn" : "err");
        if (dup && this.date) { this.time = null; this.loadAvailability(); }
      } finally { btn.disabled = false; btn.textContent = old; }
    },
    async w3f(message, name, email) {
      const fd = new FormData();
      Object.entries({ access_key: I.web3formsKey, subject: `Nuova prenotazione — ${name}`, name, email, message }).forEach(([k, v]) => fd.append(k, v));
      const r = await fetch("https://api.web3forms.com/submit", { method: "POST", body: fd });
      if (!(await r.json()).success) throw new Error("w3f");
    },
    showConfirm(apptStr, email) {
      const m = document.getElementById("confirmModal");
      document.getElementById("confSummary").innerHTML = `
        <div class="bsum-row"><span class="k">Trattamento</span><span>${this.service.nome}</span></div>
        <div class="bsum-row"><span class="k">Operatrice</span><span>${this.op}</span></div>
        <div class="bsum-row"><span class="k">Quando</span><span>${apptStr} · ${this.time}</span></div>
        <div class="bsum-row"><span class="k">Conferma a</span><span>${email}</span></div>`;
      m.classList.add("open");
      toast(_sb ? "Prenotazione registrata!" : "Demo: prenotazione simulata", "ok");
    },
  };

  /* ════════════════════════════════════════════════════════════════════
     MODULO RECENSIONI (smart routing: voto >= soglia → Google ; < soglia → feedback privato)
     ════════════════════════════════════════════════════════════════════ */
  const Reviews = {
    googleUrl() {
      const ra = S.recensioniAuto;
      if (ra.googleReviewUrl) return ra.googleReviewUrl;
      if (ra.googlePlaceId && ra.googlePlaceId !== "YOUR_GOOGLE_PLACE_ID")
        return `https://search.google.com/local/writereview?placeid=${ra.googlePlaceId}`;
      return S.social.facebook || "#";   // fallback demo
    },
    // Mostra le stelle; al click decide il routing
    initStarGate(containerId) {
      const box = document.getElementById(containerId); if (!box) return;
      const ra = S.recensioniAuto;
      const qp = new URLSearchParams(location.search);
      const nome = qp.get("nome") || "";
      const starSvg = '<svg viewBox="0 0 24 24" width="42" height="42" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.9 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>';
      const stars = [1, 2, 3, 4, 5].map(n => `<button class="star" data-v="${n}" aria-label="${n} stelle su 5" style="background:none;border:none;cursor:pointer;color:var(--sabbia);width:auto;padding:0 .2rem;line-height:0;transition:color .2s,transform .2s">${starSvg}</button>`).join("");
      box.innerHTML = `<div id="starRow" style="margin:1.2rem 0 1.6rem;display:flex;justify-content:center">${stars}</div><div id="starResult"></div>`;
      const btns = box.querySelectorAll(".star");
      const paint = v => btns.forEach(b => { const on = +b.dataset.v <= v; b.style.color = on ? "var(--rosa-dark)" : "var(--sabbia)"; b.style.transform = on ? "scale(1.08)" : "scale(1)"; });
      box.querySelector("#starRow").onmouseleave = () => paint(0);
      btns.forEach(b => {
        b.onmouseenter = () => paint(+b.dataset.v);
        b.onclick = () => {
          const v = +b.dataset.v; paint(v);
          const res = document.getElementById("starResult");
          if (v >= ra.sogliaStelle) {
            res.innerHTML = `<p class="lead mb1">${ra.messaggi.ringraziamentoPubblico.replace("{nome}", nome)}</p>
              <a class="btn btn-primary" href="${this.googleUrl()}" target="_blank" rel="noopener">Lascia una recensione su Google</a>`;
          } else {
            res.innerHTML = `<p class="lead mb1">${ra.messaggi.ringraziamentoPrivato.replace("{nome}", nome)}</p>
              <a class="btn btn-outline" href="feedback.html${location.search}">Raccontaci cosa migliorare</a>`;
          }
        };
      });
    },
    async submitFeedback() {
      initSupabase();
      const txt = (document.getElementById("fbText")?.value || "").trim();
      const contact = (document.getElementById("fbContact")?.value || "").trim();
      if (!txt) return toast("Scrivi qualche riga, grazie", "warn");
      const id = new URLSearchParams(location.search).get("id");
      if (_sb) { try { await _sb.from("feedback").insert([{ prenotazione_id: id || null, testo: txt, contatto: contact || null, created_at: new Date().toISOString() }]); } catch (e) { } }
      else if (I.web3formsKey && I.web3formsKey !== "YOUR_WEB3FORMS_KEY") { try { await Booking.w3f("FEEDBACK PRIVATO:\n\n" + txt + "\n\nContatto: " + (contact || "—"), "Cliente", S.contatti.email); } catch (e) { } }
      document.getElementById("fbForm").innerHTML = `<div class="center"><div class="feature-ico" style="margin:0 auto 1rem">${SITEUI.icon("heart","ico")}</div><h3>Grazie del tuo riscontro</h3><p class="muted">Lo terremo a mente per migliorare. Ti ricontatteremo al più presto.</p></div>`;
    },
  };

  /* ════════════════════════════════════════════════════════════════════
     MODULO RECUPERO CONTATTI PERSI — "Ti richiamiamo noi"
     Cattura il lead che sarebbe stato una chiamata persa: la cliente lascia il
     numero, finisce nella tabella `contatti_persi` e il titolare la richiama.
     Degrada in demo (senza Supabase) e con Web3Forms come fallback notifica.
     ════════════════════════════════════════════════════════════════════ */
  const Callback = {
    // Il centro è aperto adesso? (per la nudge "siamo chiusi, ti richiamiamo")
    isOpenNow() {
      const now = new Date();
      if ((S.orari.chiusoGiorni || []).includes(now.getDay())) return false;
      const slots = S.orari.slot || [];
      if (!slots.length) return true;
      const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };
      const cur = now.getHours() * 60 + now.getMinutes();
      return cur >= toMin(slots[0]) && cur <= toMin(slots[slots.length - 1]) + 30;
    },
    ensureModal() {
      if (document.getElementById("cbModal")) return;
      const m = document.createElement("div");
      m.id = "cbModal"; m.className = "modal";
      m.innerHTML = `
        <div class="modal-card" style="text-align:left;max-width:420px">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:1rem">
            <h3 class="serif" style="margin:0">Ti richiamiamo noi</h3>
            <button id="cbClose" aria-label="Chiudi" style="background:none;border:none;font-size:1.6rem;line-height:1;cursor:pointer;color:var(--grigio);width:auto;padding:0">&times;</button>
          </div>
          <div id="cbBody">
            <p class="muted small" style="margin:.4rem 0 1.1rem">Lasciaci il tuo numero: ti chiamiamo noi appena possibile, nessuna attesa.</p>
            <div class="fld-row"><label class="fld" for="cbNome">Nome</label><input id="cbNome" placeholder="Il tuo nome"/></div>
            <div class="fld-row"><label class="fld" for="cbTel">Telefono</label><input id="cbTel" type="tel" inputmode="tel" placeholder="Es. 333 1234567"/></div>
            <div class="fld-row"><label class="fld" for="cbMotivo">Per cosa? (facoltativo)</label><input id="cbMotivo" placeholder="Es. info su un trattamento"/></div>
            <label class="consent fld-row"><input type="checkbox" id="cbConsent"/><span>Acconsento a essere ricontattata al numero indicato. <a href="privacy.html">Privacy</a>.</span></label>
            <button class="btn btn-primary" id="cbSend" style="width:100%;justify-content:center">Richiamatemi</button>
          </div>
        </div>`;
      document.body.appendChild(m);
      m.addEventListener("click", e => { if (e.target === m) this.close(); });
      m.querySelector("#cbClose").onclick = () => this.close();
      m.querySelector("#cbSend").onclick = () => this.submit();
    },
    open(prefill) {
      this.ensureModal();
      const m = document.getElementById("cbModal");
      if (prefill && prefill.motivo) { const f = m.querySelector("#cbMotivo"); if (f) f.value = prefill.motivo; }
      m.classList.add("open");
      setTimeout(() => { const t = m.querySelector("#cbTel"); if (t) t.focus(); }, 50);
    },
    close() { const m = document.getElementById("cbModal"); if (m) m.classList.remove("open"); },
    async submit() {
      const g = id => (document.getElementById(id)?.value || "").trim();
      const nome = g("cbNome"), telefono = g("cbTel"), motivo = g("cbMotivo");
      const consenso = document.getElementById("cbConsent")?.checked;
      if (!telefono || telefono.replace(/\D/g, "").length < 6) return toast("Inserisci un numero di telefono valido", "warn");
      if (!consenso) return toast("Serve il consenso per richiamarti", "warn");
      const btn = document.getElementById("cbSend"); if (btn) { btn.disabled = true; btn.textContent = "Invio…"; }
      try {
        initSupabase();
        const origine = this.isOpenNow() ? "callback" : "chiusura";
        if (_sb) {
          const { error } = await _sb.from("contatti_persi").insert([{ nome: nome || null, telefono, motivo: motivo || null, origine, consenso: true }]);
          if (error) throw error;
        } else if (I.web3formsKey && I.web3formsKey !== "YOUR_WEB3FORMS_KEY") {
          await Booking.w3f(`RICHIESTA DI RICHIAMO\n\nNome: ${nome || "—"}\nTelefono: ${telefono}\nPer: ${motivo || "—"}`, nome || "Cliente", S.contatti.email);
        }
        const body = document.getElementById("cbBody");
        if (body) body.innerHTML = `<div class="center" style="padding:.5rem 0"><div class="feature-ico" style="margin:0 auto 1rem">${SITEUI.icon("phone", "ico")}</div><h3 class="serif">Ti richiamiamo presto</h3><p class="muted">Abbiamo ricevuto il tuo numero. Ti contattiamo al più presto.</p></div>`;
      } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = "Richiamatemi"; }
        toast("Errore nell'invio. Chiamaci al " + S.contatti.telDisplay, "err");
      }
    },
  };

  /* ════════════════════════════════════════════════════════════════════
     MODULO LISTA D'ATTESA — posti last-minute
     La cliente che trova il giorno pieno si iscrive; alla prima cancellazione
     l'edge function `posto-libero` avvisa la prima in lista che combacia.
     ════════════════════════════════════════════════════════════════════ */
  const Waitlist = {
    _pref: {},
    fmtDay(iso) { if (!iso) return "Qualsiasi giorno disponibile"; const [y, m, d] = iso.split("-").map(Number); return `${WD[new Date(y, m - 1, d).getDay()]} ${d} ${MESI[m - 1].toLowerCase()} ${y}`; },
    ensureModal() {
      if (document.getElementById("wlModal")) return;
      const m = document.createElement("div");
      m.id = "wlModal"; m.className = "modal";
      m.innerHTML = `
        <div class="modal-card" style="text-align:left;max-width:420px">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:1rem">
            <h3 class="serif" style="margin:0">Lista d'attesa</h3>
            <button id="wlClose" aria-label="Chiudi" style="background:none;border:none;font-size:1.6rem;line-height:1;cursor:pointer;color:var(--grigio);width:auto;padding:0">&times;</button>
          </div>
          <div id="wlBody">
            <p class="muted small" style="margin:.4rem 0 1rem">Ti avvisiamo appena si libera un posto. Nessun impegno.</p>
            <div class="card" style="background:var(--crema-2);margin-bottom:1rem;font-size:.85rem" id="wlPref"></div>
            <div class="fld-row"><label class="fld" for="wlNome">Nome</label><input id="wlNome" placeholder="Il tuo nome"/></div>
            <div class="fld-row"><label class="fld" for="wlEmail">Email</label><input id="wlEmail" type="email" placeholder="email@esempio.it"/></div>
            <div class="fld-row"><label class="fld" for="wlTel">Telefono (facoltativo)</label><input id="wlTel" type="tel" inputmode="tel" placeholder="Es. 333 1234567"/></div>
            <label class="consent fld-row"><input type="checkbox" id="wlConsent"/><span>Acconsento a essere avvisata quando si libera un posto. <a href="privacy.html">Privacy</a>.</span></label>
            <button class="btn btn-primary" id="wlSend" style="width:100%;justify-content:center">Avvisami</button>
          </div>
        </div>`;
      document.body.appendChild(m);
      m.addEventListener("click", e => { if (e.target === m) this.close(); });
      m.querySelector("#wlClose").onclick = () => this.close();
      m.querySelector("#wlSend").onclick = () => this.submit();
    },
    open(pref) {
      this._pref = pref || {};
      this.ensureModal();
      const m = document.getElementById("wlModal");
      const righe = [["Giorno", this.fmtDay(this._pref.data)]];
      if (this._pref.operatrice) righe.push(["Operatrice", this._pref.operatrice]);
      if (this._pref.servizio) righe.push(["Trattamento", this._pref.servizio]);
      m.querySelector("#wlPref").innerHTML = righe.map(([k, v]) => `<div class="bsum-row" style="padding:.2rem 0"><span class="k">${k}</span><span>${v}</span></div>`).join("");
      m.classList.add("open");
      setTimeout(() => { const f = m.querySelector("#wlEmail"); if (f) f.focus(); }, 50);
    },
    close() { const m = document.getElementById("wlModal"); if (m) m.classList.remove("open"); },
    async submit() {
      const g = id => (document.getElementById(id)?.value || "").trim();
      const nome = g("wlNome"), email = g("wlEmail"), telefono = g("wlTel");
      const consenso = document.getElementById("wlConsent")?.checked;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Inserisci un'email valida", "warn");
      if (!consenso) return toast("Serve il consenso per avvisarti", "warn");
      const btn = document.getElementById("wlSend"); if (btn) { btn.disabled = true; btn.textContent = "Invio…"; }
      try {
        initSupabase();
        if (_sb) {
          const { error } = await _sb.from("liste_attesa").insert([{
            nome: nome || null, email, telefono: telefono || null,
            servizio: this._pref.servizio || null, operatrice: this._pref.operatrice || null,
            data: this._pref.data || null, consenso: true,
          }]);
          if (error) throw error;
        } else if (I.web3formsKey && I.web3formsKey !== "YOUR_WEB3FORMS_KEY") {
          await Booking.w3f(`LISTA D'ATTESA\n\nNome: ${nome || "—"}\nEmail: ${email}\nTel: ${telefono || "—"}\nGiorno: ${this.fmtDay(this._pref.data)}\nOperatrice: ${this._pref.operatrice || "qualsiasi"}\nTrattamento: ${this._pref.servizio || "—"}`, nome || "Cliente", S.contatti.email);
        }
        const body = document.getElementById("wlBody");
        if (body) body.innerHTML = `<div class="center" style="padding:.5rem 0"><div class="feature-ico" style="margin:0 auto 1rem">${SITEUI.icon("check", "ico")}</div><h3 class="serif">Sei in lista d'attesa</h3><p class="muted">Ti avvisiamo appena si libera un posto. A presto!</p></div>`;
      } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = "Avvisami"; }
        toast("Errore nell'iscrizione. Riprova o chiamaci.", "err");
      }
    },
  };

  /* ════════════════════════════════════════════════════════════════════
     MODULO GESTIONE (area titolare): prenotazioni + blocchi giorni/orari.
     Login via Supabase Auth. Senza Supabase configurato → demo con dati finti.
     ════════════════════════════════════════════════════════════════════ */
  const Manage = {
    date: null, op: "", _rt: null,
    isoToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; },

    demoRows() {
      const t = this.isoToday();
      return [
        { id: 1, nome: "Chiara Rossi", email: "chiara@example.com", telefono: "333 1234567", servizio: "Trattamento anti-age", durata: "75 min", prezzo: 80, operatrice: S.team[0].nome, data: t, orario: "10:00", stato: "in_attesa", note: "Prima volta" },
        { id: 2, nome: "Federica Marino", email: "federica@example.com", telefono: "333 7654321", servizio: "Massaggio drenante", durata: "50 min", prezzo: 60, operatrice: (S.team[1] || S.team[0]).nome, data: t, orario: "15:30", stato: "confermata", note: "" },
        { id: 3, nome: "Valentina Sala", email: "vale@example.com", telefono: "", servizio: "Manicure semipermanente", durata: "55 min", prezzo: 35, operatrice: (S.team[2] || S.team[0]).nome, data: t, orario: "17:00", stato: "in_attesa", note: "" },
      ];
    },

    async init() {
      // La CDN supabase-js carica in async: se le chiavi ci sono, aspetta che sia pronta.
      if (hasSupabase && !window.supabase) {
        await new Promise(res => { let n = 0; const iv = setInterval(() => { if (window.supabase || n++ > 40) { clearInterval(iv); res(); } }, 50); });
      }
      initSupabase();
      this.date = this.isoToday();
      if (_sb) {
        try { const { data } = await _sb.auth.getSession(); if (!data.session) return this.renderLogin(); }
        catch (e) { return this.renderLogin(); }
      }
      this.renderShell();
    },

    renderLogin() {
      const root = document.getElementById("mgRoot"); if (!root) return;
      root.innerHTML = `
        <div class="book-card" style="max-width:380px;margin:0 auto">
          <h3 class="serif mb1">Accesso titolare</h3>
          <div class="fld-row"><label class="fld">Email</label><input id="mgEmail" type="email" autocomplete="username"></div>
          <div class="fld-row"><label class="fld">Password</label><input id="mgPass" type="password" autocomplete="current-password"></div>
          <button class="btn btn-primary" id="mgLoginBtn" style="justify-content:center;width:100%">Entra</button>
          <p class="muted small mt1">Accesso riservato al personale.</p>
        </div>`;
      document.getElementById("mgLoginBtn").onclick = async () => {
        const email = document.getElementById("mgEmail").value.trim();
        const password = document.getElementById("mgPass").value;
        if (!email || !password) return toast("Inserisci email e password", "warn");
        try {
          const { error } = await _sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          this.renderShell();
        } catch (e) { toast("Credenziali non valide", "err"); }
      };
    },

    renderShell() {
      const root = document.getElementById("mgRoot"); if (!root) return;
      const note = document.getElementById("mgMode");
      if (note) note.textContent = _sb ? "" : "Anteprima dimostrativa — dati di esempio.";
      const ops = `<option value="">Tutte le operatrici</option>` + S.team.map(m => `<option value="${m.nome}">${m.nome}</option>`).join("");
      const opsAll = S.team.map(m => `<option value="${m.nome}">${m.nome}</option>`).join("");
      const slotOpts = `<option value="GIORNO">Tutto il giorno</option>` + S.orari.slot.map(s => `<option value="${s}">${s}</option>`).join("");
      root.innerHTML = `
        <div class="mg-tabs">
          <button class="mg-tab sel" data-tab="pren">Prenotazioni</button>
          <button class="mg-tab" data-tab="chiusure">Chiusure & blocchi</button>
          <button class="mg-tab" data-tab="contatti">Contatti persi</button>
          <button class="mg-tab" data-tab="messaggi">Messaggi & marketing</button>
          <a class="mg-tab" href="dashboard.html">Recensioni</a>
          ${_sb ? `<button class="mg-tab" id="mgLogout" style="margin-left:auto">Esci</button>` : ``}
        </div>

        <div data-panel="pren">
          <div class="grid-4" id="mgStats" style="margin-bottom:1.5rem"></div>
          <div class="book-card" style="margin-bottom:1.5rem">
            <div class="grid-2" style="gap:1rem;align-items:end">
              <div class="fld-row" style="margin:0"><label class="fld">Giorno</label><input id="mgDate" type="date" value="${this.date}"></div>
              <div class="fld-row" style="margin:0"><label class="fld">Operatrice</label><select id="mgOp">${ops}</select></div>
            </div>
          </div>
          <div id="mgList"></div>
          <div id="mgWaitlist" style="margin-top:1.5rem"></div>
        </div>

        <div data-panel="chiusure" hidden>
          <div class="book-card" style="margin-bottom:1.5rem">
            <h3 class="serif mb1">Blocca un orario singolo</h3>
            <p class="muted small mb1">Per il giorno selezionato nella scheda Prenotazioni (<span id="mgBlkDate">${this.date}</span>).</p>
            <div class="grid-3" style="gap:1rem;align-items:end">
              <div class="fld-row" style="margin:0"><label class="fld">Operatrice</label><select id="mgBlkOp">${opsAll}</select></div>
              <div class="fld-row" style="margin:0"><label class="fld">Quando</label><select id="mgBlkSlot">${slotOpts}</select></div>
              <button class="btn btn-primary" id="mgBlock" style="justify-content:center">Blocca</button>
            </div>
          </div>
          <div class="book-card" style="background:var(--crema-2)">
            <h3 class="serif mb1">Blocca più giorni interi (ferie, chiusure)</h3>
            <div class="grid-4" style="gap:1rem;align-items:end">
              <div class="fld-row" style="margin:0"><label class="fld">Operatrice</label><select id="mgRngOp"><option value="__ALL__">Tutte</option>${opsAll}</select></div>
              <div class="fld-row" style="margin:0"><label class="fld">Dal</label><input id="mgRngFrom" type="date" value="${this.date}"></div>
              <div class="fld-row" style="margin:0"><label class="fld">Al</label><input id="mgRngTo" type="date" value="${this.date}"></div>
              <button class="btn btn-primary" id="mgBlockDays" style="justify-content:center">Blocca giorni</button>
            </div>
          </div>
        </div>

        <div data-panel="contatti" hidden>
          <div class="book-card" style="margin-bottom:1.5rem">
            <h3 class="serif mb1">Contatti & chiamate da recuperare</h3>
            <p class="muted small mb1">Chi ti ha lasciato il numero dal sito (richieste di richiamo). Richiamala finché è calda e segnala come gestita.</p>
          </div>
          <div id="mgContatti"></div>
        </div>

        <div data-panel="messaggi" hidden>
          <div class="book-card" style="margin-bottom:1.5rem;background:var(--crema-2)">
            <h3 class="serif mb1">Riattiva le clienti dormienti</h3>
            <p class="muted small mb1">Invia un messaggio "ci manchi" con incentivo a chi non torna da oltre ${(S.automazioni && S.automazioni.riattivazione.giorniDormiente) || 60} giorni e ha dato il consenso. Parte da sola ogni giorno; qui puoi lanciarlo manualmente.</p>
            <button class="btn btn-primary" id="mgRiattiva" style="justify-content:center">Invia win-back ora</button>
          </div>
          <div class="book-card" style="margin-bottom:1.5rem">
            <h3 class="serif mb1">Clienti riportate dal sistema</h3>
            <p class="muted small mb1">Clienti dormienti che hanno riprenotato dopo il win-back (entro ${(S.automazioni && S.automazioni.riattivazione.finestraAttribuzione) || 14} giorni). È il valore misurabile che il sistema ti ha fatto recuperare.</p>
            <div id="mgRiattivate"></div>
          </div>
          <div class="book-card" style="margin-bottom:1.5rem">
            <h3 class="serif mb1">Banner sul sito</h3>
            <p class="muted small mb1">Compare in cima a tutte le pagine del sito. Stato: <strong id="mgBannerStatus">—</strong></p>
            <div class="fld-row"><textarea id="mgBannerText" rows="2" placeholder="Es: Posti last minute oggi pomeriggio — prenota online!"></textarea></div>
            <div style="display:flex;gap:.6rem;flex-wrap:wrap">
              <button class="btn btn-primary" id="mgBannerPub" style="justify-content:center">Pubblica banner</button>
              <button class="btn btn-outline" id="mgBannerDel" style="justify-content:center">Rimuovi banner</button>
            </div>
          </div>
          <div class="book-card" style="background:var(--crema-2)">
            <h3 class="serif mb1">Email a tutte le clienti</h3>
            <p class="muted small mb1">Invia un messaggio (offerte, novità) a chi ha dato il consenso.</p>
            <div class="fld-row"><label class="fld">Oggetto</label><input id="mgMailSubj" placeholder="Una sorpresa per te"></div>
            <div class="fld-row"><label class="fld">Messaggio</label><textarea id="mgMailText" rows="4" placeholder="Scrivi qui l'offerta o la novità…"></textarea></div>
            <button class="btn btn-primary" id="mgMailSend" style="justify-content:center">Invia email a tutte</button>
          </div>
        </div>`;

      // Tab switching
      root.querySelectorAll(".mg-tab[data-tab]").forEach(t => t.onclick = () => {
        root.querySelectorAll(".mg-tab[data-tab]").forEach(x => x.classList.remove("sel"));
        t.classList.add("sel");
        root.querySelectorAll("[data-panel]").forEach(p => { p.hidden = p.getAttribute("data-panel") !== t.dataset.tab; });
      });
      // Prenotazioni
      const reload = () => { this.date = document.getElementById("mgDate").value; this.op = document.getElementById("mgOp").value; const bd = document.getElementById("mgBlkDate"); if (bd) bd.textContent = this.date; this.loadBookings(); };
      document.getElementById("mgDate").onchange = reload;
      document.getElementById("mgOp").onchange = reload;
      const lo = document.getElementById("mgLogout"); if (lo) lo.onclick = () => this.logout();
      // Chiusure
      document.getElementById("mgBlock").onclick = () => this.blockSlot(document.getElementById("mgBlkOp").value, document.getElementById("mgBlkSlot").value);
      document.getElementById("mgBlockDays").onclick = () => this.blockDays(document.getElementById("mgRngOp").value, document.getElementById("mgRngFrom").value, document.getElementById("mgRngTo").value);
      // Messaggi & marketing
      document.getElementById("mgBannerPub").onclick = () => this.publishBanner(document.getElementById("mgBannerText").value);
      document.getElementById("mgBannerDel").onclick = () => this.removeBanner();
      document.getElementById("mgMailSend").onclick = () => this.broadcast(document.getElementById("mgMailSubj").value, document.getElementById("mgMailText").value);
      document.getElementById("mgRiattiva").onclick = () => this.riattivaDormienti();
      // Contatti persi
      root.querySelector('.mg-tab[data-tab="contatti"]').addEventListener("click", () => this.loadContatti());
      this.refreshBannerStatus();
      this.loadContatti();
      this.loadRiattivate();
      this.loadBookings();
    },

    async loadBookings() {
      const list = document.getElementById("mgList"); if (!list) return;
      let rows;
      if (_sb) {
        list.innerHTML = `<p class="hint">Caricamento…</p>`;
        try {
          let q = _sb.from("prenotazioni").select("*").eq("data", this.date).order("orario");
          if (this.op) q = q.eq("operatrice", this.op);
          const { data, error } = await q; if (error) throw error;
          rows = data || [];
          if (this._rt) _sb.removeChannel(this._rt);
          this._rt = _sb.channel("mg_" + this.date)
            .on("postgres_changes", { event: "*", schema: "public", table: "prenotazioni", filter: "data=eq." + this.date }, () => this.loadBookings())
            .subscribe();
        } catch (e) { rows = []; }
      } else {
        rows = this.demoRows().filter(r => r.data === this.date && (!this.op || r.operatrice === this.op));
      }
      this.renderStats(rows);
      this.renderRows(rows);
      this.loadWaitlist();
    },

    renderStats(rows) {
      const box = document.getElementById("mgStats"); if (!box) return;
      const att = rows.filter(r => r.stato === "in_attesa").length;
      const conf = rows.filter(r => r.stato === "confermata").length;
      const inc = rows.filter(r => r.stato !== "cancellata").reduce((a, r) => a + (Number(r.prezzo) || 0), 0);
      const stats = [["Appuntamenti", rows.filter(r => r.stato !== "cancellata").length], ["Da confermare", att], ["Confermati", conf], ["Incasso previsto", inc + "€"]];
      box.innerHTML = stats.map(([l, v]) => `<div class="card center"><div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div></div>`).join("");
    },

    renderRows(rows) {
      const list = document.getElementById("mgList"); if (!list) return;
      if (!rows.length) { list.innerHTML = `<p class="muted center" style="padding:2rem 0">Nessuna prenotazione per questo giorno.</p>`; return; }
      const badge = s => s === "confermata" ? `<span class="pill" style="background:var(--salvia-dark);color:#fff">Confermata</span>`
        : s === "cancellata" ? `<span class="pill" style="background:#cf6b5e;color:#fff">Cancellata</span>`
          : `<span class="pill" style="background:#d9a441;color:#fff">In attesa</span>`;
      list.innerHTML = rows.map(r => `
        <div class="card" style="margin-bottom:.8rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;justify-content:space-between">
          <div style="min-width:200px">
            <div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.3rem"><strong>${r.orario}</strong> ${badge(r.stato)}</div>
            <div class="serif" style="font-size:1.15rem">${r.servizio}</div>
            <p class="muted small">${r.nome}${r.telefono ? " · " + r.telefono : ""}${r.email ? " · " + r.email : ""}</p>
            <p class="muted small">${r.operatrice} · ${r.durata || ""} · ${r.prezzo}€${r.note ? " · Note: " + r.note : ""}</p>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            ${r.stato !== "confermata" && r.stato !== "cancellata" ? `<button class="btn btn-primary" data-act="confermata" data-id="${r.id}" style="padding:.6rem 1.2rem;font-size:.62rem">Conferma</button>` : ""}
            ${r.stato !== "cancellata" ? `<button class="btn btn-outline" data-act="cancellata" data-id="${r.id}" style="padding:.6rem 1.2rem;font-size:.62rem">Annulla</button>` : ""}
          </div>
        </div>`).join("");
      list.querySelectorAll("button[data-act]").forEach(b => b.onclick = () => this.setStato(b.dataset.id, b.dataset.act));
    },

    async setStato(id, stato) {
      if (!_sb) { toast("Demo: in produzione aggiornerebbe la prenotazione", "ok"); return; }
      try { const { error } = await _sb.from("prenotazioni").update({ stato }).eq("id", id); if (error) throw error; toast(stato === "confermata" ? "Prenotazione confermata" : "Prenotazione annullata", "ok"); this.loadBookings(); }
      catch (e) { toast("Errore aggiornamento", "err"); }
    },

    async blockSlot(operatrice, orario) {
      if (!_sb) { toast("Demo: in produzione bloccherebbe " + (orario === "GIORNO" ? "il giorno" : orario) + " per " + operatrice, "ok"); return; }
      try { const { error } = await _sb.from("blocchi").insert([{ data: this.date, orario, operatrice }]); if (error) throw error; toast("Blocco aggiunto", "ok"); if (this.op === "" || this.op === operatrice) this.loadBookings(); }
      catch (e) { toast("Errore nel blocco", "err"); }
    },

    async blockDays(operatrice, from, to) {
      if (!from || !to) return toast("Scegli le date dal/al", "warn");
      const days = []; let d = new Date(from); const end = new Date(to);
      if (d > end) return toast("Intervallo non valido", "warn");
      for (; d <= end; d.setDate(d.getDate() + 1)) days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      const ops = operatrice === "__ALL__" ? S.team.map(m => m.nome) : [operatrice];
      if (!_sb) { toast(`Demo: bloccherebbe ${days.length} giorni (${ops.length === 1 ? ops[0] : "tutte le operatrici"})`, "ok"); return; }
      const rows = []; days.forEach(dt => ops.forEach(op => rows.push({ data: dt, orario: "GIORNO", operatrice: op })));
      try { const { error } = await _sb.from("blocchi").insert(rows); if (error) throw error; toast(`Bloccati ${days.length} giorni`, "ok"); }
      catch (e) { toast("Errore nel blocco giorni", "err"); }
    },

    async publishBanner(text) {
      text = (text || "").trim(); if (!text) return toast("Scrivi il messaggio del banner", "warn");
      if (!_sb) { try { localStorage.setItem("demo_annuncio", text); } catch (e) { } toast("Demo: banner pubblicato (visibile su questo browser)", "ok"); this.refreshBannerStatus(); return; }
      try {
        await _sb.from("annunci").update({ attivo: false }).eq("attivo", true);
        const { error } = await _sb.from("annunci").insert([{ testo: text, attivo: true }]); if (error) throw error;
        toast("Banner pubblicato sul sito", "ok"); this.refreshBannerStatus();
      } catch (e) { toast("Errore pubblicazione banner", "err"); }
    },
    async removeBanner() {
      if (!_sb) { try { localStorage.removeItem("demo_annuncio"); } catch (e) { } toast("Banner rimosso", "ok"); this.refreshBannerStatus(); return; }
      try { const { error } = await _sb.from("annunci").update({ attivo: false }).eq("attivo", true); if (error) throw error; toast("Banner rimosso", "ok"); this.refreshBannerStatus(); }
      catch (e) { toast("Errore rimozione banner", "err"); }
    },
    async refreshBannerStatus() {
      const el = document.getElementById("mgBannerStatus"); if (!el) return;
      let text = "";
      if (_sb) { try { const { data } = await _sb.from("annunci").select("testo").eq("attivo", true).order("created_at", { ascending: false }).limit(1); text = data && data[0] ? data[0].testo : ""; } catch (e) { } }
      else { try { text = localStorage.getItem("demo_annuncio") || ""; } catch (e) { } }
      el.textContent = text ? `attivo — "${text}"` : "nessun banner attivo";
    },

    async broadcast(subject, text) {
      subject = (subject || "").trim(); text = (text || "").trim();
      if (!text) return toast("Scrivi il messaggio dell'email", "warn");
      if (!confirm("Inviare questa email a tutte le clienti che hanno dato il consenso?")) return;
      if (!_sb) { toast("Demo: in produzione invierebbe l'email a tutte le clienti", "ok"); return; }
      try {
        const { data, error } = await _sb.functions.invoke("broadcast", { body: { subject, text } });
        if (error) throw error;
        toast(`Email inviata a ${data && data.inviate != null ? data.inviate : "tutte le"} clienti`, "ok");
      } catch (e) { toast("Errore invio (verifica l'edge function broadcast)", "err"); }
    },

    /* ── Contatti persi (recupero chiamate) ───────────────────────────── */
    demoContatti() {
      return [
        { id: 1, nome: "Laura Bianchi", telefono: "333 9988776", motivo: "Info massaggio drenante", origine: "chiusura", stato: "nuovo", created_at: new Date().toISOString() },
        { id: 2, nome: "Anna Verdi", telefono: "340 1122334", motivo: "", origine: "callback", stato: "richiamato", created_at: new Date(Date.now() - 3600000).toISOString() },
      ];
    },
    async loadContatti() {
      const box = document.getElementById("mgContatti"); if (!box) return;
      let rows;
      if (_sb) {
        try {
          const { data, error } = await _sb.from("contatti_persi").select("*").neq("stato", "chiuso").order("created_at", { ascending: false });
          if (error) throw error;
          rows = data || [];
          if (this._rtC) _sb.removeChannel(this._rtC);
          this._rtC = _sb.channel("mg_contatti")
            .on("postgres_changes", { event: "*", schema: "public", table: "contatti_persi" }, () => this.loadContatti())
            .subscribe();
        } catch (e) { rows = []; }
      } else { rows = this.demoContatti().filter(r => r.stato !== "chiuso"); }
      this.renderContatti(rows);
    },
    renderContatti(rows) {
      const box = document.getElementById("mgContatti"); if (!box) return;
      if (!rows.length) { box.innerHTML = `<p class="muted center" style="padding:2rem 0">Nessun contatto in attesa di richiamo.</p>`; return; }
      const orig = o => o === "chiusura" ? "centro chiuso" : o === "telefonia" ? "chiamata persa" : "dal sito";
      const quando = ts => { try { const d = new Date(ts); return d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
      box.innerHTML = rows.map(r => {
        const done = r.stato === "richiamato";
        return `
        <div class="card" style="margin-bottom:.8rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;justify-content:space-between">
          <div style="min-width:200px">
            <div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.3rem">
              <strong>${r.nome || "Senza nome"}</strong>
              ${done ? `<span class="pill" style="background:var(--salvia-dark);color:#fff">Richiamata</span>` : `<span class="pill" style="background:#d9a441;color:#fff">Da richiamare</span>`}
            </div>
            <p class="mt1" style="margin:0"><a class="price" href="tel:${String(r.telefono).replace(/\s+/g, "")}">${r.telefono}</a></p>
            <p class="muted small">${r.motivo ? r.motivo + " · " : ""}${orig(r.origine)} · ${quando(r.created_at)}</p>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <a class="btn btn-primary" href="tel:${String(r.telefono).replace(/\s+/g, "")}" style="padding:.6rem 1.2rem;font-size:.62rem">Chiama</a>
            ${!done ? `<button class="btn btn-outline" data-cb="richiamato" data-id="${r.id}" style="padding:.6rem 1.2rem;font-size:.62rem">Segna richiamata</button>` : ""}
            <button class="btn btn-outline" data-cb="chiuso" data-id="${r.id}" style="padding:.6rem 1.2rem;font-size:.62rem">Archivia</button>
          </div>
        </div>`;
      }).join("");
      box.querySelectorAll("button[data-cb]").forEach(b => b.onclick = () => this.setContattoStato(b.dataset.id, b.dataset.cb));
    },
    async setContattoStato(id, stato) {
      if (!_sb) { toast("Demo: in produzione aggiornerebbe il contatto", "ok"); return; }
      try { const { error } = await _sb.from("contatti_persi").update({ stato }).eq("id", id); if (error) throw error; toast(stato === "chiuso" ? "Contatto archiviato" : "Segnata come richiamata", "ok"); this.loadContatti(); }
      catch (e) { toast("Errore aggiornamento", "err"); }
    },

    /* ── Lista d'attesa per il giorno selezionato ─────────────────────── */
    async loadWaitlist() {
      const box = document.getElementById("mgWaitlist"); if (!box) return;
      let rows;
      if (_sb) {
        try {
          // In attesa per QUESTO giorno o senza giorno (qualsiasi).
          const { data, error } = await _sb.from("liste_attesa").select("*").eq("stato", "attiva")
            .or(`data.eq.${this.date},data.is.null`).order("created_at");
          if (error) throw error; rows = data || [];
        } catch (e) { rows = []; }
      } else {
        rows = [{ id: 1, nome: "Giada Conti", email: "giada@example.com", telefono: "333 5566778", servizio: "Manicure semipermanente", operatrice: S.team[2] ? S.team[2].nome : null, data: this.date, stato: "attiva" }];
      }
      if (!rows.length) { box.innerHTML = ""; return; }
      box.innerHTML = `<div class="book-card"><h3 class="serif mb1">Lista d'attesa</h3>
        <p class="muted small mb1">Chi aspetta un posto per ${this.date} (avvisata in automatico alla prima cancellazione).</p>
        ${rows.map(r => `<div class="card" style="margin-bottom:.6rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;justify-content:space-between">
          <div style="min-width:200px">
            <strong>${r.nome || "Senza nome"}</strong>
            <p class="muted small" style="margin:.2rem 0 0">${r.servizio || "Qualsiasi trattamento"}${r.operatrice ? " · " + r.operatrice : " · qualsiasi operatrice"}${r.data ? "" : " · qualsiasi giorno"}</p>
            <p class="muted small" style="margin:0">${r.email}${r.telefono ? " · " + r.telefono : ""}</p>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            ${r.telefono ? `<a class="btn btn-outline" href="tel:${String(r.telefono).replace(/\s+/g, "")}" style="padding:.5rem 1rem;font-size:.62rem">Chiama</a>` : ""}
            <button class="btn btn-outline" data-wl="${r.id}" style="padding:.5rem 1rem;font-size:.62rem">Rimuovi</button>
          </div>
        </div>`).join("")}</div>`;
      box.querySelectorAll("button[data-wl]").forEach(b => b.onclick = () => this.removeAttesa(b.dataset.wl));
    },
    async removeAttesa(id) {
      if (!_sb) { toast("Demo: rimuoverebbe dalla lista d'attesa", "ok"); return; }
      try { const { error } = await _sb.from("liste_attesa").update({ stato: "chiusa" }).eq("id", id); if (error) throw error; toast("Rimossa dalla lista", "ok"); this.loadWaitlist(); }
      catch (e) { toast("Errore", "err"); }
    },

    /* ── Riattivazione dormienti (lancio manuale del win-back) ─────────── */
    async riattivaDormienti() {
      if (!confirm("Inviare ora l'email di riattivazione alle clienti dormienti che hanno dato il consenso?\n(Chi è già stata contattata di recente viene saltata automaticamente.)")) return;
      if (!_sb) { toast("Demo: in produzione invierebbe il win-back alle clienti dormienti", "ok"); return; }
      const btn = document.getElementById("mgRiattiva"); if (btn) { btn.disabled = true; btn.textContent = "Invio in corso…"; }
      try {
        const { data, error } = await _sb.functions.invoke("riattivazione");
        if (error) throw error;
        const n = data && data.inviate != null ? data.inviate : 0;
        toast(n ? `Win-back inviato a ${n} client${n === 1 ? "e" : "i"}` : "Nessuna cliente dormiente da ricontattare ora", "ok");
      } catch (e) { toast("Errore (verifica l'edge function riattivazione)", "err"); }
      finally { if (btn) { btn.disabled = false; btn.textContent = "Invia win-back ora"; } }
    },

    /* ── Clienti riportate dal win-back (attribuzione success fee) ─────── */
    demoRiattivate() {
      const iso = d => new Date(Date.now() - d * 86400000).toISOString();
      const day = d => iso(d).slice(0, 10);
      return [
        { nome: "Giulia Ferri", servizio: "Massaggio drenante", data: day(-2), created_at: iso(1), riattivazioni: { created_at: iso(4) } },
        { nome: "Marta Conti",  servizio: "Trattamento anti-age", data: day(-5), created_at: iso(9), riattivazioni: { created_at: iso(12) } },
      ];
    },
    async loadRiattivate() {
      const box = document.getElementById("mgRiattivate"); if (!box) return;
      let rows;
      if (_sb) {
        try {
          const { data, error } = await _sb.from("prenotazioni")
            .select("nome,servizio,data,created_at,riattivazione_id,riattivazioni(created_at)")
            .eq("riattivata", true)
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          rows = data || [];
        } catch (e) { rows = []; }
      } else { rows = this.demoRiattivate(); }
      this.renderRiattivate(rows);
    },
    renderRiattivate(rows) {
      const box = document.getElementById("mgRiattivate"); if (!box) return;
      const d = ts => { try { return new Date(ts).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }); } catch (e) { return "—"; } };
      const now = new Date(), y = now.getFullYear(), m = now.getMonth();
      const nMese = rows.filter(r => { const t = new Date(r.created_at); return t.getFullYear() === y && t.getMonth() === m; }).length;
      const mese = now.toLocaleDateString("it-IT", { month: "long" });
      const badge = `
        <div class="card" style="display:flex;align-items:baseline;gap:.6rem;margin-bottom:1rem;background:var(--crema-2)">
          <strong class="serif" style="font-size:1.8rem;line-height:1">${nMese}</strong>
          <span class="muted small">client${nMese === 1 ? "e riportata" : "i riportate"} a ${mese}</span>
        </div>`;
      if (!rows.length) {
        box.innerHTML = badge + `<p class="muted center" style="padding:1.2rem 0">Ancora nessuna cliente riportata dal win-back. Compaiono qui quando una dormiente riprenota dopo il messaggio.</p>`;
        return;
      }
      box.innerHTML = badge + rows.map(r => {
        const winback = r.riattivazioni && r.riattivazioni.created_at;
        return `
        <div class="card" style="margin-bottom:.7rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;justify-content:space-between">
          <div style="min-width:200px">
            <strong>${r.nome || "Cliente"}</strong>
            <p class="muted small" style="margin:.2rem 0 0">${r.servizio || ""}</p>
          </div>
          <div class="muted small" style="text-align:right;line-height:1.5">
            ${winback ? `Win-back: <strong>${d(winback)}</strong> · ` : ""}Riprenotato: <strong>${d(r.created_at)}</strong><br>Appuntamento: ${d(r.data)}
          </div>
        </div>`;
      }).join("");
    },

    async logout() { if (_sb) { try { await _sb.auth.signOut(); } catch (e) { } } location.reload(); },
  };

  /* ── Banner annunci sul sito (pubblicato dal pannello Messaggi) ─────── */
  async function showAnnouncement() {
    if (document.getElementById("siteAnnounce")) return;
    let text = "";
    if (hasSupabase) {
      if (!window.supabase) return;   // CDN non ancora pronta: riprova al load
      initSupabase();
      if (_sb) { try { const { data } = await _sb.from("annunci").select("testo").eq("attivo", true).order("created_at", { ascending: false }).limit(1); text = data && data[0] ? data[0].testo : ""; } catch (e) { } }
    } else { try { text = localStorage.getItem("demo_annuncio") || ""; } catch (e) { } }
    if (!text || sessionStorage.getItem("announce_closed") === text) return;
    const b = document.createElement("div"); b.id = "siteAnnounce"; b.className = "site-announce";
    b.innerHTML = `<span></span><button class="sa-close" aria-label="Chiudi">&times;</button>`;
    b.querySelector("span").textContent = text;   // textContent: niente injection
    document.body.prepend(b);
    b.querySelector(".sa-close").onclick = () => { try { sessionStorage.setItem("announce_closed", text); } catch (e) { } b.remove(); };
  }
  document.addEventListener("DOMContentLoaded", showAnnouncement);
  window.addEventListener("load", showAnnouncement);

  /* ── Esporta ──────────────────────────────────────────────────────── */
  window.Booking = Booking;
  window.Reviews = Reviews;
  window.Manage = Manage;
  window.Callback = Callback;
  window.Waitlist = Waitlist;
  window.SITEAPP = { initSupabase, toast, hasSupabase, showAnnouncement, getClient: () => _sb };
})();
