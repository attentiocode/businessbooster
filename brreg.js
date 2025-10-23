

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
  const now = new Date();
  now.setHours(0,0,0,0);
  let from = new Date(now), to = new Date(now);

  if (period === 'today') {
    from = now; to = now;
  } else if (period === 'this_week') {
    from = startOfWeek(now); to = endOfWeek(now);
  } else if (period === 'last_week') {
    const s = startOfWeek(now); s.setDate(s.getDate()-7);
    const e = new Date(s); e.setDate(e.getDate()+6);
    from = s; to = e;
  } else if (period === 'this_month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth()+1, 0);
  } else if (period === 'last_month') {
    from = new Date(now.getFullYear(), now.getMonth()-1, 1);
    to   = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === 'last_7') {
    from = new Date(now); from.setDate(now.getDate()-6);
    to = now;
  } else if (period === 'last_30') {
    from = new Date(now); from.setDate(now.getDate()-29);
    to = now;
  } else if (period === 'ytd') {
    from = new Date(now.getFullYear(), 0, 1);
    to   = now; // hittil i år => til i dag
  } else if (period === 'this_year') {
    from = new Date(now.getFullYear(), 0, 1);
    to   = new Date(now.getFullYear(), 11, 31);
  } else if (period === 'last_year') {
    const y = now.getFullYear() - 1;
    from = new Date(y, 0, 1);
    to   = new Date(y, 11, 31);
  } else if (period === 'last_5_years') {
    const startYear = now.getFullYear() - 4; // inkl. i år
    from = new Date(startYear, 0, 1);
    to   = now; // “siste 5 år” t.o.m. i dag
  } else if (period === 'last_10_years') {
    const startYear = now.getFullYear() - 9;
    from = new Date(startYear, 0, 1);
    to   = now;
  } else if (period?.startsWith('year:')) {
    const y = parseInt(period.split(':')[1], 10);
    if (!isNaN(y)) {
      from = new Date(y, 0, 1);
      to   = new Date(y, 11, 31);
    }
  } else {
    // 'none' eller 'custom' → la kallende kode håndtere egne inputfelt
    return null;
  }

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
  /*
  const r = rangeFor('this_week');
  elPeriod.value = 'this_week';
  elFrom.value = r.fra; elTo.value = r.til;
  elFrom.disabled = false; elTo.disabled = false;
  */
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

