
// ---- TimeRunner modul (full utvidet versjon) -------------------------------
// ---- TimeRunner modul (full utvidet versjon + footer/knapp) ---------------
// ---- TimeRunner modul (full utvidet versjon + "Oppdatert for … siden") ----
const timeRunner = (() => {
  const STATE = { el: null, prev: null, mounted: false, mode: 'idle', lastUpdated: null, relTimer: null };
  const nf = new Intl.NumberFormat('nb-NO');
  const isTrue = v => String(v).toUpperCase() === "TRUE";

  // ---------- Public ----------
  function init(elOrSelector){
    STATE.el = typeof elOrSelector === 'string' ? document.querySelector(elOrSelector) : elOrSelector;
    if(!STATE.el) throw new Error('timeRunner.init: container not found');
    injectStylesOnce();
    STATE.mounted = true;
    STATE.prev = null;
    STATE.mode = 'idle';
  }

  function loading(){
    ensureMounted();
    STATE.mode = 'loading';
    STATE.lastUpdated = null;
    STATE.el.innerHTML = headerHtml() + loadingHtml();
    startRelativeTicker(); // viser "Oppdaterer …"
  }

  function update(data){
    ensureMounted();
    const metrics = computeMetrics(data);
    STATE.el.innerHTML = headerHtml() + overviewHtml(metrics);

    // animasjoner
    animateAll(metrics, STATE.prev);

    // snitttider (tekst)
    const oc = document.getElementById('tro-avg-open-click');
    const ca = document.getElementById('tro-avg-click-accept');
    if (oc) oc.textContent = formatDuration(metrics.avgOpenToClickMs);
    if (ca) ca.textContent = formatDuration(metrics.avgClickToAcceptMs);

    STATE.prev = metrics;
    STATE.mode = 'ready';
    STATE.lastUpdated = new Date();
    startRelativeTicker();
  }

  function error(message='Kunne ikke hente data'){
    ensureMounted();
    STATE.mode = 'error';
    STATE.lastUpdated = null;
    STATE.el.innerHTML = headerHtml() + `
      <div class="tro-wrap">
        <div class="tro-card wide" style="grid-column:span 12">
          <div class="tro-title">Feil</div>
          <div class="tro-value" style="color:#fecaca">${escapeHtml(message)}</div>
          <div class="tro-sub">Prøv å laste siden på nytt eller forsøk senere.</div>
        </div>
        ${updatedRowHtml()}  <!-- høyrejustert status under siste kort -->
      </div>
    `;
    startRelativeTicker(); // viser "—"
  }

  // ---------- Private: updated tekst ----------
  function updatedRowHtml(){
    return `
      <div class="tro-updated-row">
        <span id="tro-updated">${relativeSince(STATE.lastUpdated)}</span>
      </div>
    `;
  }

  function startRelativeTicker(){
    if (STATE.relTimer) clearInterval(STATE.relTimer);
    STATE.relTimer = setInterval(() => {
      const el = document.getElementById('tro-updated');
      if (!el) return;
      el.textContent = relativeSince(STATE.lastUpdated);
    }, 1000);
    const el = document.getElementById('tro-updated');
    if (el) el.textContent = relativeSince(STATE.lastUpdated);
  }

  function relativeSince(date){
    if (STATE.mode === 'loading') return 'Oppdaterer …';
    if (!date) return '—';
    const s = Math.max(0, Math.round((Date.now() - date.getTime())/1000));
    if (s < 5) return 'Oppdatert nå';
    if (s < 60) return `Oppdatert for ${s} sek. siden`;
    const m = Math.floor(s/60);
    if (m < 60) {
      const rs = s % 60;
      return rs ? `Oppdatert for ${m} min ${rs} sek. siden` : `Oppdatert for ${m} min siden`;
    }
    const h = Math.floor(m/60);
    if (h < 24) {
      const rm = m % 60;
      return rm ? `Oppdatert for ${h} t ${rm} min siden` : `Oppdatert for ${h} t siden`;
    }
    const d = Math.floor(h/24);
    return `Oppdatert for ${d} d siden`;
  }

  // ---------- Private: metrics & render ----------
  function computeMetrics(rows){
    const now = new Date();
    const toDate = v => (v ? new Date(v) : null);
    const isNextMonth = (d, ref=now) => {
      if(!d) return false;
      const y = ref.getFullYear(), m = ref.getMonth();
      const next = new Date(y, m+1, 1);
      const after = new Date(y, m+2, 1);
      return d >= next && d < after;
    };
    const pct = (n,d)=> d ? Math.round((n/d)*100) : 0;

    const leads = new Set();
    let sumOpenToClick = 0, nOpenToClick = 0;
    let sumClickToAccept = 0, nClickToAccept = 0;

    const s = rows.reduce((acc,row) => {
      const w  = toDate(row.when);
      const sent = isTrue(row.executed);
      const stop = isTrue(row.stopp);
      const opened = isTrue(row.opened);
      const clicked = isTrue(row.clicked);
      const accepted = isTrue(row.accepted);
      const unsub = isTrue(row.no_interest);

      const executedAt = toDate(row.executedAt);       // NEW: sendetid
      const openedAt   = toDate(row.openedAt);
      const clickedAt  = toDate(row.clickedAt);
      const acceptedAt = toDate(row.acceptedAt);

      leads.add(row.externalId);

      acc.total++;
      if (sent) acc.sent++;
      if (!sent && !stop) acc.processing++;
      if (stop) acc.stopped++;
      if (isNextMonth(w)) acc.nextMonth++;

      if (opened) acc.opened++;
      if (clicked) acc.clicked++;
      if (accepted) acc.accepted++;
      if (unsub) acc.unsubscribed++;

      // Åpnet -> Klikk (kun når begge stempler finnes i rekkefølge)
      if (openedAt && clickedAt && clickedAt >= openedAt) {
        sumOpenToClick += (clickedAt - openedAt);
        nOpenToClick++;
      }

      // CHANGED: Klikk -> Aksept med fallbacks
      // 1) clickedAt -> acceptedAt
      // 2) (fallback) openedAt -> acceptedAt
      // 3) (fallback) executedAt -> acceptedAt
      if (acceptedAt) {
        const start = clickedAt || openedAt || executedAt || null;
        if (start && acceptedAt >= start) {
          sumClickToAccept += (acceptedAt - start);
          nClickToAccept++;
        }
      }

      return acc;
    }, {
      total:0, sent:0, processing:0, nextMonth:0, stopped:0,
      opened:0, clicked:0, accepted:0, unsubscribed:0
    });

    const notOpened = Math.max(0, s.sent - s.opened);
    const avgOpenToClickMs   = nOpenToClick   ? Math.round(sumOpenToClick / nOpenToClick)     : null;
    const avgClickToAcceptMs = nClickToAccept ? Math.round(sumClickToAccept / nClickToAccept) : null;

    // CHANGED: “Total akseptrate” = akseptert / åpnet
    const acceptFromOpenRate = pct(s.accepted, s.opened || 1);

    return {
      // absolute
      leads: leads.size,
      total: s.total,
      sent: s.sent,
      processing: s.processing,
      nextMonth: s.nextMonth,
      stopped: s.stopped,
      opened: s.opened,
      notOpened,
      clicked: s.clicked,
      accepted: s.accepted,
      unsubscribed: s.unsubscribed,
      // rates
      sentPct: pct(s.sent, s.total),
      openRate: pct(s.opened, s.sent || 1),
      ctr: pct(s.clicked, s.opened || s.sent || 1),
      acceptRateSent: pct(s.accepted, s.clicked || 1),
      acceptFromOpenRate,                             // NEW
      clickToAcceptRate: pct(s.accepted, s.clicked || 1),
      unsubRate: pct(s.unsubscribed, s.sent || 1),
      // progress (sendt -> akseptert)
      progress: Math.min(100, pct(s.accepted, s.sent || 1)),
      // snitttider (ms)
      avgOpenToClickMs,
      avgClickToAcceptMs
    };
  }

  // kort
  function card(title, valueHtml, subtitle) {
    return `
      <div class="tro-card">
        <div class="tro-title">${title}</div>
        <div class="tro-value">${valueHtml}</div>
        <div class="tro-sub">${subtitle}</div>
      </div>
    `;
  }

  function badgePct(id, value){
    return `<span class="tro-badge" id="${id}">${value}%</span>`;
  }

  // oversikts-HTML inkl. "Oppdatert for … siden"
  function overviewHtml(m){
    return `
      <div class="tro-wrap">
        ${card('Antall bedrifter', `<span id="tro-leads">0</span>`, 'Unike selskaper')}
        ${card('Antall e-poster', `<span id="tro-total">0</span>`, 'Alle sendte og planlagte')}
        ${card('Sendt', `<span id="tro-sent-num">0</span> ${badgePct('tro-sent-pct', m.sentPct)}`, 'Andel av total')}
        ${card('Åpnet', `<span id="tro-open">0</span> ${badgePct('tro-open-rate', m.openRate)}`, 'Åpningsrate')}
        ${card('Ikke åpnet', `<span id="tro-notopen">0</span>`, 'Sendt men ikke åpnet')}
        ${card('Klikket', `<span id="tro-click">0</span> ${badgePct('tro-ctr', m.ctr)}`, 'Klikkrate på link i mail')}
        ${card('Akseptert', `<span id="tro-acc">0</span> ${badgePct('tro-acc-rate', m.acceptRateSent)}`, 'Aksept vs. sendt')}
        ${card('Avmeldt', `<span id="tro-unsub">0</span> ${badgePct('tro-unsub-rate', m.unsubRate)}`, 'Utmeldingsrate')}
        ${card('I prosess', `<span id="tro-proc">0</span>`, 'Planlagt / ikke stoppet')}
        ${card('Neste måned', `<span id="tro-next">0</span>`, 'Planlagte utsendelser')}
        ${card('Stoppet', `<span id="tro-stop">0</span> <span class="tro-badge err">Stoppet</span>`, 'Utsendelser er stoppet')}

        <!-- snitttider -->
        <div class="tro-card">
          <div class="tro-title">Snitttider</div>
          <div class="tro-value">
            <div style="font-size:16px; line-height:1.4">
              Åpnet → Klikk: <b id="tro-avg-open-click">—</b><br/>
              Klikk → Aksept: <b id="tro-avg-click-accept">—</b>
            </div>
          </div>
          <div class="tro-sub"></div>
        </div>

        <div class="tro-card wide">
          <div class="tro-title">Progresjon</div>
          <div class="tro-value" id="tro-prog-text">${m.progress}%</div>
          <div class="tro-progress"><div class="tro-bar" id="tro-prog-bar" style="width:${m.progress}%"></div></div>
          <div class="tro-sub">Aksept-rate (sendt → akseptert)</div>
        </div>

        <div class="tro-card wide">
          <div class="tro-title">Nedstrøms konvertering</div>
          <div class="tro-value" id="tro-funnel">
            <span class="tro-chip">Åpning → Klikk: <b id="tro-ctr-chip">${m.ctr}%</b></span>
            <span class="tro-chip">Klikk → Aksept: <b id="tro-c2a-chip">${m.clickToAcceptRate}%</b></span>
            <span class="tro-chip">Åpnet → Aksept: <b id="tro-acc-total-chip">${m.acceptFromOpenRate}%</b></span>  <!-- CHANGED -->
          </div>
          <div class="tro-sub"></div>
        </div>

        ${updatedRowHtml()}
      </div>`;
  }

  function loadingHtml(){
    return `
      <div class="tro-wrap">
        ${Array.from({length:10}).map(()=>skeletonCard()).join('')}
        <div class="tro-card wide">${skeletonBlock()}</div>
        ${updatedRowHtml()}
      </div>
    `;
  }

  function headerHtml(){
    return `
      <div class="tro-header">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.5" />
          <path d="M22 8l-8.7 5.8a2 2 0 0 1-2.6 0L2 8" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <div class="tro-header-title">Epostløp</div>
      </div>`;
  }

  // ---------- Private: animation ----------
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  function animateNumber(el, from, to, duration=1000){
    if (!el) return;
    if (from === to){ el.textContent = nf.format(to); return; }
    const start = performance.now();
    function frame(now){
      const t = Math.min(1, (now - start)/duration);
      const val = Math.round(from + (to - from) * easeOutCubic(t));
      el.textContent = nf.format(val);
      if(t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function animatePct(el, from, to, duration=1000){
    if (!el) return;
    if (from === to){ el.textContent = to + '%'; return; }
    const start = performance.now();
    function frame(now){
      const t = Math.min(1, (now - start)/duration);
      const v = Math.round(from + (to - from) * easeOutCubic(t));
      el.textContent = v + '%';
      if(t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function animateWidth(el, fromPct, toPct, duration=1000){
    if (!el) return;
    if (fromPct === toPct){ el.style.width = toPct + '%'; return; }
    const start = performance.now();
    function frame(now){
      const t = Math.min(1, (now - start)/duration);
      const v = fromPct + (toPct - fromPct) * easeOutCubic(t);
      el.style.width = v + '%';
      if(t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function animateAll(curr, prev){
    const first = !prev;
    const dur = first ? 1000 : 800;
    prev = prev || {
      leads:0,total:0,sent:0,processing:0,nextMonth:0,stopped:0,
      opened:0, notOpened:0, clicked:0, accepted:0, unsubscribed:0,
      progress:0, sentPct:0, openRate:0, ctr:0, acceptRateSent:0,
      acceptFromOpenRate:0,                           // CHANGED default
      clickToAcceptRate:0, unsubRate:0
    };

    // tall
    animateNumber(document.getElementById('tro-leads'), prev.leads, curr.leads, dur);
    animateNumber(document.getElementById('tro-total'), prev.total, curr.total, dur);
    animateNumber(document.getElementById('tro-sent-num'), prev.sent, curr.sent, dur);
    animateNumber(document.getElementById('tro-open'), prev.opened, curr.opened, dur);
    animateNumber(document.getElementById('tro-notopen'), prev.notOpened, curr.notOpened, dur);
    animateNumber(document.getElementById('tro-click'), prev.clicked, curr.clicked, dur);
    animateNumber(document.getElementById('tro-acc'), prev.accepted, curr.accepted, dur);
    animateNumber(document.getElementById('tro-unsub'), prev.unsubscribed, curr.unsubscribed, dur);
    animateNumber(document.getElementById('tro-proc'), prev.processing, curr.processing, dur);
    animateNumber(document.getElementById('tro-next'), prev.nextMonth, curr.nextMonth, dur);
    animateNumber(document.getElementById('tro-stop'), prev.stopped, curr.stopped, dur);

    // badges / prosenter
    animatePct(document.getElementById('tro-sent-pct'), prev.sentPct, curr.sentPct, dur);
    animatePct(document.getElementById('tro-open-rate'), prev.openRate, curr.openRate, dur);
    animatePct(document.getElementById('tro-ctr'), prev.ctr, curr.ctr, dur);
    animatePct(document.getElementById('tro-acc-rate'), prev.acceptRateSent, curr.acceptRateSent, dur);
    animatePct(document.getElementById('tro-unsub-rate'), prev.unsubRate, curr.unsubRate, dur);

    // progresjon
    animatePct(document.getElementById('tro-prog-text'), prev.progress, curr.progress, dur);
    animateWidth(document.getElementById('tro-prog-bar'), prev.progress, curr.progress, dur);

    // “chips”
    animatePct(document.getElementById('tro-ctr-chip'), prev.ctr, curr.ctr, dur);
    animatePct(document.getElementById('tro-c2a-chip'), prev.clickToAcceptRate, curr.clickToAcceptRate, dur);
    animatePct(document.getElementById('tro-acc-total-chip'), prev.acceptFromOpenRate, curr.acceptFromOpenRate, dur); // CHANGED
  }

  // ---------- Utils ----------
  function formatDuration(ms){
    if (ms == null) return '—';
    const sec = Math.round(ms/1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec/60), s = sec % 60;
    if (min < 60) return s ? `${min}m ${s}s` : `${min}m`;
    const h = Math.floor(min/60), m = min % 60;
    return m ? `${h}t ${m}m` : `${h}t`;
  }

  function ensureMounted(){ if(!STATE.mounted) throw new Error('timeRunner: call init() first'); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // ---------- Skeletons ----------
  function skeletonCard(){
    return `<div class="tro-card">
      <div class="tro-title skel skel-text"></div>
      <div class="tro-value skel skel-text skel-lg"></div>
      <div class="tro-sub skel skel-text"></div>
    </div>`;
  }
  function skeletonBlock(){
    return `<div class="skel skel-text skel-lg" style="width:15%"></div>
            <div class="tro-progress" style="margin-top:14px">
              <div class="skel skel-bar"></div>
            </div>
            <div class="tro-sub skel skel-text" style="width:30%"></div>`;
  }

  // ---------- Styles ----------
  function injectStylesOnce(){
    if(document.getElementById('timeRunnerOverviewStyles')) return;
    const css = `
      .tro-wrap{display:grid;gap:16px}
      @media(min-width:900px){.tro-wrap{grid-template-columns:repeat(12,1fr)}}
      .tro-header{display:flex;align-items:center;gap:10px;margin:0 0 10px 2px}
      .tro-header svg{width:18px;height:18px;opacity:.85}
      .tro-header-title{color:#e8f0ff;font-weight:700;letter-spacing:.3px}
      .tro-card{grid-column:span 3;background:linear-gradient(135deg,#0e1b2b 0%,#0b1623 100%);
        border:1px solid rgba(255,255,255,.06); border-radius:14px; padding:16px 18px;
        box-shadow:0 10px 30px rgba(0,0,0,.25)}
      .tro-card.wide{grid-column:span 6}
      .tro-title{color:#9fb3c8;font-size:12px;letter-spacing:.6px;text-transform:uppercase}
      .tro-value{color:#e8f0ff;font-size:28px;font-weight:700;margin-top:6px}
      .tro-sub{color:#87a0b9;font-size:12px;margin-top:2px}
      .tro-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;margin-left:8px;
        background:rgba(34,197,94,.12);color:#a7f3d0;border:1px solid rgba(34,197,94,.25)}
      .tro-badge.err{background:rgba(239,68,68,.12);color:#fecaca;border-color:rgba(239,68,68,.25)}
      .tro-chip{display:inline-block;font-size:14px;padding:6px 10px;border:1px solid rgba(255,255,255,.08);
        border-radius:999px;margin-right:10px;margin-top:8px;color:#e8f0ff;background:rgba(255,255,255,.03)}
      .tro-progress{height:8px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;margin-top:10px}
      .tro-bar{height:100%;background:linear-gradient(90deg,#4f46e5,#06b6d4);width:0%}

      /* "Oppdatert for … siden" nederst til høyre */
      .tro-updated-row{
        grid-column: 1 / -1;
        text-align: right;
        margin-top: 2px;
      }
      #tro-updated{
        color:#87a0b9;
        font-size:12px;
        opacity:.9;
      }

      /* skeleton / shimmer */
      .skel{position:relative;overflow:hidden;border-radius:8px}
      .skel-text{height:14px;background:rgba(255,255,255,.06)}
      .skel-lg{height:28px;margin-top:10px}
      .skel-bar{height:8px;background:rgba(255,255,255,.06);border-radius:999px}
      .skel::after{
        content:""; position:absolute; inset:0;
        background:linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
        transform:translateX(-100%); animation:skel 1.2s infinite;
      }
      @keyframes skel{ to{ transform:translateX(100%); } }
    `;
    const style = document.createElement('style');
    style.id = 'timeRunnerOverviewStyles';
    style.innerHTML = css;
    document.head.appendChild(style);
  }

  return { init, loading, update, error };
})();


// ---- Init og bruk av TimeRunner-modul --------------------------------------
timeRunner.init('#timeRunnerOverview');   // én gang ved mount
timeRunner.loading();  // vis ventemodus mens du henter

