// Beholder Quill-instanser per steg (key = stepnr)
const _elrQuills = new Map();

function emailLoopRender(stepps) {
  if (!Array.isArray(stepps)) return;
  if (!window.Quill) {
    console.error("emailLoopRender: Quill er ikke lastet (mangler quill.min.js).");
    return;
  }

  // ---------- små hjelpere ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const debounce = (fn, ms=250) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  // ---------- isolerte styles (prefiks elr- så de ikke kolliderer) ----------
  (function injectStylesOnce(){
    if (document.getElementById("elr-style")) return;
    const css = `
      .elr-wrap{max-width:1100px;margin:24px auto;padding:0 8px;}
      .elr-title{font:600 22px/1.2 system-ui, sans-serif;color:#E5EAF5;margin:0 0 10px;}
      .elr-sub{color:#9FB2CB;font:12px/1.2 system-ui, sans-serif;margin:0 0 16px;}
      .elr-card{background:#0F172A;border:1px solid #233047;border-radius:14px;padding:16px;margin:14px 0;}
      .elr-grid{display:grid;grid-template-columns:66px 1fr 120px 1fr;gap:12px;align-items:end}
      .elr-chip{display:flex;align-items:center;justify-content:center;width:40px;height:28px;border-radius:999px;background:#1E293B;color:#E2E8F0;font-weight:700}
      .elr-label{font-size:12px;color:#8AA1BF;margin-bottom:6px;display:block}
      .elr-input{width:100%;padding:10px 12px;border:1px solid #2A3B55;background:#0B1324;color:#E6EEFC;border-radius:10px;outline:none}
      .elr-input:focus{border-color:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
      .elr-editor{margin-top:14px}
      .elr-card .ql-toolbar.ql-snow{background:#0B1324;border:1px solid #2A3B55;border-radius:10px 10px 0 0}
      .elr-card .ql-container.ql-snow{border:1px solid #2A3B55;border-top:0;background:#0A1120;color:#E6EEFC;border-radius:0 0 10px 10px}
      .elr-card .ql-editor{min-height:220px}
      @media (max-width:860px){.elr-grid{grid-template-columns:60px 1fr}.elr-grid>div:nth-child(3),.elr-grid>div:nth-child(4){grid-column:1/-1}}
    `;
    const style = document.createElement('style');
    style.id = 'elr-style';
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ---------- klargjør container ----------
  const container = document.getElementById("emailLoopElementList");
  if (!container) {
    console.warn('emailLoopRender: Fant ikke #emailLoopElementList');
    return;
  }
  container.classList.add('elr-wrap');
  container.innerHTML = "";

  // ---------- overskrift fra groupname ----------
  const groupName = stepps[0]?.groupname ? String(stepps[0].groupname) : "";
  if (groupName) {
    const h = document.createElement('h2');
    h.className = 'elr-title';
    h.textContent = `E-postløp – ${groupName}`;
    container.appendChild(h);
    const sub = document.createElement('div');
    sub.className = 'elr-sub';
    sub.textContent = 'Alt du skriver lagres ved endring via emailLoopUpdate(field, value, stepnr).';
    container.appendChild(sub);
  }

  // ---------- sorter etter stepnr ----------
  stepps.sort((a, b) => (a.stepnr||0) - (b.stepnr||0));

  // ---------- bygg hvert steg ----------
  stepps.forEach(step => {
    const stepnr    = Number(step.stepnr) || 0;
    const delay     = Number(step.delaydays ?? step.delayDays ?? 0) || 0;
    const subject   = String(step.subject ?? "");
    const cta       = String(step.cta ?? "");
    const bodyHtml  = String(step.body ?? "");

    const card = document.createElement('div');
    card.className = 'elr-card';
    card.dataset.step = String(stepnr);

    // Rad: #, subject, delay, cta
    const head = document.createElement('div');
    head.className = 'elr-grid';

    const colStep = document.createElement('div');
    colStep.innerHTML = `<div class="elr-chip">${esc(stepnr)}</div>`;

    const colSubject = document.createElement('div');
    colSubject.innerHTML = `
      <label class="elr-label">Emne</label>
      <input class="elr-input" data-role="subject" value="${esc(subject)}" placeholder="Emne…">
    `;

    const colDelay = document.createElement('div');
    colDelay.innerHTML = `
      <label class="elr-label">Dager</label>
      <input class="elr-input" type="number" min="0" data-role="delaydays" value="${delay}">
    `;

    const colCta = document.createElement('div');
    colCta.innerHTML = `
      <label class="elr-label">CTA-tekst</label>
      <input class="elr-input" data-role="cta" value="${esc(cta)}" placeholder="Knapp/lenke-tekst…">
    `;

    head.append(colStep, colSubject, colDelay, colCta);

    // Editor
    const editorWrap = document.createElement('div');
    editorWrap.className = 'elr-editor';
    const editorDiv = document.createElement('div');
    editorWrap.appendChild(editorDiv);

    card.append(head, editorWrap);
    container.appendChild(card);

    // Change-handlers → emailLoopUpdate(field, value, stepnr)
    const safeUpdate = (field, value) => {
      if (typeof window.emailLoopUpdate === "function") {
        window.emailLoopUpdate(field, value, stepnr);
      } else {
        // Fallback: oppdater i stepps-arrayen hvis ønskelig
        step[field] = value;
        // console.log('emailLoopUpdate missing, updated local step:', field, value, stepnr);
      }
    };

    colSubject.querySelector('[data-role="subject"]').addEventListener('input', e => {
      safeUpdate('subject', e.target.value);
    });

    colDelay.querySelector('[data-role="delaydays"]').addEventListener('input', e => {
      const v = Math.max(0, Number(e.target.value)||0);
      e.target.value = v;
      safeUpdate('delaydays', v);
    });

    colCta.querySelector('[data-role="cta"]').addEventListener('input', e => {
      safeUpdate('cta', e.target.value);
    });

    // Quill init
    const q = new Quill(editorDiv, {
      theme: 'snow',
      placeholder: 'Skriv e-postinnhold her …',
      modules: {
        toolbar: [
          [{ header:[false,2,3] }],
          ['bold','italic','underline'],
          [{ list:'ordered' }, { list:'bullet' }],
          ['link','clean']
        ]
      }
    });
    q.root.innerHTML = bodyHtml;
    q.on('text-change', debounce(() => {
      safeUpdate('body', q.root.innerHTML);
    }, 250));
    _elrQuills.set(stepnr, q);
  });
}


function emailLoopUpdate(field, value, stepnr) {
  // TODO: lagre / PATCH mot Airtable her
  // console.log('oppdater', { field, value, stepnr });
  console.log(`emailLoopUpdate called: step ${stepnr}, ${field} =`, value);
}