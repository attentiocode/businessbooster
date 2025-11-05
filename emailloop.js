;(() => {
  // Eksporterer kun disse i window:
  // - window.mailSettings         (array av 5 steg)
  // - window.emailLoopsResponse   (tar Airtable-respons og fyller UI)
  // - window.ef2InitFromSettings  (brukes hvis du vil sette settings manuelt)

  const appSel = '#ef2-app';
  let quills = new Map(); // step -> Quill

  // --- Utility ---
  const clampInt = (v, min=0) => Math.max(min, Number.isFinite(+v) ? Math.floor(+v) : 0);
  const by = (prop) => (a,b) => ((a?.[prop] ?? 0) - (b?.[prop] ?? 0));
  const pick = (o, k, d=undefined) => (o && k in o ? o[k] : d);
  const cleanHtml = (s) => String(s ?? '');

  // Default settings (5 steg)
  function defaultMailSettings(){
    return [
      { stepp: 1, subject: '', body: '', delayDays: 0, ctaText: '' },
      { stepp: 2, subject: '', body: '', delayDays: 0, ctaText: '' },
      { stepp: 3, subject: '', body: '', delayDays: 0, ctaText: '' },
      { stepp: 4, subject: '', body: '', delayDays: 0, ctaText: '' },
      { stepp: 5, subject: '', body: '', delayDays: 0, ctaText: '' },
    ];
  }

  // Sørg for at window.mailSettings finnes
  if (!Array.isArray(window.mailSettings)) {
    window.mailSettings = defaultMailSettings();
  }

  // Hent DOM-rutenett for et gitt step
  function getRowEls(step){
    const row = document.querySelector(`${appSel} .ef2-row[data-step="${step}"]`);
    if (!row) return {};
    return {
      row,
      subject: row.querySelector('[data-role="subject"]'),
      delay:   row.querySelector('[data-role="delay"]'),
      cta:     row.querySelector('[data-role="cta"]'),
      editor:  row.querySelector('[data-role="html"]'),
    };
  }

  // Init Quill for alle fem editorer
  function initEditors(){
    [1,2,3,4,5].forEach(step => {
      const { editor } = getRowEls(step);
      if (!editor) return;
      const q = new Quill(editor, {
        theme: 'snow',
        placeholder: 'Skriv e-postinnhold (HTML) …',
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
      quills.set(step, q);

      // Live sync til window.mailSettings
      q.on('text-change', () => {
        const html = q.root.innerHTML;
        upsertStep(step, { body: html });
      });
    });
  }

  // Fyll inputs fra window.mailSettings
  function paintUIFromSettings(){
    const settings = window.mailSettings || [];
    settings.forEach(s => {
      const step = clampInt(s.stepp, 1);
      const { subject, delay, cta } = getRowEls(step);
      if (subject) subject.value = String(s.subject ?? '');
      if (delay)   delay.value   = clampInt(s.delayDays ?? 0);
      if (cta)     cta.value     = String(s.ctaText ?? '');

      const q = quills.get(step);
      if (q) q.root.innerHTML = cleanHtml(s.body ?? '');
    });
  }

  // Oppdater ett steg i window.mailSettings + normaliser sortering
  function upsertStep(step, patch){
    const arr = Array.isArray(window.mailSettings) ? window.mailSettings.slice() : defaultMailSettings();
    const idx = arr.findIndex(x => +x.stepp === +step);
    const base = idx >= 0 ? arr[idx] : { stepp: step, subject:'', body:'', delayDays:0, ctaText:'' };
    const next = { ...base, ...patch, stepp: step };

    if (idx >= 0) arr[idx] = next; else arr.push(next);
    arr.sort(by('stepp'));
    window.mailSettings = arr;
    // console.log('mailSettings (live):', window.mailSettings);
  }

  // Koble lyttere til inputs så alt syncer til mailSettings
  function wireInputs(){
    [1,2,3,4,5].forEach(step => {
      const { subject, delay, cta } = getRowEls(step);
      if (subject) subject.addEventListener('input',  () => upsertStep(step, { subject: subject.value }));
      if (delay)   delay.addEventListener('input',    () => upsertStep(step, { delayDays: clampInt(delay.value, 0) }));
      if (cta)     cta.addEventListener('input',      () => upsertStep(step, { ctaText: cta.value }));
    });
  }

  // --- Public: ta inn Airtable-respons, fyll UI + settings ---
  // Forventer et objekt { data: [ …records… ] } som i eksempelet ditt
  function emailLoopsResponse(resp){
    try {
      const rows = Array.isArray(resp?.data) ? resp.data : [];
      // Map hvert record -> internt step-objekt
      const mapped = rows.map(r => {
        const f = r?.fields || r?._rawJson?.fields || {};
        // Step Number eller number
        const step = clampInt(pick(f, 'Step Number', pick(f, 'number', 0)), 1);
        const subject = String(pick(f, 'Subject', ''));
        const body    = cleanHtml(pick(f, 'Body HTML', ''));
        const cta     = String(pick(f, 'CTA Text', ''));
        const delay   = clampInt(pick(f, 'Delay', 0), 0);
        const unit    = String(pick(f, 'Delay Unit', 'days') || 'days').toLowerCase();
        // Holde oss til delay i dager (om noen har timer el.l., kan du konvertere her)
        const delayDays = unit === 'days' ? delay : delay; // ev. konverter
        return { stepp: step, subject, body, delayDays, ctaText: cta };
      });

      // Slå inn i settings (bevarer evt. “hull” ved å fylle default)
      const base = defaultMailSettings();
      mapped.forEach(m => {
        const i = base.findIndex(x => +x.stepp === +m.stepp);
        if (i >= 0) base[i] = { ...base[i], ...m };
      });
      base.sort(by('stepp'));
      window.mailSettings = base;

      // Render til UI
      paintUIFromSettings();

      // Done
      console.log('emailLoopsResponse → mailSettings', window.mailSettings);
    } catch (err) {
      console.error('emailLoopsResponse error:', err);
    }
  }

  // --- Public: hvis du vil sette settings manuelt og male UI
  function ef2InitFromSettings(settings){
    if (Array.isArray(settings) && settings.length) {
      // Normaliser, behold bare stepp 1..5
      const base = defaultMailSettings();
      settings.forEach(s => {
        const step = clampInt(s.stepp, 1);
        if (step>=1 && step<=5){
          const i = base.findIndex(x => +x.stepp === +step);
          base[i] = {
            stepp: step,
            subject: String(s.subject ?? ''),
            body: cleanHtml(s.body ?? ''),
            delayDays: clampInt(s.delayDays ?? 0, 0),
            ctaText: String(s.ctaText ?? '')
          };
        }
      });
      base.sort(by('stepp'));
      window.mailSettings = base;
      paintUIFromSettings();
    }
  }

  // Init når DOM finnes
  function boot(){
    const app = document.querySelector(appSel);
    if (!app) return;
    initEditors();
    wireInputs();
    // Start med eksisterende window.mailSettings om den finnes
    paintUIFromSettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Eksponer
  window.emailLoopsResponse = emailLoopsResponse;
  window.ef2InitFromSettings = ef2InitFromSettings;
})();

