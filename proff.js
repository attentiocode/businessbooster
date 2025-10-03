// Justér til ditt domene hvis frontenden kjører et annet sted:
const API_BASE = 'https://boosterapi.vercel.app';

/**
 * Logger ett selskap fra Proff-API via din boosterapi-backend.
 * Bruk: logCompanyOnce('830068872')
 */
async function logCompanyOnce(orgnr) {
  try {
    const clean = String(orgnr).replace(/\D/g, '');
    if (!/^\d{9}$/.test(clean)) throw new Error('Ugyldig orgnr (må være 9 siffer)');

    console.time(`[proff] ${clean}`);
    const res = await fetch(`${API_BASE}/api/proff/company/enrich/${encodeURIComponent(clean)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json().catch(() => ({}));
    if (!json?.ok) throw new Error(json?.error || 'Ukjent API-feil');

    // Endepunktet ditt returnerer { ok, source, data, shaped }
    const data = json.shaped ?? json.data ?? json;

    console.groupCollapsed(`[proff] ${clean} – ${data?.name ?? 'Ukjent'}`);
    console.log('Full response:', data);
    (console.table ?? console.log)([
      { key: 'orgnr', value: data?.orgnr },
      { key: 'name', value: data?.name },
      { key: 'status', value: data?.status },
      { key: 'employees', value: data?.employees },
      { key: 'homepage', value: data?.contact?.homepage ?? null },
      { key: 'email', value: data?.contact?.email ?? null },
      { key: 'phone', value: data?.contact?.phone ?? null },
      { key: 'dagligLeder', value: data?.contact?.dagligLeder?.name ?? null },
    ]);
    console.groupEnd();
    console.timeEnd(`[proff] ${clean}`);

    return data; // nyttig hvis du vil bruke resultatet videre
  } catch (err) {
    console.error(`[proff] ${orgnr} – FEIL:`, err?.message || err);
    throw err;
  }
}
