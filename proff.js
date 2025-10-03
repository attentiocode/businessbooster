const API_BASE = 'https://boosterapi.vercel.app'; // flytt til .env ved behov

export async function fetchCompanyEnriched(orgnr, { signal } = {}) {
  if (!ORGNR_RE.test(orgnr)) throw new Error(`Ugyldig orgnr: ${orgnr}`);
  const res = await fetch(`${API_BASE}/api/proff/company/enrich/${orgnr}`, {
    headers: { accept: 'application/json' },
    signal,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json.shaped;
}
const ORGNR_RE = /^\d{9}$/;

/**
 * Hent flere orgnr i parallell, med begrenset samtidighet.
 * @param {string[]|string} input  Liste med orgnr eller kommaseparert streng
 * @param {{concurrency?:number, signal?:AbortSignal}} opts
 * @returns {Promise<Array<{orgnr:string, ok:boolean, data?:any, error?:string}>>}
 */
export async function fetchCompanyEnrichedMany(input, { concurrency = 4, signal } = {}) {
  // Støtt både array og "830...,974...,9..." som streng
  const arr = Array.isArray(input)
    ? input
    : String(input)
        .split(/[,\s]+/)
        .filter(Boolean);

  // Rens, valider og dedupliser
  const wanted = [...new Set(arr.map(s => (s || '').replace(/\D/g, '')))]
    .filter(s => s.length) // behold tom-filtering
    .slice(0); // kopi

  // Enkel kø med N samtidige jobber
  const results = [];
  let index = 0;

  async function worker() {
    while (index < wanted.length) {
      const i = index++;
      const orgnr = wanted[i];
      if (!ORGNR_RE.test(orgnr)) {
        results[i] = { orgnr, ok: false, error: 'Ugyldig orgnr (må være 9 siffer)' };
        continue;
      }
      try {
        const data = await fetchCompanyEnriched(orgnr, { signal });
        results[i] = { orgnr, ok: true, data };
      } catch (err) {
        results[i] = { orgnr, ok: false, error: err?.message || String(err) };
      }
    }
  }

  // Start workere
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, wanted.length)) }, worker);
  await Promise.all(workers);

  return results;
}


// Forutsetter at du allerede har fetchCompanyEnriched(orgnr)
// fra tidligere forslag. Hvis ikke: bytt ut kallet i funksjonen
// med en direkte fetch til /api/proff/company/enrich/:orgnr.

export async function logCompanyOnce(orgnr) {
    try {
      console.time(`[proff] ${orgnr}`);
      const data = await fetchCompanyEnriched(orgnr);
      console.groupCollapsed(`[proff] ${orgnr} – ${data?.name ?? 'Ukjent'}`);
      console.log('Full response:', data);
      console.table?.([
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
      console.timeEnd(`[proff] ${orgnr}`);
    } catch (err) {
      console.error(`[proff] ${orgnr} – FEIL:`, err?.message || err);
    }
  }
  