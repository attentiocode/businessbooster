(function () {
  const btn = document.getElementById('acceptButton');
  if (!btn) return;

  const params = new URLSearchParams(location.search);
  const rid = params.get('rid');

  if (!rid) {
    console.warn('Mangler rid i URL – kan ikke registrere aksept.');
    return;
  }

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
      // ev. vis en “takk”-melding eller redirect
    } catch (e) {
      console.error(e);
      btn.textContent = original;
      btn.disabled = false;
      busy = false;
      alert('Kunne ikke registrere aksept. Prøv igjen.');
    }
  });
})();

