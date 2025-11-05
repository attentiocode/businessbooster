(function(){
  window.mailSettings = window.mailSettings || [
    { stepp: 1, subject: "", cta: "", delayDays: 0, body: "" },
    { stepp: 2, subject: "", cta: "", delayDays: 3, body: "" },
    { stepp: 3, subject: "", cta: "", delayDays: 6, body: "" },
    { stepp: 4, subject: "", cta: "", delayDays: 9, body: "" },
    { stepp: 5, subject: "", cta: "", delayDays: 13, body: "" },
  ];

  const listEl = document.getElementById('ef2-list');
  const quills = new Map();

  function render(){
    listEl.innerHTML = "";
    window.mailSettings
      .sort((a,b)=>a.stepp-b.stepp)
      .forEach((row, idx) => listEl.appendChild(makeStepCard(row, idx)));
  }

  function makeStepCard(row, idx){
    const wrap = document.createElement('div');
    wrap.className = 'ef2-card';
    wrap.dataset.step = String(row.stepp);

    wrap.innerHTML = `
      <div class="ef2-head">
        <div>
          <div class="ef2-l">#</div>
          <div class="ef2-chip">${row.stepp}</div>
        </div>
        <div>
          <div class="ef2-l">Emne</div>
          <input class="ef2-inp" data-role="subject" placeholder="Emnefelt…" value="${esc(row.subject)}">
        </div>
        <div>
          <div class="ef2-l">Dager</div>
          <input class="ef2-inp" data-role="delay" type="number" min="0" value="${Number(row.delayDays)||0}">
        </div>
        <div>
          <div class="ef2-l">CTA-tekst</div>
          <input class="ef2-inp" data-role="cta" placeholder="Tekst for handlingsknapp/lenke…" value="${esc(row.cta)}">
        </div>
      </div>

      <div class="ef2-editor">
        <div id="ef2-q-${row.stepp}"></div>
      </div>
    `;

    wrap.querySelector('[data-role="subject"]').addEventListener('input', (e)=>{
      row.subject = e.target.value; syncMailSettings(row);
    });
    wrap.querySelector('[data-role="delay"]').addEventListener('input', (e)=>{
      row.delayDays = Math.max(0, Number(e.target.value)||0); syncMailSettings(row);
    });
    wrap.querySelector('[data-role="cta"]').addEventListener('input', (e)=>{
      row.cta = e.target.value; syncMailSettings(row);
    });

    const q = new Quill(`#ef2-q-${row.stepp}`, {
      theme: 'snow',
      placeholder: 'Skriv e-postinnhold her …',
      modules: {
        toolbar: [
          [{ header:[false,2,3]}],
          ['bold','italic','underline'],
          [{ list:'ordered' }, { list:'bullet' }],
          ['link','clean']
        ]
      }
    });
    q.root.innerHTML = row.body || "";
    q.on('text-change', debounce(()=>{
      row.body = q.root.innerHTML;
      syncMailSettings(row);
    }, 250));
    quills.set(row.stepp, q);

    return wrap;
  }

  function syncMailSettings(updated){
    const i = window.mailSettings.findIndex(s => s.stepp === updated.stepp);
    if (i !== -1) window.mailSettings[i] = { ...window.mailSettings[i], ...updated };
  }

  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms||300); }; }

  // --- Airtable → UI ---
  window.emailLoopsResponse = function(payload){
    try{
      const records = Array.isArray(payload?.data) ? payload.data : [];
      const normalized = records.map(r => {
        const f = r.fields || r._rawJson?.fields || {};
        const rawBody = String(f['Body HTML'] || '');
        const cleanedBody = rawBody
          .replace(/<p><strong>CTA:<\/strong>.*?<\/p>/gi, '') // fjerner CTA-linjen
          .trim();

        return {
          stepp: Number(f['Step Number'] || f.number) || 0,
          subject: String(f['Subject'] || ''),
          cta: String(f['CTA Text'] || ''),
          delayDays: Number(f['Delay'] || 0) || 0,
          body: cleanedBody
        };
      }).filter(x => x.stepp >= 1 && x.stepp <= 5);

      window.mailSettings = [1,2,3,4,5].map(n => {
        const found = normalized.find(x => x.stepp === n);
        const prev  = { stepp:n, subject:"", cta:"", delayDays:[0,3,6,9,13][n-1], body:"" };
        return found ? { ...prev, ...found } : prev;
      });

      render();
      window.mailSettings.forEach(s => {
        const q = quills.get(s.stepp);
        if (q && q.root.innerHTML !== s.body) q.root.innerHTML = s.body || "";
      });
      console.log("emailLoopsResponse → oppdatert mailSettings:", window.mailSettings);
    }catch(err){
      console.error("emailLoopsResponse() feilet:", err);
    }
  };

  render();
})();


function updateContentToServer(data){

  let body = JSON.stringify(data);


  PATCHairtable("","",data.id,body,"responsFromUpdateContentToServer");


}