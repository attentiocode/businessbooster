(function(){
  const btn = document.getElementById('unsubButton');
  if (!btn) return;

  const params = new URLSearchParams(location.search);
  const rid = params.get('rid');   // record-id fra epost-lenken
  const reason = params.get('reason') || ''; // valgfritt, hvis du vil sende med

  if (!rid) {
    console.warn('Mangler rid i URL – kan ikke avmelde.');
    btn.disabled = true;
    return;
  }

  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Stopper utsendelser…';

    try {
      const r = await fetch('https://airtable-time-runner.vercel.app/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rid, reason })
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data.ok) throw new Error(data.error || 'Ukjent feil');

      // Suksess: vis kort bekreftelse
      btn.textContent = 'Avmelding registrert ✔';
      const msg = document.createElement('div');
      msg.style.marginTop = '12px';
      msg.style.color = '#16a34a';
      msg.style.fontWeight = '600';
      msg.textContent = `Vi har stoppet ${data.stoppedCount ?? 0} planlagte eposter for denne kunden.`;
      btn.insertAdjacentElement('afterend', msg);
    } catch (e) {
      console.error(e);
      alert('Beklager – klarte ikke å registrere avmelding. Prøv igjen.');
      btn.textContent = originalText;
      btn.disabled = false;
      busy = false;
    }
  });
})();