function renderContactIcons(item) {
  const normalizeUrl = (u) => {
    if (!u) return '';
    let s = String(u).trim();
    s = s.replace(/^mailto:/i, '').replace(/^tel:/i, '').replace(/\s+/g, '');
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try { new URL(s); return s; } catch { return ''; }
  };

  const normalizePhone = (p) => {
    if (!p) return '';
    const digits = String(p).replace(/[^\d+]/g, '');
    return digits.length ? digits : '';
  };

  const normalizeEmail = (e) => {
    if (!e) return '';
    const s = String(e).trim().replace(/^mailto:/i, '');
    // Enkel validering
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
  };

  const rawWeb =
    item.hjemmeside ?? item.hjemmesideurl ?? item.hjemmesideUrl ??
    item.web ?? item.www ?? item.website ?? item.nettside ?? '';

  const rawPhone =
    item.mobil ?? item.mobilnummer ?? item.telefon ?? item.telefonnummer ??
    item.phone ?? item.tlf ?? '';

  const rawEmail =
    item.epostadresse ?? item.epost ?? item.email ?? item.mail ?? '';

  const website = normalizeUrl(rawWeb);
  const phone = normalizePhone(rawPhone);
  const email = normalizeEmail(rawEmail);

  const globeSvg = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
      <path d="M3 12h18M12 3c3.5 3.8 3.5 13.2 0 18M12 3c-3.5 3.8-3.5 13.2 0 18"
            stroke="currentColor" stroke-width="1.6"/>
    </svg>`;

  const phoneSvg = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14">
      <path d="M6 4h4l1 4-2 1a12 12 0 0 0 6 6l1-2 4 1v4a2 2 0 0 1-2 2
               16 16 0 0 1-16-16 2 2 0 0 1 2-2z"
            stroke="currentColor" stroke-width="1.6"
            fill="none" stroke-linejoin="round" />
    </svg>`;

  const mailSvg = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14">
      <rect x="3" y="5" width="18" height="14" rx="2" ry="2"
            stroke="currentColor" stroke-width="1.6" fill="none"/>
      <path d="M3 7l9 6 9-6" stroke="currentColor" stroke-width="1.6"
            fill="none" stroke-linecap="round" />
    </svg>`;

  let html = '';

  if (email) {
    html += `
      <a class="icon-btn" href="mailto:${email}"
         title="${email}" aria-label="Send e-post til ${email}">
        ${mailSvg}
      </a>`;
  }

  if (website) {
    html += `
      <a class="icon-btn" href="${website}" target="_blank" rel="noopener noreferrer"
         title="${website}" aria-label="Åpne nettside">
        ${globeSvg}
      </a>`;
  }

  if (phone) {
    html += `
      <a class="icon-btn" href="tel:${phone}"
         title="${phone}" aria-label="Ring ${phone}">
        ${phoneSvg}
      </a>`;
  }

  return html || '—';
}

function startBrregList(data) {

  const list = document.getElementById('rowlist');
  if (!list) return;

  // --- 1) Hent filterverdier ---
  const presetName    = document.getElementById('select-field-preset')?.value;
  const contactFilter = document.getElementById('select-contact-info-filter')?.value || '';
  const stateFilter   = document.getElementById('select-contact-state-filter')?.value || ''; // '', 'portal', 'utvalg'

  const presets = JSON.parse(localStorage.getItem('industryPresets') || '{}');
  const preset  = presets[presetName] || null;

  // --- 2) Hjelpere ---
  const normalizeOrgnr = (v) => String(v ?? '').replace(/\D/g, '').padStart(9, '0');
  const getOrgnr = (obj) =>
    normalizeOrgnr(obj?.organisasjonsnummer ?? obj?.orgnr ?? obj?.orgNr ?? obj?.OrganizationNumber);

  const hasEmail = (it) =>
    !!String(it?.epostadresse ?? it?.epost ?? it?.email ?? it?.mail ?? '').trim();
  const hasWeb = (it) =>
    !!String(it?.hjemmeside ?? it?.hjemmesideurl ?? it?.hjemmesideUrl ??
             it?.web ?? it?.www ?? it?.website ?? it?.nettside ?? '').trim();
  const hasPhone = (it) =>
    !!String(it?.mobil ?? it?.mobilnummer ?? it?.telefon ?? it?.telefonnummer ??
             it?.phone ?? it?.tlf ?? '').trim();

  const passesContactFilter = (item, filterVal) => {
    if (!filterVal) return true;
    const email = hasEmail(item), web = hasWeb(item), phone = hasPhone(item);
    switch (filterVal) {
      case 'email':        return email;
      case 'web':          return web;
      case 'phone':        return phone;
      case 'email-only':   return email && !web && !phone;
      case 'web-only':     return web && !email && !phone;
      case 'phone-only':   return phone && !email && !web;
      case 'email-web':    return email && web && !phone;
      case 'email-phone':  return email && phone && !web;
      case 'web-phone':    return web && phone && !email;
      case 'all-three':    return email && web && phone;
      default:             return true;
    }
  };

  // Sett for rask state-sjekk
  const inPortalSet = new Set((gCustomers || []).map(getOrgnr).filter(Boolean));
  const selectedSet = new Set((gSelectbedrifter || []).map(getOrgnr).filter(Boolean));

  const passesStateFilter = (item, filterVal) => {
    if (!filterVal) return true; // alle selskap
    const org = getOrgnr(item);
    if (filterVal === 'portal') return inPortalSet.has(org);
    if (filterVal === 'utvalg') return selectedSet.has(org);
    return true;
  };

  // --- 3) Filtrer data (preset + kontakt + state) ---
  let filteredData = data;
  if (preset) {
    const { industries = [], dateFrom, dateTo } = preset;
    const fromDt = dateFrom ? new Date(dateFrom) : null;
    const toDt   = dateTo   ? new Date(dateTo)   : null;

    filteredData = data.filter((item) => {
      let include = true;

      // Bransje
      if (industries.length > 0) {
        const industryTxt = ((item.naeringskode1?.beskrivelse ?? '') || (item.bransje ?? '')).toLowerCase();
        include = industries.some((ind) => industryTxt.includes(String(ind).toLowerCase()));
      }

      // Dato
      if (include && (fromDt || toDt)) {
        const regDateRaw = item.registreringsdatoEnhetsregisteret || item.registreringsdatoForetaksregisteret;
        if (!regDateRaw) return false;
        const regDate = new Date(regDateRaw);
        if (fromDt && regDate < fromDt) include = false;
        if (toDt && regDate > toDt)     include = false;
      }

      if (include) include = passesContactFilter(item, contactFilter);
      if (include) include = passesStateFilter(item, stateFilter);

      return include;
    });
  } else {
    // Ingen preset: filtrer på kontakt/state hvis satt
    filteredData = data.filter((item) =>
      passesContactFilter(item, contactFilter) && passesStateFilter(item, stateFilter)
    );
  }

  // --- 4) Sortering ---
  filteredData.sort((a, b) => {
    const da = new Date(a.registreringsdatoEnhetsregisteret);
    const db = new Date(b.registreringsdatoEnhetsregisteret);
    if (da < db) return 1;
    if (da > db) return -1;
    return a.navn.toUpperCase().localeCompare(b.navn.toUpperCase());
  });

  // Ekstra sortering for søkestreng (eksakt → startsWith)
  const qStr = (typeof elQuery !== 'undefined' && elQuery?.value) ? elQuery.value : '';
  const query = qStr.trim().toLowerCase();
  if (query) {
    filteredData.sort((a, b) => {
      const normalize = (s) => s.toLowerCase().replace(/\b(as|asa)\b\.?/g, '').trim();
      const nameA = normalize(a.navn), nameB = normalize(b.navn), normQ = normalize(query);
      const aExact = nameA === normQ, bExact = nameB === normQ;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      const aStarts = nameA.startsWith(normQ), bStarts = nameB.startsWith(normQ);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }

  // --- 5) Rendre tabell ---
  list.innerHTML = '';

  let sumTotal    = filteredData.length;
  let sumInPortal = 0;
  let sumSelected = 0;
  let sumEmail    = 0;
  let sumWeb      = 0;
  let sumPhone    = 0;

  filteredData.forEach((rawItem) => {
    const tr = document.createElement('tr');
    tr.classList.add('default-row');

    const org = getOrgnr(rawItem);
    const isInPortal     = inPortalSet.has(org);
    const isAlreadySel   = selectedSet.has(org);
    const alreadySelected = (gSelectbedrifter || []).find(b => getOrgnr(b) === org);

    let item = rawItem;
    let g = null;

    // Prioritet: Portal > Utvalg
    if (isInPortal) {
      sumInPortal++;
      tr.classList.add('inportal');
    } else if (isAlreadySel && alreadySelected) {
      sumSelected++;
      tr.classList.add('selected');
      item = alreadySelected;
      g = (gGroupbedrifter || []).find((gr) => gr.id == item.group);
    }

    if (hasEmail(item)) sumEmail++;
    if (hasWeb(item))   sumWeb++;
    if (hasPhone(item)) sumPhone++;

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

    const contactHtml  = renderContactIcons(item);
    const checkboxAttrs = (isInPortal || isAlreadySel) ? 'disabled checked' : '';

    const statusHtml = isInPortal
      ? `<strong>Er registrert i portal</strong>`
      : (isAlreadySel
          ? `<strong>Utvalg</strong><span style="opacity:0.8;">${g?.name ? ` - ${g.name}` : ''}</span>`
          : 'Brreg');

    tr.innerHTML = `
      <td style="width:40px;">
        <input type="checkbox" class="selectcheckbox"
          data-orgnr="${item.organisasjonsnummer || ''}" ${checkboxAttrs} />
      </td>
      <td class="mono" style="font-size:11px;">${item.organisasjonsnummer ?? '—'}</td>
      <td style="font-weight:700;font-size:12px;">${item.navn ?? '—'}</td>
      <td style="font-size:11px;">${adresse}</td>
      <td style="font-size:11px;">${fmtDate(item.registreringsdatoEnhetsregisteret || item.registreringsdatoForetaksregisteret)}</td>
      <td class="contact-cell" style="font-size:11px;">${contactHtml}</td>
      <td class="status" style="font-size:10px;">${statusHtml}</td>
    `;

    list.appendChild(tr);
  });

  // --- 6) Oppdater teller ---
  updateBrregCounterDark(
    sumTotal, sumInPortal, sumSelected, !!preset, sumEmail, sumWeb, sumPhone
  );

  // --- 7) Massebehandling (bulk selection) ---
  const bulkBar = document.getElementById('select-bulk-actions-brreg');
  const bulkCount = document.getElementById('select-bulk-count-brreg');

  const getSelectedOrgnrs = () =>
    Array.from(list.querySelectorAll('.selectcheckbox'))
      .filter(cb => cb.checked && !cb.disabled)
      .map(cb => cb.dataset.orgnr)
      .filter(Boolean);

  function updateBulkUI() {
    const n = getSelectedOrgnrs().length;
    if (bulkBar)   bulkBar.style.display = n > 0 ? 'flex' : 'none';
    if (bulkCount) bulkCount.textContent = `${n} valgt`;
    const counterSel = document.getElementById('counterlistbrregselect');
    if (counterSel) {
      counterSel.textContent = `${n} valgt`;
      counterSel.style.display = n > 0 ? 'block' : 'none';
    }
  }

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


function updateBrregCounterDark(
    sumTotal = 0,
    sumInPortal = 0,
    sumSelected = 0,
    preset = false,
    sumEmail = 0,
    sumWeb = 0,
    sumPhone = 0
  ) {
    const counter = document.getElementById('counterlistbrreg');
    if (!counter) return;
  
    // Fjern gammel innhold
    counter.innerHTML = '';
  
    // --- Stil for hele raden ---
    Object.assign(counter.style, {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      fontWeight: '500',
      color: '#E5E7EB'
    });
  
    // --- Chip generator ---
    const makeChip = (label, value, colors) => {
      const el = document.createElement('span');
      el.textContent = `${label}: ${value} stk.`;
      Object.assign(el.style, {
        padding: '4px 10px',
        borderRadius: '9999px',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        fontWeight: '500',
        boxShadow: '0 0 3px rgba(0,0,0,0.15)'
      });
      return el;
    };
  
    // --- Fargepalett tilpasset mørkt dashbord ---
    const colors = {
      total:   { bg: '#1E3A8A1A', text: '#93C5FD', border: '#1E3A8A40' },
      portal:  { bg: '#064E3B33', text: '#6EE7B7', border: '#10B98140' },
      selected:{ bg: '#1E40AF33', text: '#93C5FD', border: '#3B82F640' },
      email:   { bg: '#312E8122', text: '#A78BFA', border: '#7C3AED40' }, // lilla
      web:     { bg: '#07598533', text: '#38BDF8', border: '#0EA5E940' }, // cyan
      phone:   { bg: '#14532D33', text: '#4ADE80', border: '#22C55E40' }  // grønn
    };
  
    // --- Legg til elementene ---
    const totalEl    = makeChip('Totalt', sumTotal, colors.total);
    const portalEl   = makeChip('I portal', sumInPortal, colors.portal);
    const selectedEl = makeChip('Valgt', sumSelected, colors.selected);
    const emailEl    = makeChip('Har e-post', sumEmail, colors.email);
    const webEl      = makeChip('Har nettside', sumWeb, colors.web);
    const phoneEl    = makeChip('Har telefon', sumPhone, colors.phone);
  
    counter.append(totalEl, portalEl, selectedEl, emailEl, webEl, phoneEl);
  
    if (preset) {
      const suffix = document.createElement('span');
      suffix.textContent = '(filtrert)';
      Object.assign(suffix.style, {
        opacity: '0.7',
        fontSize: '12px',
        marginLeft: '6px'
      });
      counter.appendChild(suffix);
    }
}
  

function initContactInfoFilter() {
  let select = document.getElementById('select-contact-info-filter');

  // Opprett select hvis den ikke finnes
  if (!select) {
    select = document.createElement('select');
    select.id = 'select-contact-info-filter';
    select.className = 'select-input-field w-select';
    document.body.prepend(select); // legg den hvor du ønsker
  }

  // Fjern eksisterende valg
  select.innerHTML = '';

  // --- Utvidede valg ---
  const options = [
    { value: '', label: 'Alle kontakter' },
    { value: 'email', label: 'Har e-post 📧' },
    { value: 'web', label: 'Har nettside 🌐' },
    { value: 'phone', label: 'Har telefon 📞' },
    { value: 'email-only', label: 'Kun e-post 📧' },
    { value: 'web-only', label: 'Kun nettside 🌐' },
    { value: 'phone-only', label: 'Kun telefon 📞' },
    { value: 'email-web', label: 'E-post og nettside 📧🌐' },
    { value: 'email-phone', label: 'E-post og telefon 📧📞' },
    { value: 'web-phone', label: 'Nettside og telefon 🌐📞' },
    { value: 'all-three', label: 'Alle tre 📧🌐📞' },
  ];

  // Bygg opp option-elementene
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    select.appendChild(o);
  }

  // Enkel styling (mørk UI)
  Object.assign(select.style, {
    background: '#111827',
    color: '#E5E7EB',
    border: '1px solid #1F2937',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    outline: 'none',
    cursor: 'pointer',
  });

  select.addEventListener('focus', () => {
    select.style.borderColor = '#2563EB';
  });
  select.addEventListener('blur', () => {
    select.style.borderColor = '#1F2937';
  });

  // Reload når valg endres (dersom data finnes globalt)
  select.addEventListener('change', () => {
    if (typeof window.brregData !== 'undefined') {
      startBrregList(window.brregData);
    }
  });
}

function initContactStateFilter(){
  const sel = document.getElementById('select-contact-state-filter');
  if (!sel) return;
  sel.innerHTML = '';
  [
    {value:'',        label:'Alle selskap'},
    {value:'portal',  label:'Er i Portal'},
    {value:'utvalg',  label:'Er i utvalg'},
  ].forEach(({value,label})=>{
    const o=document.createElement('option'); o.value=value; o.textContent=label; sel.appendChild(o);
  });
  sel.addEventListener('change', ()=> {
    if (typeof window.brregData !== 'undefined') startBrregList(window.brregData);
  });
}


// bransjer.js

// Hent alle næringskoder (SN) fra SSB KLASS
async function fetchAllIndustries(opts = {}) {
  const {
    date = new Date(),   // "YYYY-MM-DD" eller Date
    language = "nb",     // "nb" | "nn" | "en"
    level = null,        // 1..5 eller null for alle nivå
  } = opts;

  const isoDate = typeof date === "string"
    ? date
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const params = new URLSearchParams({ date: isoDate, language });
  if (level) params.set("selectLevel", String(level));

  // KLASS id=6 → Standard for næringsgruppering (SN)
  const url = `https://data.ssb.no/api/klass/v1/classifications/6/codesAt.json?${params}`;
  const res  = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`KLASS ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return (data.codes || []).map(c => ({
    code: c.code,
    name: c.name,
    level: Number(c.level),
    parentCode: c.parentCode || null,
  }));
}


// Global variabel der resultatet lagres
window.allIndustriCodeandName = [];

/**
 * Hent alle bransjer (SN – SSB KLASS id=6) og lagre i allIndustriCodeandName.
 * Kall denne fra din eksisterende funksjon.
 *
 * @param {Object} [opts]
 * @param {string|Date} [opts.date=new Date()]  - Dato koden skal være gyldig på (YYYY-MM-DD eller Date)
 * @param {"nb"|"nn"|"en"} [opts.language="nb"] - Språk for navn
 * @returns {Promise<Array<{code:string,name:string}>>}
 */
async function fetchAndStoreIndustries(opts = {}) {
  const {
    date = new Date(),
    language = "nb"
  } = opts;

  // ISO-dato uten tidsone-drift
  const isoDate = (typeof date === "string")
    ? date
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const params = new URLSearchParams({ date: isoDate, language });
  const url = `https://data.ssb.no/api/klass/v1/classifications/6/codesAt.json?${params}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Klarte ikke hente bransjer (KLASS ${res.status}): ${txt || res.statusText}`);
  }

  const data = await res.json();
  // Kun kode + navn (enkelt og lett)
  const items = (data.codes || []).map(c => ({ code: c.code, name: c.name }));

  // Lagre i global variabel
  window.allIndustriCodeandName = items;

  return items;
}

async function getAllallIndustri() {
  try {
    await fetchAndStoreIndustries(); // evt. { date: "2024-12-31", language: "nb" }
    // Nå ligger dataene i window.allIndustriCodeandName
    console.log(allIndustriCodeandName.length, "bransjer lastet");
    // ... gjør det du vil videre
  } catch (err) {
    console.error("Feil ved henting av bransjer:", err);
  }
}
