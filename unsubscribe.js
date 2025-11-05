
(function(){
  // --- KONFIGURASJON --------------------------------------------------------
  const API_BASE = 'https://airtable-time-runner.vercel.app'; // endre om du bruker eget domene
  const REASONS = [
    'Ikke relevant for vår bedrift',
    'Kjøper ikke inn varer nå',
    'Har allerede en avtale',
    'Ønsker ikke å bli kontaktet',
    'Feilsendt / ikke riktig kontakt',
    'Annet …' // når denne velges kan bruker skrive fritekst i #reasonOther (valgfritt felt)
  ];
  const DEFAULT_REASON_FALLBACK = 'clicked unsubscribe button';

  // --- HENT ELEMENTER -------------------------------------------------------
  const btn = document.getElementById('unsubButton');
  const sel = document.getElementById('reasonSelector');
  if (!btn || !sel) return; // ingenting å gjøre

  const otherInput = document.getElementById('reasonOther'); // valgfritt: fritekstfelt
  const feedbackEl = document.getElementById('unsubFeedback'); // valgfritt: <div id="unsubFeedback"></div>

  // --- POPULER SELECTOR -----------------------------------------------------
  // tøm først (hvis CMS/bygger har lagt inn noe)
  sel.innerHTML = '';
  // legg inn placeholder
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = '— Velg grunn —';
  ph.disabled = true;
  ph.selected = true;
  sel.appendChild(ph);
  // legg inn faktiske grunner
  for (const txt of REASONS) {
    const opt = document.createElement('option');
    opt.value = txt;
    opt.textContent = txt;
    sel.appendChild(opt);
  }

  // --- LES rid FRA URL ------------------------------------------------------
  const params = new URLSearchParams(location.search);
  const rid = params.get('rid');

  if (!rid) {
    console.warn('Mangler rid i URL – kan ikke avmelde.');
    btn.disabled = true;
    safeFeedback('Mangler referanse-ID. Vennligst åpne lenken fra e-posten på nytt.', 'error');
    return;
  }

  // --- VIS/SKJUL "annet"-input ----------------------------------------------
  function updateOtherVisibility() {
    if (!otherInput) return;
    const v = sel.value || '';
    const show = v.toLowerCase().startsWith('annet');
    otherInput.style.display = show ? '' : 'none';
    if (!show) otherInput.value = '';
  }
  sel.addEventListener('change', updateOtherVisibility);
  updateOtherVisibility();

  // --- HJELPERE --------------------------------------------------------------
  function safeFeedback(msg, type='info') {
    if (!feedbackEl) return;
    feedbackEl.textContent = msg;
    feedbackEl.style.marginTop = '12px';
    feedbackEl.style.fontWeight = '600';
    feedbackEl.style.fontSize = '14px';
    feedbackEl.style.color =
      type === 'success' ? '#16a34a' :
      type === 'error'   ? '#ef4444' :
                           '#94a3b8';
  }

  async function unsubscribe({ rid, reason }) {
    const r = await fetch(`${API_BASE}/api/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rid, reason })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${r.status}`);
    }
    return data; // { ok:true, rid, customerId, stoppedCount }
  }

  // --- HANDLER --------------------------------------------------------------
  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Stopper utsendelser…';

    // finn grunn (med fallback)
    let reason = sel.value || '';
    if (reason.toLowerCase().startsWith('annet') && otherInput && otherInput.value.trim()) {
      reason = `Other: ${otherInput.value.trim()}`;
    }
    if (!reason) reason = DEFAULT_REASON_FALLBACK;

    try {
      const data = await unsubscribe({ rid, reason });
      btn.textContent = 'Avmelding registrert ✔';
      safeFeedback(`Vi har stoppet ${data.stoppedCount ?? 0} planlagte eposter for denne kunden.`, 'success');
    } catch (e) {
      console.error(e);
      btn.textContent = original;
      btn.disabled = false;
      busy = false;
      safeFeedback('Beklager – klarte ikke å registrere avmelding. Prøv igjen.', 'error');
      alert('Beklager – klarte ikke å registrere avmelding. Prøv igjen.');
    }
  });
})();




