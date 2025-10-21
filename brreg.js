

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


// --- 1) HJELPER: kontakt-ikoner (ren JS, ingen ekstern CSS) ---
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

  const rawWeb =
    item.hjemmeside ?? item.hjemmesideurl ?? item.hjemmesideUrl ??
    item.web ?? item.www ?? item.website ?? item.nettside ?? '';
  const rawPhone =
    item.mobil ?? item.mobilnummer ?? item.telefon ?? item.telefonnummer ??
    item.phone ?? item.tlf ?? '';

  const website = normalizeUrl(rawWeb);
  const phone = normalizePhone(rawPhone);

  const globeSvg = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
      <path d="M3 12h18M12 3c3.5 3.8 3.5 13.2 0 18M12 3c-3.5 3.8-3.5 13.2 0 18" stroke="currentColor" stroke-width="1.6"/>
    </svg>`;
  const phoneSvg = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14">
      <path d="M6 4h4l1 4-2 1a12 12 0 0 0 6 6l1-2 4 1v4a2 2 0 0 1-2 2 16 16 0 0 1-16-16 2 2 0 0 1 2-2z"
            stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round" />
    </svg>`;

  let html = '';
  if (website) {
    html += `
      <a class="icon-btn" href="${website}" target="_blank" rel="noopener noreferrer"
         title="${website}" aria-label="Åpne nettside">
        ${globeSvg}
      </a>`;
  }
  if (phone) {
    html += `
      <a class="icon-btn" href="tel:${phone}" title="${phone}" aria-label="Ring ${phone}">
        ${phoneSvg}
      </a>`;
  }

  return html || '—';
}

