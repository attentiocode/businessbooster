timeRunner.init('#timeRunnerOverview'); // én gang ved mount
timeRunner.loading();                   // vis ventemodus mens du henter
// ...hent data...
//timeRunner.update(data);                // vis og animer tall
// timeRunner.error('Noe gikk galt');  // valgfri feilvisning




// ---- TimeRunner modul ------------------------------------------------------
const timeRunner = (() => {
    const STATE = { el: null, prev: null, mounted: false, mode: 'idle' };
    const nf = new Intl.NumberFormat();
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
      STATE.el.innerHTML = headerHtml() + `
        <div class="tro-wrap">
          ${Array.from({length:6}).map(()=>skeletonCard()).join('')}
          <div class="tro-card wide">${skeletonBlock()}</div>
        </div>
      `;
    }
  
    function update(data){
      ensureMounted();
      const metrics = computeMetrics(data);
      // første render med ekte HTML (med spans som kan animeres)
      STATE.el.innerHTML = headerHtml() + overviewHtml();
      // tall + animasjoner
      animateAll(metrics, STATE.prev);
      STATE.prev = metrics;
      STATE.mode = 'ready';
    }
  
    function error(message='Kunne ikke hente data'){
      ensureMounted();
      STATE.mode = 'error';
      STATE.el.innerHTML = headerHtml() + `
        <div class="tro-wrap">
          <div class="tro-card wide" style="grid-column:span 12">
            <div class="tro-title">Feil</div>
            <div class="tro-value" style="color:#fecaca">${escapeHtml(message)}</div>
            <div class="tro-sub">Prøv å laste siden på nytt eller forsøk senere.</div>
          </div>
        </div>
      `;
    }
  
    // ---------- Private: metrics & render ----------
    function computeMetrics(data){
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
      const t = data.reduce((acc,row) => {
        leads.add(row.externalId);
        const exec = isTrue(row.executed);
        const stop = isTrue(row.stopp);
        const w = toDate(row.when);
        acc.total++;
        if(exec) acc.sent++;
        if(!exec && !stop) acc.processing++;
        if(stop) acc.stopped++;
        if(isNextMonth(w)) acc.nextMonth++;
        return acc;
      }, { total:0, sent:0, processing:0, nextMonth:0, stopped:0 });
  
      return {
        leads: leads.size,
        total: t.total,
        sent: t.sent,
        processing: t.processing,
        nextMonth: t.nextMonth,
        stopped: t.stopped,
        progress: Math.min(100, pct(t.sent, t.total)),
        sentPct: Math.min(100, pct(t.sent, t.total))
      };
    }
  
    function overviewHtml(){
      return `
        <div class="tro-wrap">
          ${card('Antall leads', `<span id="tro-leads">0</span>`, 'Unike selskaper (externalId)')}
          ${card('Totalt', `<span id="tro-total">0</span>`, 'Alle rader i datasettet')}
          ${card('Sendt', `<span id="tro-sent-num">0</span> <span class="tro-badge" id="tro-sent-pct">0%</span>`, 'E-poster som er sendt')}
          ${card('I prosess', `<span id="tro-proc">0</span>`, 'Planlagt / ikke stoppet')}
          ${card('Neste måned', `<span id="tro-next">0</span>`, 'Planlagte utsendelser neste måned')}
          ${card('Stoppet', `<span id="tro-stop">0</span> <span class="tro-badge err">Stoppet</span>`, 'Utsendelser markert som stopp')}
          <div class="tro-card wide">
            <div class="tro-title">Progresjon</div>
            <div class="tro-value" id="tro-prog-text">0%</div>
            <div class="tro-progress"><div class="tro-bar" id="tro-prog-bar" style="width:0%"></div></div>
            <div class="tro-sub">Sendt vs. totalt</div>
          </div>
        </div>`;
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
      prev = prev || {leads:0,total:0,sent:0,processing:0,nextMonth:0,stopped:0,progress:0,sentPct:0};
  
      animateNumber(document.getElementById('tro-leads'), prev.leads, curr.leads, dur);
      animateNumber(document.getElementById('tro-total'), prev.total, curr.total, dur);
      animateNumber(document.getElementById('tro-sent-num'), prev.sent, curr.sent, dur);
      animateNumber(document.getElementById('tro-proc'), prev.processing, curr.processing, dur);
      animateNumber(document.getElementById('tro-next'), prev.nextMonth, curr.nextMonth, dur);
      animateNumber(document.getElementById('tro-stop'), prev.stopped, curr.stopped, dur);
  
      animatePct(document.getElementById('tro-sent-pct'), percentSafe(prev.sent, prev.total), percentSafe(curr.sent, curr.total), dur);
      animatePct(document.getElementById('tro-prog-text'), prev.progress, curr.progress, dur);
      animateWidth(document.getElementById('tro-prog-bar'), prev.progress, curr.progress, dur);
    }
  
    // ---------- Private: skeletons ----------
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
  
    // ---------- Utils ----------
    function percentSafe(n,d){ return d ? Math.round((n/d)*100) : 0; }
    function ensureMounted(){ if(!STATE.mounted) throw new Error('timeRunner: call init() first'); }
    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  
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
        .tro-progress{height:8px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;margin-top:10px}
        .tro-bar{height:100%;background:linear-gradient(90deg,#4f46e5,#06b6d4);width:0%}
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
  