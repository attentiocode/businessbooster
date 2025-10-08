

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

const elPeriod = document.getElementById('brregPeriod');
const elFrom   = document.getElementById('brregFrom');
const elTo     = document.getElementById('brregTo');
const elQuery  = document.getElementById('brregQuery');
const elSearch = document.getElementById('brregSearch');
const elReset  = document.getElementById('brregReset');
const elStatus = document.getElementById('brregStatus');

// Default: Denne uken
(function initDefaults(){
  const r = rangeFor('this_week');
  elPeriod.value = 'this_week';
  elFrom.value = r.fra; elTo.value = r.til;
  elFrom.disabled = false; elTo.disabled = false;
})();

function setDatesDisabled(disabled) {
  elFrom.disabled = disabled;
  elTo.disabled   = disabled;
  if (disabled) { elFrom.value = ''; elTo.value = ''; }
}

elPeriod.addEventListener('change', () => {
  if (elPeriod.value === 'none') { // Ingen dato
    setDatesDisabled(true);
    return;
  }
  setDatesDisabled(false);
  if (elPeriod.value === 'custom') return;
  const r = rangeFor(elPeriod.value);
  elFrom.value = r.fra; elTo.value = r.til;
});

/* ---------- Henter fra Brønnøysund (med paginering) ---------- */

// Hent på orgnr direkte (eksakt treff)
async function hentPåOrgnr(orgnr) {
    const url = `https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}`;
    const res = await fetch(url, { headers: {Accept:'application/json'} });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Feil fra BRREG: ${res.status}`);
    const enhet = await res.json();
    return enhet && enhet.organisasjonsnummer ? [enhet] : [];
}

// Hent på navn (paginert)
async function hentPåNavn(navn, { size = 200 } = {}) {
    const base = 'https://data.brreg.no/enhetsregisteret/api/enheter';
    const alle = [];
    let page = 0;
  
    while (true) {
      const url = new URL(base);
      url.searchParams.set('navn', navn);              // <-- navn-søk
      url.searchParams.set('size', String(size));
      url.searchParams.set('page', String(page));
      url.searchParams.set('sort', 'navn,ASC');
  
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
      if (alle.length >= 9500 || page > 2000) break;
    }
    return alle;
}


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
      const period = elPeriod.value;
      const qRaw   = (elQuery.value || '').trim();
      const qLower = qRaw.toLowerCase();
      const isOrgnr = /^\d{6,}$/.test(qRaw); // enkel deteksjon
  
      elStatus.textContent = 'Søker…';
      elSearch.disabled = true;
  
      let data = [];
  
      if (period === 'none') {
        // Ingen dato → må ha noe å søke på
        if (!qRaw) { alert('Skriv navn eller org.nr. når du velger «Ingen dato».'); elStatus.textContent = 'Klar.'; return; }
        data = isOrgnr ? await hentPåOrgnr(qRaw) : await hentPåNavn(qRaw);
      } else {
        // Dato-søk (som før)
        const fra = elFrom.value;
        const til = elTo.value;
        if (!fra || !til) { alert('Velg fra- og tildato.'); elStatus.textContent = 'Klar.'; return; }
  
        data = await hentNystartedeIPeriode({ fra, til });
  
        // Valgfri ekstra lokal filtrering på tekst (for å snevre inn)
        if (qRaw) {
          data = data.filter(b => {
            const org = String(b.organisasjonsnummer || '');
            const navn = String(b.navn || '').toLowerCase();
            const adrObj = b.forretningsadresse || b.postadresse || {};
            const adr = Array.isArray(adrObj.adresse) ? adrObj.adresse.join(', ') : (adrObj.adresse || '');
            const postnr = String(adrObj.postnummer || '');
            const poststed = String(adrObj.poststed || '').toLowerCase();
  
            if (isOrgnr) return org.includes(qRaw);
            return (
              navn.includes(qLower) ||
              org.includes(qRaw) ||
              String(adr).toLowerCase().includes(qLower) ||
              postnr.includes(qRaw) ||
              poststed.includes(qLower)
            );
          });
        }
      }
  
      // Lagre og vis
      gBrregbedrifter = data;
      if (typeof startBrregList === 'function') startBrregList(data);
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

function resetFilters() {
    elQuery.value = '';
    elPeriod.value = 'this_week';
    const r = rangeFor('this_week');
    elFrom.value = r.fra; elTo.value = r.til;
    setDatesDisabled(false);
    elStatus.textContent = 'Klar.';
  }