function startBrregList(data) {
  // --- 0) Injiser CSS én gang ---
  if (!document.getElementById('brreg-contact-style')) {
    const style = document.createElement('style');
    style.id = 'brreg-contact-style';
    style.textContent = `
      .icon-btn {
        display:inline-flex; align-items:center; justify-content:center;
        width:26px; height:26px; border-radius:6px; margin-right:6px;
        border:1px solid #e5e7eb; background:#f9fafb;
        color:#1e3a8a; cursor:pointer; text-decoration:none;
      }
      .icon-btn:hover { background:#eef2ff; }
      .contact-cell { white-space:nowrap; }
      tr.inportal { background: rgba(60,180,75,0.07); }
      tr.selected  { background: rgba(0,120,215,0.07); }
    `;
    document.head.appendChild(style);
  }

  const list = document.getElementById('rowlist');
  if (!list) return;

  // --- 1) Hent valgt preset og kontaktfilter ---
  const presetName = document.getElementById('select-field-preset')?.value;
  const contactFilter = document.getElementById('select-contact-info-filter')?.value || '';

  const presets = JSON.parse(localStorage.getItem('industryPresets') || '{}');
  const preset = presets[presetName] || null;

  // --- 2) Hjelpefunksjoner ---
  const normalizeOrgnr = (v) => String(v ?? '').replace(/\D/g, '').padStart(9, '0');
  const getOrgnr = (obj) =>
    normalizeOrgnr(
      obj?.organisasjonsnummer ?? obj?.orgnr ?? obj?.orgNr ?? obj?.OrganizationNumber
    );

  const hasEmail = (it) =>
    !!String(it.epostadresse ?? it.epost ?? it.email ?? it.mail ?? '').trim();
  const hasWeb = (it) =>
    !!String(it.hjemmeside ?? it.hjemmesideurl ?? it.hjemmesideUrl ??
      it.web ?? it.www ?? it.website ?? it.nettside ?? '').trim();
  const hasPhone = (it) =>
    !!String(it.mobil ?? it.mobilnummer ?? it.telefon ?? it.telefonnummer ??
      it.phone ?? it.tlf ?? '').trim();

  // --- 3) Filtrer data ---
  let filteredData = data;
  if (preset) {
    const { industries = [], dateFrom, dateTo } = preset;
    const fromDt = dateFrom ? new Date(dateFrom) : null;
    const toDt = dateTo ? new Date(dateTo) : null;

    filteredData = data.filter((item) => {
      let include = true;

      // Bransje
      if (industries.length > 0) {
        const industryTxt =
          ((item.naeringskode1?.beskrivelse ?? '') || (item.bransje ?? '')).toLowerCase();
        include = industries.some((ind) =>
          industryTxt.includes(String(ind).toLowerCase())
        );
      }
      // Dato
      if (include && (fromDt || toDt)) {
        const regDateRaw =
          item.registreringsdatoEnhetsregisteret || item.registreringsdatoForetaksregisteret;
        if (!regDateRaw) return false;
        const regDate = new Date(regDateRaw);
        if (fromDt && regDate < fromDt) include = false;
        if (toDt && regDate > toDt) include = false;
      }

      if (include && contactFilter) {
        const email = hasEmail(item);
        const web = hasWeb(item);
        const phone = hasPhone(item);
      
        switch (contactFilter) {
          case 'email': include = email; break;
          case 'web': include = web; break;
          case 'phone': include = phone; break;
          case 'email-only': include = email && !web && !phone; break;
          case 'web-only': include = web && !email && !phone; break;
          case 'phone-only': include = phone && !email && !web; break;
          case 'email-web': include = email && web && !phone; break;
          case 'email-phone': include = email && phone && !web; break;
          case 'web-phone': include = web && phone && !email; break;
          case 'all-three': include = email && web && phone; break;
          default: include = true; break;
        }
      }

      return include;
    });
  } else if (contactFilter) {
    filteredData = data.filter((item) => {
      if (contactFilter === 'email') return hasEmail(item);
      if (contactFilter === 'web') return hasWeb(item);
      if (contactFilter === 'phone') return hasPhone(item);
      return true;
    });
  }

  // --- 4) Sortering ---
  filteredData.sort((a, b) => {
    const da = new Date(a.registreringsdatoEnhetsregisteret);
    const db = new Date(b.registreringsdatoEnhetsregisteret);
    if (da < db) return 1;
    if (da > db) return -1;
    return a.navn.toUpperCase().localeCompare(b.navn.toUpperCase());
  });

  // Ekstra sortering for søkestreng
  const qStr = (typeof elQuery !== 'undefined' && elQuery?.value) ? elQuery.value : '';
  const query = qStr.trim().toLowerCase();
  if (query) {
    filteredData.sort((a, b) => {
      const normalize = (s) => s.toLowerCase().replace(/\b(as|asa)\b\.?/g, '').trim();
      const nameA = normalize(a.navn);
      const nameB = normalize(b.navn);
      const normQ = normalize(query);

      const aExact = nameA === normQ;
      const bExact = nameB === normQ;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = nameA.startsWith(normQ);
      const bStarts = nameB.startsWith(normQ);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return 0;
    });
  }

  // --- 5) Rendre tabell ---
  list.innerHTML = '';

  let sumTotal = filteredData.length;
  let sumInPortal = 0;
  let sumSelected = 0;
  let sumEmail = 0;
  let sumWeb = 0;
  let sumPhone = 0;

  filteredData.forEach((rawItem) => {
    const tr = document.createElement('tr');
    tr.classList.add('default-row');

    const isInPortal = (gCustomers || []).some(
      (c) => getOrgnr(c) === getOrgnr(rawItem)
    );
    const alreadySelected = (gSelectbedrifter || []).find(
      (b) => getOrgnr(b) === getOrgnr(rawItem)
    );

    let item = rawItem;
    let g = null;

    // Prioritet: Portal > Utvalg
    if (isInPortal) {
      sumInPortal++;
      tr.classList.add('inportal');
    } else if (alreadySelected) {
      sumSelected++;
      tr.classList.add('selected');
      item = alreadySelected;
      g = (gGroupbedrifter || []).find((gr) => gr.id == item.group);
    }

    if (hasEmail(item)) sumEmail++;
    if (hasWeb(item)) sumWeb++;
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

    const contactHtml = renderContactIcons(item);
    const checkboxAttrs = (alreadySelected || isInPortal) ? 'disabled checked' : '';

    const statusHtml = isInPortal
      ? `<strong>Er registrert i portal</strong>`
      : (alreadySelected
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
  updateBrregCounterDark(sumTotal, sumInPortal, sumSelected, !!preset, sumEmail, sumWeb, sumPhone);

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
  