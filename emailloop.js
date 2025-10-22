(function(){
    const KEY = 'emailFlow_v1';
    const app = document.getElementById('emailFlowApp');
    const listEl = document.getElementById('ef-list');
    const btnAdd = document.getElementById('ef-add');
    const btnExport = document.getElementById('ef-export');
    const inpImport = document.getElementById('ef-import');
    const btnReset = document.getElementById('ef-reset');
    const btnCopyAll = document.getElementById('ef-copyAll');
  
    // --- State helpers ---
    function load() {
      try { return JSON.parse(localStorage.getItem(KEY)) ?? defaultData(); }
      catch { return defaultData(); }
    }
    function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
    function defaultData() {
      return [
        { id: uid(), name: 'Steg 1 – Første e-post', subject: 'Hei {{navn}}', delayDays: 0, html: '<p>Hei {{navn}},</p><p>…første henvendelse…</p>' },
        { id: uid(), name: 'Steg 2 – Oppfølging', subject: 'Oppfølging: {{emne}}', delayDays: 3, html: '<p>Hei igjen,</p><p>Ville bare følge opp…</p>' },
        { id: uid(), name: 'Steg 3 – Oppfølging 2', subject: 'Siste påminnelse', delayDays: 7, html: '<p>Hei,</p><p>En siste oppfølging…</p>' },
        { id: uid(), name: 'Steg 4 – Avslutning', subject: 'Vi lukker saken inntil videre', delayDays: 14, html: '<p>Hei,</p><p>Vi lukker saken nå, si ifra om…</p>' },
      ];
    }
    function uid(){ return 's' + Math.random().toString(36).slice(2,9); }
  
    // --- Render ---
    let state = load();
    let quills = new Map(); // id -> Quill
  
    function render() {
      listEl.innerHTML = '';
      quills.clear();
  
      state.forEach((row, idx) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'ef-row';
        rowEl.dataset.id = row.id;
  
        rowEl.innerHTML = `
          <div class="ef-row__head">
            <div class="ef-row__title">#${idx+1}</div>
            <input class="ef-input" data-role="name" placeholder="Navn på steg" value="${escapeHtml(row.name || '')}">
            <input class="ef-input" data-role="subject" placeholder="E-post emne" value="${escapeHtml(row.subject || '')}">
            <span class="ef-row__meta">
              <span class="ef-chip">Forsinkelse</span>
              <input class="ef-input" style="width:90px" type="number" min="0" data-role="delay" value="${Number(row.delayDays)||0}" title="Antall dager etter forrige steg">
            </span>
            <div style="display:flex; gap:8px;">
              <button class="ef-btn" data-act="up" title="Flytt opp">↑</button>
              <button class="ef-btn" data-act="down" title="Flytt ned">↓</button>
              <button class="ef-btn ef-btn--danger" data-act="remove" title="Slett steg">Slett</button>
            </div>
          </div>
          <div class="ef-q" id="q-${row.id}"></div>
          <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
            <button class="ef-btn" data-act="copyHtml">Kopier HTML</button>
            <button class="ef-btn" data-act="preview">Forhåndsvis</button>
          </div>
        `;
  
        listEl.appendChild(rowEl);
  
        // Quill init
        const q = new Quill(`#q-${row.id}`, {
          theme: 'snow',
          placeholder: 'Skriv e-postinnhold her…',
          modules: {
            toolbar: [
              [{ header: [false, 2, 3] }],
              ['bold','italic','underline'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              ['link'],
              ['clean']
            ]
          }
        });
        q.root.innerHTML = row.html || '';
        quills.set(row.id, q);
  
        // Change listeners
        q.on('text-change', debounce(() => {
          const it = state.find(s => s.id === row.id);
          if (!it) return;
          it.html = q.root.innerHTML;
          save(state);
        }, 300));
  
        rowEl.querySelector('[data-role="name"]').addEventListener('input', e => {
          row.name = e.target.value; save(state);
        });
        rowEl.querySelector('[data-role="subject"]').addEventListener('input', e => {
          row.subject = e.target.value; save(state);
        });
        rowEl.querySelector('[data-role="delay"]').addEventListener('input', e => {
          row.delayDays = Math.max(0, Number(e.target.value) || 0); save(state);
        });
  
        // Row actions
        rowEl.addEventListener('click', async (e) => {
          const act = e.target?.dataset?.act;
          if (!act) return;
  
          if (act === 'remove') {
            if (!confirm('Slett dette steget?')) return;
            state = state.filter(s => s.id !== row.id);
            save(state); render();
          }
          if (act === 'up' || act === 'down') {
            const i = state.findIndex(s => s.id === row.id);
            const j = act === 'up' ? i-1 : i+1;
            if (j < 0 || j >= state.length) return;
            const tmp = state[i]; state[i] = state[j]; state[j] = tmp;
            save(state); render();
          }
          if (act === 'copyHtml') {
            const html = quills.get(row.id)?.root.innerHTML || '';
            copyToClipboard(html);
            toast('HTML kopiert!');
          }
          if (act === 'preview') {
            const html = quills.get(row.id)?.root.innerHTML || '';
            const w = window.open('', '_blank');
            w.document.write(`<!doctype html><meta charset="utf-8"><title>Forhåndsvisning</title><body>${html}</body>`);
            w.document.close();
          }
        });
      });
    }
  
    // --- Top bar actions ---
    btnAdd.addEventListener('click', () => {
      state.push({ id: uid(), name: `Nytt steg`, subject: '', delayDays: 0, html: '<p>…</p>' });
      save(state); render();
    });
  
    btnExport.addEventListener('click', () => {
      // Sørg for at editorinnhold er i state
      state.forEach(s => { const q = quills.get(s.id); if (q) s.html = q.root.innerHTML; });
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'emailflow.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  
    inpImport.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('Ugyldig format');
        // enkel hygiene
        state = data.map(d => ({
          id: d.id || uid(),
          name: d.name || '',
          subject: d.subject || '',
          delayDays: Math.max(0, Number(d.delayDays)||0),
          html: String(d.html || '')
        }));
        save(state); render();
        toast('Importert!');
      } catch (err) {
        alert('Kunne ikke importere: ' + err.message);
      } finally {
        e.target.value = '';
      }
    });
  
    btnReset.addEventListener('click', () => {
      if (!confirm('Slette alt og starte på nytt?')) return;
      state = defaultData(); save(state); render();
    });
  
    btnCopyAll.addEventListener('click', () => {
      // Oppdater state fra editorene først
      state.forEach(s => { const q = quills.get(s.id); if (q) s.html = q.root.innerHTML; });
      copyToClipboard(JSON.stringify(state, null, 2));
      toast('JSON kopiert!');
    });
  
    // --- Utils ---
    function copyToClipboard(text){
      navigator.clipboard?.writeText(text).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
      });
    }
    function debounce(fn, ms=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
    function escapeHtml(s){return String(s).replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]))}
    function toast(msg){
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:8px 12px;border-radius:8px;z-index:9999;font:12px system-ui;";
      document.body.appendChild(el);
      setTimeout(()=>{ el.remove(); }, 1400);
    }
  
    // Init
    render();
  
    // Eksponer et lite API (hent steg/HTML) om du trenger i annen custom code
    window.EmailFlowAPI = {
      getSteps() {
        // oppdater state fra editor
        return state.map(s => {
          const q = quills.get(s.id);
          return { ...s, html: q ? q.root.innerHTML : s.html };
        });
      },
      getStepHtml(index) {
        const s = state[index];
        const q = s ? quills.get(s.id) : null;
        return s ? (q ? q.root.innerHTML : s.html) : '';
      }
    };
  })();