(() => {
  const STEPS = 5;
  const LEGACY_MAP = [1, 2, 3, 4, 5];

  // Hent eventuelle globale defaults (subject1, emailbody1, actiontext1, delaydays1)
  const g = (k) => (typeof window[k] !== 'undefined' ? window[k] : '');
  const defaultFromGlobals = (i) => ({
    stepp: LEGACY_MAP[i - 1],
    subject: g('subject' + i) || '',
    body: g('emailbody' + i) || '',
    ctaText: g('actiontext' + i) || '',
    delayDays: Number(g('delaydays' + i)) || 0
  });

  const normalize = (arr) => {
    const base = Array.from({ length: STEPS }, (_, ix) => defaultFromGlobals(ix + 1));
    if (!Array.isArray(arr)) return base;
    arr.forEach(it => {
      const idx = LEGACY_MAP.indexOf(Number(it.stepp));
      if (idx >= 0) {
        base[idx] = {
          stepp: LEGACY_MAP[idx],
          subject: String(it.subject ?? ''),
          body: String(it.body ?? ''),
          ctaText: String(it.ctaText ?? ''),
          delayDays: Number(it.delayDays ?? 0)
        };
      }
    });
    return base;
  };

  // Opprett eller behold eksisterende mailSettings
  window.mailSettings = normalize(window.mailSettings);

  const $list = document.getElementById('mf-list');

  function render() {
    $list.innerHTML = '';
    window.mailSettings.forEach((row, i) => {
      const step = i + 1;
      const card = document.createElement('div');
      card.className = 'mf-card';
      card.innerHTML = `
        <div class="mf-row">
          <div class="mf-step">${step}</div>
          <div class="mf-fields">
            <div class="mf-row-2">
              <label class="mf-field">
                <span class="mf-label">Emne</span>
                <input class="mf-input" data-role="subject" value="${esc(row.subject)}" placeholder="Emne for e-post #${step}">
              </label>
              <label class="mf-field">
                <span class="mf-label">CTA-tekst</span>
                <input class="mf-input" data-role="cta" value="${esc(row.ctaText || '')}" placeholder="F.eks. Bestill samtale">
              </label>
              <label class="mf-field">
                <span class="mf-label">Forsinkelse (dager)</span>
                <input class="mf-number" type="number" min="0" step="1" data-role="delay" value="${Number(row.delayDays) || 0}">
              </label>
            </div>
            <label class="mf-field">
              <span class="mf-label">Brødtekst</span>
              <textarea class="mf-textarea" data-role="body" placeholder="Innhold for e-post #${step}…">${esc(row.body)}</textarea>
            </label>
          </div>
        </div>
      `;

      // Live oppdatering av mailSettings
      card.querySelector('[data-role="subject"]').addEventListener('input', (e) => {
        window.mailSettings[i].subject = e.target.value;
      });
      card.querySelector('[data-role="cta"]').addEventListener('input', (e) => {
        window.mailSettings[i].ctaText = e.target.value;
      });
      card.querySelector('[data-role="delay"]').addEventListener('input', (e) => {
        window.mailSettings[i].delayDays = Math.max(0, Number(e.target.value) || 0);
      });
      card.querySelector('[data-role="body"]').addEventListener('input', (e) => {
        window.mailSettings[i].body = e.target.value;
      });

      $list.appendChild(card);
    });
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  render();
})();
