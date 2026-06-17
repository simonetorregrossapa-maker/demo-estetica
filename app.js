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
          ${c.trattamenti.map(t => `<option value="${t.nome}" ${this.service.nome === t.nome ? "selected" : ""}>${t.nome} · ${t.durata}′ · ${t.prezzo}€</option>`).join("")}
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
        S.orari.slot.forEach(t => {
          const b = document.createElement("button"); b.type = "button"; b.className = "time-btn"; b.textContent = t;
          const [h, mi] = t.split(":").map(Number);
          const past = isToday && (h * 60 + mi) <= nowMin;
          if (booked.includes(t) || past) { b.classList.add("booked"); b.disabled = true; }
          else { if (this.time === t) b.classList.add("sel"); b.onclick = () => { grid.querySelectorAll(".time-btn").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); this.time = t; this.refreshSummary(); }; }
          grid.appendChild(b);
        });
      };
      if (!_sb) { render([]); return; }
      grid.innerHTML = `<p class="hint">Caricamento disponibilità…</p>`;
      try {
        const [pre, blo] = await Promise.all([
          _sb.from("prenotazioni").select("orario").eq("data", this.date).eq("operatrice", this.op).in("stato", ["confermata", "in_attesa"]),
          _sb.from("blocchi").select("orario").eq("data", this.date).eq("operatrice", this.op),
        ]);
        const blocked = (blo.data || []).flatMap(r => r.orario === "GIORNO" ? S.orari.slot : [r.orario]);
        render([...(pre.data || []).map(r => r.orario), ...blocked]);
        if (this._rt) _sb.removeChannel(this._rt);
        this._rt = _sb.channel("av_" + this.date)
          .on("postgres_changes", { event: "*", schema: "public", table: "prenotazioni", filter: "data=eq." + this.date }, () => this.loadAvailability())
          .subscribe();
      } catch (e) { render([]); }
    },

    refreshSummary() {
      const s = document.getElementById("bookSummary"); if (!s) return;
      const acc = S.acconto.attivo ? `<div class="bsum-row"><span class="k">Acconto richiesto</span><span>${Math.round(this.service.prezzo * S.acconto.percentuale / 100)}€</span></div>` : "";
      s.innerHTML = `
        <div class="bsum-row"><span class="k">Trattamento</span><span>${this.service.nome}</span></div>
        <div class="bsum-row"><span class="k">Durata</span><span>${this.service.durata} min</span></div>
        <div class="bsum-row"><span class="k">Operatrice</span><span>${this.op}</span></div>
        <div class="bsum-row"><span class="k">Data</span><span>${this.date ? this.fmt(this.date) : "—"}</span></div>
        <div class="bsum-row"><span class="k">Orario</span><span>${this.time || "—"}</span></div>
        <div class="bsum-row"><span class="k">Prezzo</span><span class="price">${this.service.prezzo}€</span></div>${acc}`;
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
          const { data, error } = await _sb.from("prenotazioni").insert([{
            nome: name, email, telefono: phone || null, note: notes || null, consenso: !!consent,
            servizio: this.service.nome, prezzo: this.service.prezzo, durata: this.service.durata + " min",
            operatrice: this.op, data: this.date, orario: this.time, stato: "in_attesa",
            cancel_token: token, created_at: new Date().toISOString(),
          }]).select().single();
          if (error) throw error;
          this.lastId = data?.id;
        }
        this.lastToken = token;
        const apptStr = this.fmt(this.date);

        // Notifica al centro (Web3Forms)
        if (I.web3formsKey && I.web3formsKey !== "YOUR_WEB3FORMS_KEY") {
          await this.w3f(`NUOVA PRENOTAZIONE\n\nCliente: ${name}\nEmail: ${email}\nTel: ${phone || "—"}\n\nTrattamento: ${this.service.nome}\nOperatrice: ${this.op}\nData: ${apptStr}\nOrario: ${this.time}\nPrezzo: ${this.service.prezzo}€\n\nNote: ${notes || "nessuna"}`, name, email);
        }
        // Conferma al cliente (EmailJS)
        if (window.emailjs && I.emailjsTemplate && I.emailjsTemplate !== "YOUR_EMAILJS_TEMPLATE") {
          const cancelUrl = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}annulla.html?token=${token}`;
          await emailjs.send(I.emailjsService, I.emailjsTemplate, {
            to_name: name, to_email: email, servizio: this.service.nome, operatrice: this.op,
            data: apptStr, orario: this.time, prezzo: this.service.prezzo + "€", durata: this.service.durata + " min",
            cancel_link: cancelUrl, attivita: S.brand.nome,
          });
        }
        this.showConfirm(apptStr, email);
        if (this.date) this.time = null, this.loadAvailability();
      } catch (err) {
        console.error(err); toast("Errore. Chiama il " + S.contatti.telDisplay, "err");
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
      const txt = (document.getElementById("fbText")?.value || "").trim();
      const contact = (document.getElementById("fbContact")?.value || "").trim();
      if (!txt) return toast("Scrivi qualche riga, grazie", "warn");
      const id = new URLSearchParams(location.search).get("id");
      if (_sb) { try { await _sb.from("feedback").insert([{ prenotazione_id: id || null, testo: txt, contatto: contact || null, created_at: new Date().toISOString() }]); } catch (e) { } }
      else if (I.web3formsKey && I.web3formsKey !== "YOUR_WEB3FORMS_KEY") { try { await Booking.w3f("FEEDBACK PRIVATO:\n\n" + txt + "\n\nContatto: " + (contact || "—"), "Cliente", S.contatti.email); } catch (e) { } }
      document.getElementById("fbForm").innerHTML = `<div class="center"><div class="feature-ico" style="margin:0 auto 1rem">${SITEUI.icon("heart","ico")}</div><h3>Grazie del tuo riscontro</h3><p class="muted">Lo terremo a mente per migliorare. Ti ricontatteremo al più presto.</p></div>`;
    },
  };

  /* ── Esporta ──────────────────────────────────────────────────────── */
  window.Booking = Booking;
  window.Reviews = Reviews;
  window.SITEAPP = { initSupabase, toast, hasSupabase, getClient: () => _sb };
})();
