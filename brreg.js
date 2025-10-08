

/* ---------- Datohjelp ---------- */
function pad(n){return String(n).padStart(2,'0')}
function d2str(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function startOfWeek(d){
  const dt=new Date(d); const day=(dt.getDay()+6)%7; // mandag=0
  dt.setDate(dt.getDate()-day); dt.setHours(0,0,0,0); return dt;
}
function endOfWeek(d){
  const s=startOfWeek(d); const e=new Date(s); e.setDate(e.getDate()+6); return e;
}
function rangeFor(period){
  const now=new Date(); now.setHours(0,0,0,0);
  let from=now, to=now;
  if(period==='today'){ from=now; to=now; }
  else if(period==='this_week'){ from=startOfWeek(now); to=endOfWeek(now); }
  else if(period==='last_week'){ const s=startOfWeek(now); s.setDate(s.getDate()-7); const e=new Date(s); e.setDate(e.getDate()+6); from=s; to=e; }
  else if(period==='this_month'){ const s=new Date(now.getFullYear(),now.getMonth(),1); const e=new Date(now.getFullYear(),now.getMonth()+1,0); from=s; to=e; }
  else if(period==='last_month'){ const s=new Date(now.getFullYear(),now.getMonth()-1,1); const e=new Date(now.getFullYear(),now.getMonth(),0); from=s; to=e; }
  else if(period==='last_7'){ const s=new Date(now); s.setDate(s.getDate()-6); from=s; to=now; }
  else if(period==='last_30'){ const s=new Date(now); s.setDate(s.getDate()-29); from=s; to=now; }
  else { /* custom -> behold inputs */ }
  return { fra: d2str(from), til: d2str(to) };
}

/* ---------- UI wiring ---------- */
const elPeriod = document.getElementById('brregPeriod');
const elFrom   = document.getElementById('brregFrom');
const elTo     = document.getElementById('brregTo');
const elQuery  = document.getElementById('brregQuery');
const elSearch = document.getElementById('brregSearch');
const elReset  = document.getElementById('brregReset');
const elStatus = document.getElementById('brregStatus');

// Sett default til "Denne uken"
(function initDefaults(){
  const r = rangeFor('this_week');
  elPeriod.value = 'this_week';
  elFrom.value = r.fra;
  elTo.value   = r.til;
})();

// Når periode endres, fyll datoer (unntatt custom)
elPeriod.addEventListener('change', () => {
  if (elPeriod.value === 'custom') return;
  const r = rangeFor(elPeriod.value);
  elFrom.value = r.fra;
  elTo.value   = r.til;
});

/* ---------- Henter fra Brønnøysund (med paginering) ---------- */
async function hentNystartedeIPeriode({ fra, til, size = 200 }) {
  const base = 'https://data.brreg.no/enhetsregisteret/api/enheter';
  const alle = [];
  let page = 0;

  while (true) {
    const url = new URL(base);
    url.searchParams.set('fraRegistreringsdatoEnhetsregisteret', fra);
    url.searchParams.set('tilRegistreringsdatoEnhetsregisteret', til);
    url.searchParams.set('size', String(size));
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'registreringsdatoEnhetsregisteret,DESC');

    const res = await fetch(url.href, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Feil fra BRREG: ${res.status}`);

    const data = await res.json();
    const batch = data?._embedded?.enheter ?? [];
    alle.push(...batch);

    const hasNext = Boolean(data?._links?.next?.href);
    const totalPages = data?.page?.totalPages;

    if (batch.length === 0) break;
    if (totalPages != null && page + 1 >= totalPages) break;
    if (!hasNext) break;

    page++;
    if (alle.length >= 9500 || page > 2000) break; // failsafes
  }

  return alle;
}

/* ---------- Søkekommando ---------- */
async function runBrregSearch() {
  try {
    const fra = elFrom.value;
    const til = elTo.value;
    if (!fra || !til) { alert('Velg fra- og tildato.'); return; }

    const q  = (elQuery.value || '').trim();
    const isOrgnr = /^\d{6,}$/.test(q); // enkel test

    elStatus.textContent = 'Henter fra Brønnøysund …';
    elSearch.disabled = true;

    // 1) Hent etter dato
    let data = await hentNystartedeIPeriode({ fra, til });

    // 2) Tekstfilter lokalt (robust mot API-oppførsel)
    if (q) {
      const ql = q.toLowerCase();
      data = data.filter(b => {
        const org = String(b.organisasjonsnummer || '');
        const navn = String(b.navn || '').toLowerCase();
        const adrObj = b.forretningsadresse || b.postadresse || {};
        const adr = Array.isArray(adrObj.adresse) ? adrObj.adresse.join(', ') : (adrObj.adresse || '');
        const postnr = String(adrObj.postnummer || '');
        const poststed = String(adrObj.poststed || '').toLowerCase();

        if (isOrgnr) return org.includes(q);
        return (
          navn.includes(ql) ||
          org.includes(q) ||
          String(adr).toLowerCase().includes(ql) ||
          postnr.includes(q) ||
          poststed.includes(ql)
        );
      });
    }

    // 3) Lagre globalt + kall din visningsfunksjon
    gBrregbedrifter = data;
    startBrregList(gBrregbedrifter);

    elStatus.textContent = `Ferdig: ${data.length} treff.`;
  } catch (err) {
    console.error(err);
    elStatus.textContent = `Feil: ${err.message || err}`;
    alert(elStatus.textContent);
  } finally {
    elSearch.disabled = false;
  }
}

/* ---------- Nullstill ---------- */
function resetFilters() {
  const r = rangeFor('this_week');
  elPeriod.value = 'this_week';
  elFrom.value = r.fra;
  elTo.value   = r.til;
  elQuery.value = '';
  elStatus.textContent = 'Klar.';
}

// Knapper
elSearch.addEventListener('click', runBrregSearch);
elReset .addEventListener('click', resetFilters);

// (valgfritt) Enter i søk feltet
elQuery.addEventListener('keydown', (e) => { if (e.key === 'Enter') runBrregSearch(); });

