// Default data lives on window so other code can read/write it.
window.mailSettings = window.mailSettings || [
  { stepp: 1, subject: "", cta: "", delayDays: 0,  body: "" },
  { stepp: 2, subject: "", cta: "", delayDays: 3,  body: "" },
  { stepp: 3, subject: "", cta: "", delayDays: 6,  body: "" },
  { stepp: 4, subject: "", cta: "", delayDays: 9,  body: "" },
  { stepp: 5, subject: "", cta: "", delayDays: 13, body: "" },
];

// Keep Quill instances by step number
const _emailLoopQuills = new Map();

// Renders the whole UI. Call this whenever data changes.
function renderEmailLoop(opts = {}) {
  if (!window.Quill) {
    console.error("renderEmailLoop: Quill is not loaded. Include quill.min.js before this script.");
    return;
  }

  // ----- helpers kept local to avoid polluting globals -----
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const debounce = (fn, ms=250) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  function injectStylesOnce() {
    if (document.getElementById("ef3-style")) return;
    const css = `
      .ef3-wrap { max-width: 1100px; margin: 24px auto; padding: 0 8px; }
      .ef3-card { background:#0F172A; border:1px solid #233047; border-radius:14px; padding:16px; margin:14px 0; }
      .ef3-head { display:grid; grid-template-columns:66px 1fr 120px 1fr; gap:12px; align-items:end; }
      .ef3-chip { display:inline-flex; align-items:center; justify-content:center; width:40px; height:28px; border-radius:999px; background:#1E293B; color:#E2E8F0; font-weight:700; }
      .ef3-label { font-size:12px; color:#8aa1bf; margin-bottom:6px; display:block; }
      .ef3-input { width:100%; padding:10px 12px; border:1px solid #2a3b55; background:#0b1324; color:#e6eefc; border-radius:10px; outline:none; }
      .ef3-input:focus { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.15); }
      .ef3-editor { margin-top:14px; }
      .ef3-card .ql-toolbar.ql-snow { background:#0b1324; border:1px solid #2a3b55; border-radius:10px 10px 0 0; }
      .ef3-card .ql-container.ql-snow { border:1px solid #2a3b55; border-top:0; background:#0a1120; color:#e6eefc; border-radius:0 0 10px 10px; }
      .ef3-card .ql-editor { min-height:220px; }
      @media (max-width: 860px) {
        .ef3-head { grid-template-columns:60px 1fr; }
        .ef3-head > div:nth-child(3), .ef3-head > div:nth-child(4) { grid-column:1/-1; }
      }
    `;
    const style = document.createElement("style");
    style.id = "ef3-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function sync(updated) {
    const i = window.mailSettings.findIndex(s => s.stepp === updated.stepp);
    if (i !== -1) window.mailSettings[i] = { ...window.mailSettings[i], ...updated };
  }

  function buildStepCard(stepObj) {
    const card = document.createElement("div");
    card.className = "ef3-card";
    card.dataset.step = String(stepObj.stepp);

    // header
    const head = document.createElement("div");
    head.className = "ef3-head";

    const colStep = document.createElement("div");
    colStep.innerHTML = `
      <div class="ef3-label">#</div>
      <div class="ef3-chip">${esc(stepObj.stepp)}</div>
    `;

    const colSubject = document.createElement("div");
    colSubject.innerHTML = `
      <label class="ef3-label">Emne</label>
      <input class="ef3-input" data-role="subject" placeholder="Emne…" value="${esc(stepObj.subject)}">
    `;

    const colDelay = document.createElement("div");
    colDelay.innerHTML = `
      <label class="ef3-label">Dager</label>
      <input class="ef3-input" data-role="delay" type="number" min="0" value="${Number(stepObj.delayDays)||0}">
    `;

    const colCta = document.createElement("div");
    colCta.innerHTML = `
      <label class="ef3-label">CTA-tekst</label>
      <input class="ef3-input" data-role="cta" placeholder="Knapp/lenketekst…" value="${esc(stepObj.cta)}">
    `;

    head.append(colStep, colSubject, colDelay, colCta);

    // editor
    const editorWrap = document.createElement("div");
    editorWrap.className = "ef3-editor";
    const editorDiv = document.createElement("div");
    editorWrap.appendChild(editorDiv);

    card.append(head, editorWrap);

    // inputs → state
    colSubject.querySelector('[data-role="subject"]').addEventListener('input', e => {
      stepObj.subject = e.target.value; sync(stepObj);
    });
    colDelay.querySelector('[data-role="delay"]').addEventListener('input', e => {
      stepObj.delayDays = Math.max(0, Number(e.target.value)||0); sync(stepObj);
    });
    colCta.querySelector('[data-role="cta"]').addEventListener('input', e => {
      stepObj.cta = e.target.value; sync(stepObj);
    });

    // Quill
    const q = new Quill(editorDiv, {
      theme: 'snow',
      placeholder: 'Skriv e-postinnhold her …',
      modules: {
        toolbar: [
          [{ header: [false,2,3] }],
          ['bold','italic','underline'],
          [{ list:'ordered' }, { list:'bullet' }],
          ['link','clean']
        ]
      }
    });
    q.root.innerHTML = stepObj.body || "";
    q.on('text-change', debounce(() => {
      stepObj.body = q.root.innerHTML;
      sync(stepObj);
    }, 250));
    _emailLoopQuills.set(stepObj.stepp, q);

    return card;
  }
  // ----- end helpers -----

  injectStylesOnce();

  const host = document.querySelector(opts.host || "#emailLoopElementList");
  if (!host) {
    console.warn('renderEmailLoop: fant ikke container. Bruk opts.host eller <div id="emailLoopElementList">.');
    return;
  }

  // Optional: allow passing new data
  if (Array.isArray(opts.data)) {
    window.mailSettings = [...opts.data];
  }

  _emailLoopQuills.clear();
  host.classList.add("ef3-wrap");
  host.innerHTML = "";

  [...window.mailSettings].sort((a,b)=>a.stepp-b.stepp)
    .forEach(step => host.appendChild(buildStepCard(step)));
}

// Maps Airtable payload → window.mailSettings, strips CTA-paragraf i body, re-rendrer
function emailLoopsResponse(payload) {
  try {
    const records = Array.isArray(payload?.data) ? payload.data : [];
    const cleaned = records.map(r => {
      const f = r.fields || r._rawJson?.fields || {};
      const rawBody = String(f["Body HTML"] || "");
      const bodyWithoutCTA = rawBody.replace(/<p>\s*<strong>\s*CTA:\s*<\/strong>.*?<\/p>/gi, '').trim();
      return {
        stepp: Number(f["Step Number"] ?? f.number) || 0,
        subject: String(f["Subject"] || ""),
        cta: String(f["CTA Text"] || ""),
        delayDays: Number(f["Delay"] || 0) || 0,
        body: bodyWithoutCTA
      };
    }).filter(x => x.stepp >= 1);

    if (cleaned.length) {
      const byStep = Object.fromEntries(cleaned.map(x => [x.stepp, x]));
      const defaults = [1,2,3,4,5].map(n => ({
        stepp: n, subject:"", cta:"", delayDays:[0,3,6,9,13][n-1], body:""
      }));
      const base = window.mailSettings?.length ? window.mailSettings : defaults;
      window.mailSettings = base.map(row => byStep[row.stepp] ? { ...row, ...byStep[row.stepp] } : row);
    }

    renderEmailLoop(); // rebuild UI with new data
  } catch (e) {
    console.error("emailLoopsResponse feilet:", e);
  }
}
