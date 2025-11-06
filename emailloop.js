// Beholder Quill-instanser per steg (key = stepnr)
const _elrQuills = new Map();

function emailLoopRender(stepps) {
  if (!Array.isArray(stepps)) return;
  if (!window.Quill) {
    console.error("emailLoopRender: Quill er ikke lastet (mangler quill.min.js).");
    return;
  }

  // Aktiver "building mode"
  window._emailLoopBuilding = true;

  const _elrQuills = new Map();

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const debounce = (fn, ms=250) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  // ---------- Oppdatert styling ----------
  (function injectStylesOnce(){
    if (document.getElementById("elr-style")) return;
    const css = `
    .elr-wrap {
      max-width: 1100px;
      margin: 24px auto;
      padding: 0 8px;
    }
  
    .elr-title {
      font: 600 22px/1.2 system-ui, sans-serif;
      color: #0F172A;
      margin: 0 0 10px;
    }
  
    .elr-sub {
      color: #475569;
      font: 12px/1.4 system-ui, sans-serif;
      margin: 0 0 16px;
    }
  
    .elr-card {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 14px;
      padding: 16px;
      margin: 14px 0;
    }
  
    .elr-grid {
      display: grid;
      grid-template-columns: 66px 1fr 120px 1fr;
      gap: 12px;
      align-items: end;
    }
  
    .elr-chip {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 28px;
      border-radius: 999px;
      background: #E2E8F0;
      color: #0F172A;
      font-weight: 700;
      align-self: start; /* 🔥 Toppstilt chip */
      margin-top: 2px;   /* litt luft ned mot inputfeltene */
    }
  
    .elr-label {
      font-size: 12px;
      color: #475569;
      margin-bottom: 6px;
      display: block;
    }
  
    .elr-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #0F172A;
      border-radius: 10px;
      outline: none;
    }
  
    .elr-input:focus {
      border-color: #3B82F6;
      box-shadow: 0 0 0 3px rgba(59,130,246,.15);
    }
  
    .elr-editor {
      margin-top: 14px;
    }
  
    /* --- Quill styling --- */
    .elr-card .ql-toolbar.ql-snow {
      background: #F9FAFB;
      border: 1px solid #CBD5E1;
      border-radius: 10px 10px 0 0;
    }
  
    .elr-card .ql-container.ql-snow {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-top: 0;
      color: #000000; /* svart tekst */
      border-radius: 0 0 10px 10px;
    }
  
    /* Sørg for at tekst, overskrifter og lister alltid er svarte */
    .elr-card .ql-editor,
    .elr-card .ql-editor p,
    .elr-card .ql-editor li,
    .elr-card .ql-editor span,
    .elr-card .ql-editor strong,
    .elr-card .ql-editor em {
      color: #000000 !important;
    }
  
    /* Lenker kan fortsatt være blå */
    .elr-card .ql-editor a {
      color: #2563EB !important;
      text-decoration: underline;
    }
  
    .elr-card .ql-editor {
      min-height: 220px;
    }
  
    /* Verktøyikonene mørke (sort) + blå ved hover */
    .elr-card .ql-picker-label,
    .elr-card .ql-toolbar button svg {
      color: #0F172A;
      fill: #0F172A;
    }
  
    .elr-card .ql-toolbar button:hover svg {
      color: #2563EB;
      fill: #2563EB;
    }
  
    .elr-card .ql-toolbar button.ql-active svg {
      color: #2563EB;
      fill: #2563EB;
    }
  
    .elr-card .ql-editor a {
      color: #2563EB;
      text-decoration: underline;
    }
  
    .elr-card .ql-editor strong {
      font-weight: 600;
    }
  
    @media (max-width: 860px) {
      .elr-grid {
        grid-template-columns: 60px 1fr;
      }
      .elr-grid > div:nth-child(3),
      .elr-grid > div:nth-child(4) {
        grid-column: 1 / -1;
      }
    }
  `;
  
    const style = document.createElement('style');
    style.id = 'elr-style';
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ---------- container ----------
  const container = document.getElementById("emailLoopElementList");
  if (!container) {
    console.warn('emailLoopRender: Fant ikke #emailLoopElementList');
    return;
  }
  container.classList.add('elr-wrap');
  container.innerHTML = "";

  // ---------- overskrift ----------
  const groupName = stepps[0]?.groupname ? String(stepps[0].groupname) : "";
  //dette skal være hvit tekst
  if (groupName) {
    const h = document.createElement('h2');
    h.className = 'elr-title';
    h.textContent = `E-postløp – ${groupName}`;
    h.style.color = "white";
    container.appendChild(h);
    const sub = document.createElement('div');
    sub.className = 'elr-sub';
    sub.textContent = 'Alt du skriver lagres automatisk ved endring.';
    sub.style.color = "white";
    container.appendChild(sub);
  }

  // ---------- sorter ----------
  stepps.sort((a, b) => (a.stepnr||0) - (b.stepnr||0));

  // ---------- bygg ----------
  stepps.forEach(step => {
    const stepnr    = Number(step.stepnr) || 0;
    const delay     = Number(step.delay ?? step.delayDays ?? 0) || 0;
    const subject   = String(step.subject ?? "");
    const cta       = String(step.cta ?? "");
    const bodyHtml  = String(step.body ?? "");

    const card = document.createElement('div');
    card.className = 'elr-card';
    card.dataset.step = String(stepnr);

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
      <label class="elr-label">Dager etter start</label>
      <input class="elr-input" type="number" min="0" data-role="delaydays" value="${delay}">
    `;

    const colCta = document.createElement('div');
    colCta.innerHTML = `
      <label class="elr-label">Tekst på knapp</label>
      <input class="elr-input" data-role="cta" value="${esc(cta)}" placeholder="Knapp/lenke-tekst…">
    `;

    head.append(colStep, colSubject, colDelay, colCta);

    const editorWrap = document.createElement('div');
    editorWrap.className = 'elr-editor';
    const editorDiv = document.createElement('div');
    editorWrap.appendChild(editorDiv);
    card.append(head, editorWrap);
    container.appendChild(card);

    const safeUpdate = (field, value) => {
      // Ikke kjør under bygging
      if (window._emailLoopBuilding) return;
    
      if (typeof window.emailLoopUpdate === "function") {
        window.emailLoopUpdate(field, value, step);
      } else {
        step[field] = value;
      }
    };

    colSubject.querySelector('[data-role="subject"]').addEventListener('input', e => {
      safeUpdate('subject', e.target.value);
    });

    colDelay.querySelector('[data-role="delaydays"]').addEventListener('input', e => {
      const v = Math.max(0, Number(e.target.value)||0);
      e.target.value = v;
      safeUpdate('delay', v);
    });

    colCta.querySelector('[data-role="cta"]').addEventListener('input', e => {
      safeUpdate('cta', e.target.value);
    });

    // ---------- Quill init ----------
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

    // Sørg for svart tekst som default-format i editor
    const Parchment = Quill.import('parchment');
    const ColorClass = new Parchment.Attributor.Style('color', 'color', { scope: Parchment.Scope.INLINE });
    Quill.register(ColorClass, true);
    q.format('color', '#000000');

    q.root.innerHTML = bodyHtml;
    q.on('text-change', debounce(() => {
      safeUpdate('body', q.root.innerHTML);
    }, 250));
    _elrQuills.set(stepnr, q);
  });
  // Ferdig med bygging
  window._emailLoopBuilding = false;
}

function emailLoopsResponse(data){

  let stepps = rawdatacleaner(data);
  gEmailLoopSettings = stepps;
  emailLoopRender(stepps);

  console.log(gEmailLoopSettings);
  

}


function emailLoopUpdate(field, value, stepp) {
  // TODO: lagre / PATCH mot Airtable her
  // console.log('oppdater', { field, value, stepnr });
  console.log('emailLoopUpdate called:', { field, value, stepp });

  //finne riktig steg i gEmailLoopSettings med feltet airtable
  let airtableid = stepp.airtable;
  const stepToUpdate = gEmailLoopSettings.find(s => s.airtableid === airtableid);
  if (stepToUpdate) {
    stepToUpdate[field] = value;
  } 


  console.log(gEmailLoopSettings);
  //lag body for oppdatering
  let body = {[field]: value};

  //oppdater på server
  PATCHairtable("appEUYGzpBtxB0fFe","tblUML599clNbxHRq",airtableid,JSON.stringify(body),"responsUpdateServerEmailLoop");
}

function responsUpdateServerEmailLoop(data){

  console.log("responsUpdateServerEmailLoop:",data);
}