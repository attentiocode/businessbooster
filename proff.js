// Justér til ditt domene hvis frontenden kjører et annet sted:
const API_BASE = 'https://boosterapi.vercel.app';

/**
 * Logger ett selskap fra Proff-API via din boosterapi-backend.
 * Bruk: logCompanyOnce('830068872')
 */
async function logCompanyOnce(orgnr,returnid) {
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
    console.timeEnd(`[proff] ${clean}`);
    ruteresponse(data,returnid);
  } catch (err) {
    console.error(`[proff] ${orgnr} – FEIL:`, err?.message || err);
    throw err;
  }
}

function dataFromProff(data){
    console.log(data);
}