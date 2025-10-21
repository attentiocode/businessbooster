

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


function startBrregList(data) {
    const list = document.getElementById('rowlist');
    const presetName = document.getElementById('select-field-preset')?.value;
  
    // 📦 1. Hent valgt preset
    const presets = JSON.parse(localStorage.getItem('industryPresets') || '{}');
    const preset = presets[presetName] || null;
  
    // 🎯 2. Filtrer data
    let filteredData = data;
    if (preset) {
      const { industries = [], dateFrom, dateTo } = preset;
      filteredData = data.filter((item) => {
        let include = true;
        if (industries.length > 0) {
          const itemIndustry =
            (item.naeringskode1?.beskrivelse || '').toLowerCase() ||
            (item.bransje || '').toLowerCase();
          include = industries.some(ind => itemIndustry.includes(ind.toLowerCase())) || false;
        }
        if (include && (dateFrom || dateTo)) {
          const regDate = new Date(item.registreringsdatoEnhetsregisteret);
          if (dateFrom) include = regDate >= new Date(dateFrom);
          if (dateTo) include = include && regDate <= new Date(dateTo);
        }
        return include;
      });
    }

  
    // 🔢 3. Sorter
    filteredData.sort((a, b) => {
      const dateA = new Date(a.registreringsdatoEnhetsregisteret);
      const dateB = new Date(b.registreringsdatoEnhetsregisteret);
      if (dateA < dateB) return 1;
      if (dateA > dateB) return -1;
      return a.navn.toUpperCase().localeCompare(b.navn.toUpperCase());
    });

    // Ekstra sortering basert på søkestreng
    const query = elQuery.value.trim().toLowerCase();
    if (query) {
      filteredData.sort((a, b) => {
        const nameA = a.navn.toLowerCase();
        const nameB = b.navn.toLowerCase();
    
        // Fjern "as", "asa" etc. fra slutten for å tillate litt fleksibilitet
        const normalize = (str) => str.replace(/\b(as|asa)\b\.?/g, "").trim();
    
        const normA = normalize(nameA);
        const normB = normalize(nameB);
        const normQuery = normalize(query);
    
        const aExact = normA === normQuery;
        const bExact = normB === normQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
    
        const aStarts = normA.startsWith(normQuery);
        const bStarts = normB.startsWith(normQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
    
        return 0;
      });
    }
    
  
    // 🧹 4. Rendre tabell
    list.innerHTML = '';
    
    let sumTotal = filteredData.length || 0;
    let sumInPortal = 0;
    let sumSelected = 0;
  
    filteredData.forEach((rawItem) => {
      const tr = document.createElement('tr');
      tr.classList.add('default-row');
    
      // --- Hjelpere ---
      const normalizeOrgnr = (v) => String(v ?? '').replace(/\D/g, '').padStart(9, '0');
      const getOrgnr = (obj) =>
        normalizeOrgnr(
          obj?.organisasjonsnummer ??
          obj?.orgnr ?? obj?.orgNr ?? obj?.OrganizationNumber
        );
    
      let item = rawItem;
    
      const isInPortal = (gCustomers || []).some(
        (c) => getOrgnr(c) === getOrgnr(item)
      );
    
      const alreadySelected = (gSelectbedrifter || []).find(
        (b) => getOrgnr(b) === getOrgnr(item)
      );
    
      // --- Prioritet: Portal > Utvalg ---
      let g = null;
      if (isInPortal) {
        sumInPortal++;
        tr.classList.add('inportal');
      } else if (alreadySelected) {
        sumSelected++;
        tr.classList.add('selected');
        item = alreadySelected; // vis data fra utvalg
        g = (gGroupbedrifter || []).find((gr) => gr.id == item.group);
      }
    
      const fmtDate = (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        return isNaN(dt) ? d : dt.toLocaleDateString('no-NO');
      };
    
      const adresse = item.forretningsadresse
        ? `${Array.isArray(item.forretningsadresse.adresse)
            ? item.forretningsadresse.adresse.join(', ')
            : (item.forretningsadresse.adresse || '')}, ${item.forretningsadresse?.postnummer || ''} ${item.forretningsadresse?.poststed || ''}`
            .replace(/^,\s*|\s*,\s*$/g, '')
            .trim() || '—'
        : '—';
    
      const checkboxAttrs = (alreadySelected || isInPortal) ? 'disabled checked' : '';
    
      const statusHtml = isInPortal
        ? `<strong>Er registrert i portal</strong>`
        : (alreadySelected
            ? `<strong>Utvalg</strong><span style="opacity:0.8;">${g?.name ? ` - ${g.name}` : ''}</span>`
            : 'Brreg');
    
      tr.innerHTML = `
        <td style="width:40px;">
          <input
            type="checkbox"
            class="selectcheckbox"
            data-orgnr="${item.organisasjonsnummer || ''}"
            ${checkboxAttrs}
          />
        </td>
        <td class="mono" style="font-size:11px;">${item.organisasjonsnummer ?? '—'}</td>
        <td style="font-weight:700;font-size:12px;">${item.navn ?? '—'}</td>
        <td style="font-size:11px;">${adresse}</td>
        <td style="font-size:11px;">${fmtDate(item.registreringsdatoEnhetsregisteret || item.registreringsdatoForetaksregisteret)}</td>
        <td class="status" style="font-size:10px;">
          ${statusHtml}
        </td>
      `;
    
      list.appendChild(tr);
    });

    // Oppdater total-teller
    updateBrregCounter(sumTotal, sumInPortal, sumSelected, preset);
    
    // 🧮 5. Massebehandling UI + handlers (BRREG)
    const bulkBar   = document.getElementById('select-bulk-actions-brreg');
    const bulkCount = document.getElementById('select-bulk-count-brreg');
  
    function getSelectedOrgnrs() {
      return Array.from(list.querySelectorAll('.selectcheckbox'))
        .filter(cb => cb.checked && !cb.disabled) // tell kun aktive
        .map(cb => cb.dataset.orgnr)
        .filter(Boolean);
    }
  
    function updateBulkUI() {
      const n = getSelectedOrgnrs().length;
      if (bulkBar)   bulkBar.style.display = n > 0 ? 'flex' : 'none';
      if (bulkCount) bulkCount.textContent = `${n} valgt`;
      // (valgfritt) oppdater også et eksisterende tellerfelt hvis du har det:
      const counterSelected = document.getElementById('counterlistbrregselect');
      if (counterSelected) {
        counterSelected.textContent = `${n} valgt`;
        counterSelected.style.display = n > 0 ? 'block' : 'none';
      }
    }
  
    // Lytt på endringer i alle (ikke-disablede) checkbokser
    list.querySelectorAll('.selectcheckbox').forEach(cb => {
      if (!cb.disabled) cb.addEventListener('change', updateBulkUI);
    });
    updateBulkUI();
  
    
}

document.getElementById("brregmastercheckbox").addEventListener("change", function() {
    const container = document.getElementById("rowlist");
    const checkboxes = container.querySelectorAll(".selectcheckbox")
    checkboxes.forEach(cb => {
      // kun de som ikke er disabled
      if (!cb.disabled){
      cb.checked = this.checked;
      }
    });

    //hvis det er mer en 1 checkbox som er valgt så gjør maassbehandling synlig
    const bulkBar   = document.getElementById('select-bulk-actions-brreg');
    //linjen under bør få tak i alle selectedchexbox også filtrere vekk disabled chackboxer
    const checkboxesChecked = container.querySelectorAll(".selectcheckbox:checked:not([disabled])");

    if (checkboxesChecked.length > 0){
      bulkBar.style.display = "flex";
      const bulkCount = document.getElementById('select-bulk-count-brreg');
      //finne ut hvor mange chackboxer som er checked i listen med id rowlistSelect
      const checkedCount = checkboxes.length;
      bulkCount.textContent = `${checkedCount} valgt`;

    }else{
      bulkBar.style.display = "none";
    }
    
});

let sentToSelectButton = document.getElementById("sentToSelect");
sentToSelectButton.addEventListener("click", function() {
  dataFromBrregToSelect();
  });


  function updateBrregCounter(sumTotal = 0, sumInPortal = 0, sumSelected = 0, preset = false) {
    const counter = document.getElementById('counterlistbrreg');
    if (!counter) return;
  
    // Opprett hovedcontainer
    counter.innerHTML = '';
  
    // Hjelpefunksjon for å lage en "chip"
    const makeChip = (label, value, color) => {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.style.padding = '4px 10px';
      span.style.marginRight = '6px';
      span.style.borderRadius = '20px';
      span.style.fontSize = '13px';
      span.style.fontWeight = '500';
      span.style.border = '1px solid #ddd';
      span.style.background = color.bg;
      span.style.color = color.text;
      span.textContent = `${label}: ${value} stk.`;
      return span;
    };
  
    // Farger (enkle og lesbare)
    const colorTotal    = { bg: '#eef2ff', text: '#1e3a8a' }; // blålig
    const colorPortal   = { bg: '#ecfdf3', text: '#065f46' }; // grønn
    const colorSelected = { bg: '#eff6ff', text: '#1e40af' }; // lys blå
  
    // Bygg tellerne
    const totalEl    = makeChip('Totalt', sumTotal, colorTotal);
    const portalEl   = makeChip('I portal', sumInPortal, colorPortal);
    const selectedEl = makeChip('Valgt', sumSelected, colorSelected);
  
    // Legg til elementene i DOM
    counter.appendChild(totalEl);
    counter.appendChild(portalEl);
    counter.appendChild(selectedEl);
  
    // Legg til "(filtrert)" hvis preset = true
    if (preset) {
      const filtered = document.createElement('span');
      filtered.textContent = '(filtrert)';
      filtered.style.fontSize = '12px';
      filtered.style.opacity = '0.7';
      filtered.style.marginLeft = '8px';
      counter.appendChild(filtered);
    }
  }
  