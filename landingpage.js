(function () {
  const btn = document.getElementById('acceptButton');
  const infoEl = document.getElementById('infoText');
  if (!btn) return;

  const params = new URLSearchParams(location.search);
  const rid = params.get('rid');

  if (!rid) {
    console.warn('Mangler rid i URL – kan ikke registrere aksept.');
    if (infoEl) infoEl.textContent = 'Mangler referanse – åpne lenken fra e-posten på nytt.';
    return;
  }

  async function loadCompany() {
    try {
      const api = `https://airtable-time-runner.vercel.app/api/company-info?rid=${encodeURIComponent(rid)}`;
      const r = await fetch(api, { method: 'GET' });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);

      const name = data.company?.name || 'din bedrift';
      const org  = data.company?.orgnr ? ` (org.nr ${data.company.orgnr})` : '';

      if (infoEl) {
        infoEl.style.display = 'block';
        infoEl.innerHTML = `
          <h2 style="font-size:30px;margin-bottom:8px;">Velkommen, ${name}!</h2>
          <p style="color:#94a3b8;">${org ? org : ''}</p>
        `;
      }
    } catch (e) {
      console.error('Kunne ikke hente bedriftsinfo:', e);
      if (infoEl) infoEl.textContent = 'Velkommen!';
    }
  }
  loadCompany();

  // Accept-knappen (samme logikk som før)
  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Lagrer …';

    try {
      const r = await fetch('https://airtable-time-runner.vercel.app/api/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rid })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) throw new Error(data.error || 'Ukjent feil');

      btn.textContent = 'Akseptert ✔';

      const infoTextOverButton = document.getElementById('infoTextOverButton');
      if (infoTextOverButton) {
        infoTextOverButton.innerHTML = `
          <h2>Takk for bekreftelsen!</h2>
          <p>Vi har registrert at dere ønsker å prøve Innkjøps-gruppen. En representant vil kontakte dere snart.</p>
        `;
      }
    } catch (e) {
      console.error(e);
      btn.textContent = original;
      btn.disabled = false;
      busy = false;
      alert('Kunne ikke registrere aksept. Prøv igjen.');
    }
  });
})();

