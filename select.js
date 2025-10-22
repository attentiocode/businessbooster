//når knappen med id tabSelectButton trykkes skal funksjonen starteSelection kjøres med gSelectbedrifter som inndata
document.getElementById("tabSelectButton").addEventListener("click", () => {
    startSelection(gSelectbedrifter);
});


//logCompanyOnce("998766834","dataFromProff");


function startSelection(data) {
   
    renderSelect(data);
}
      

//når søkefeltet med id searchSelect endres skal renderSelect kjøres med gSelectbedrifter som inndata
document.getElementById("searchSelect").addEventListener("input", () => {
    renderSelect(gSelectbedrifter);
});
//når select-feltet med id filterGroupSelect endres skal renderSelect kjøres med gSelectbedrifter som inndata
document.getElementById("filterGroupSelectMaster").addEventListener("change", () => {
    renderSelect(gSelectbedrifter);
});


document.getElementById("select-contact-info-select-filter").addEventListener('change', (e) => {
  renderSelect(gSelectbedrifter);
});

document.getElementById("select-contact-state-select-filter").addEventListener('change', (e) => {
  renderSelect(gSelectbedrifter);
});


function renderSelect(data){
  const tbody = document.getElementById('rowlistSelect');
  if (!tbody) return;
  tbody.innerHTML = '';

  // --- Hjelpere ---
  const val = v => (v == null ? '' : String(v));
  const low = v => val(v).toLowerCase();

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString('no-NO');
  };

  const fmtAddr = (b) => {
    const a = b?.forretningsadresse || b?.postadresse || {};
    const adr = Array.isArray(a.adresse) ? a.adresse.join(', ') : a.adresse;
    return [adr, a.postnummer, a.poststed].filter(Boolean).join(', ') || '—';
  };

  const normalizeOrgnr = (v) => String(v ?? '').replace(/\D/g, '').padStart(9, '0');
  const getOrgnr = (obj) =>
    normalizeOrgnr(obj?.organisasjonsnummer ?? obj?.orgnr ?? obj?.orgNr ?? obj?.OrganizationNumber);

  // Kontaktfelt-hjelpere
  const hasEmail = (it) =>
    !!String(it?.epostadresse ?? it?.epost ?? it?.email ?? it?.mail ?? '').trim();
  const hasWeb = (it) =>
    !!String(it?.hjemmeside ?? it?.hjemmesideurl ?? it?.hjemmesideUrl ??
             it?.web ?? it?.www ?? it?.website ?? it?.nettside ?? '').trim();
  const hasPhone = (it) =>
    !!String(it?.mobil ?? it?.mobilnummer ?? it?.telefon ?? it?.telefonnummer ??
             it?.phone ?? it?.tlf ?? '').trim();

  // Sett til state-sjekk
  const inPortalSet = new Set((gCustomers || []).map(getOrgnr).filter(Boolean));
  const inUtvalgSet = new Set((gSelectbedrifter || []).map(getOrgnr).filter(Boolean));

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

  const passesStateFilter = (item, filterVal) => {
    if (!filterVal) return true; // '' = alle selskap
    const org = getOrgnr(item);
    if (filterVal === 'portal') return inPortalSet.has(org);
    if (filterVal === 'utvalg') return inUtvalgSet.has(org);
    return true;
  };

  // --- Les filtre ---
  const searchEl   = document.getElementById('searchSelect');
  const searchTerm = low(searchEl ? searchEl.value : '');

  const grpSel     = document.getElementById('filterGroupSelectMaster');
  const rawFilter  = grpSel ? grpSel.value : '';
  const filterGroup = String(rawFilter || '').trim();

  // NYE selectorer:
  const infoSel   = document.getElementById('select-contact-info-select-filter');
  const infoFilter = infoSel ? String(infoSel.value || '') : '';

  const stateSel   = document.getElementById('select-contact-state-select-filter');
  const stateFilter = stateSel ? String(stateSel.value || '') : ''; // '', 'portal', 'utvalg'

  // --- Filtrer ---
  let filteredData = Array.isArray(data) ? data.slice() : [];

  // Gruppefilter
  if (!(filterGroup === '' || filterGroup.toLowerCase() === 'all')) {
    filteredData = filteredData.filter(b => String(b.group ?? '').trim() === filterGroup);
  }

  // Tekstsøk
  if (searchTerm) {
    filteredData = filteredData.filter(b => {
      const a   = b?.forretningsadresse || b?.postadresse || {};
      const adr = Array.isArray(a.adresse) ? a.adresse.join(', ') : a.adresse;
      const grp = (window.gGroupbedrifter || []).find(gr => String(gr.id) === String(b.group ?? ''));
      return (
        low(b?.navn).includes(searchTerm) ||
        val(b?.organisasjonsnummer).includes(searchTerm) ||
        low(adr).includes(searchTerm) ||
        val(a?.postnummer).includes(searchTerm) ||
        low(a?.poststed).includes(searchTerm) ||
        (grp && (low(grp.name).includes(searchTerm) || low(grp.user).includes(searchTerm)))
      );
    });
  }

  // Kontaktfilter (ny)
  if (infoFilter) {
    filteredData = filteredData.filter(b => passesContactFilter(b, infoFilter));
  }

  // Statefilter (ny)
  if (stateFilter) {
    filteredData = filteredData.filter(b => passesStateFilter(b, stateFilter));
  }

  // Oppdater teller
  const counter = document.getElementById("counterlistutvalg");
  if (counter) counter.textContent = `${filteredData.length} Stk.`;

  // --- Render rader ---
  (filteredData || []).forEach((b, i) => {
    const tr = document.createElement('tr');
    tr.classList.add('default-row');

    const g = (gGroupbedrifter || []).find(gr => gr.id == b.group);

    // Kontakt-HTML (egen funksjon)
    const contactHtml = renderContactIcons(b);

    tr.innerHTML = `
      <td style="width:40px;">
        <input
          type="checkbox"
          class="selectcheckbox"
          data-orgnr="${b.organisasjonsnummer || ''}"
          id="sel${i}"
        />
      </td>
      <td class="mono" style="font-size:10px;">${b.organisasjonsnummer ?? '—'}</td>
      <td style="font-weight:700;font-size:12px;">${b.navn ?? '—'}</td>
      <td style="font-size:11px;">${fmtAddr(b)}</td>
      <td style="font-size:11px;">${g ? g.name : '—'}</td>
      <td style="font-size:11px;">${g ? (g.user || '—') : '—'}</td>
      <td style="font-size:11px;">${fmtDate(b.registreringsdatoEnhetsregisteret || b.registreringsdatoForetaksregisteret)}</td>
      <td class="contact-cell" style="font-size:11px;">${contactHtml}</td>
    `;

    tbody.appendChild(tr);
  });

  // --- Massebehandling UI + handlers ---
  const bulkBar   = document.getElementById('select-bulk-actions');
  const bulkCount = document.getElementById('select-bulk-count');
  const btnRemove = document.getElementById('ba-remove');
  const btnMove   = document.getElementById('ba-move');
  const btnEnrich = document.getElementById('ba-enrich');

  function getSelectedOrgnrs() {
    return Array.from(tbody.querySelectorAll('.selectcheckbox'))
      .filter(cb => cb.checked && !cb.disabled)
      .map(cb => cb.dataset.orgnr)
      .filter(Boolean);
  }

  function updateBulkUI() {
    const n = getSelectedOrgnrs().length;
    if (bulkBar)   bulkBar.style.display = n > 0 ? 'flex' : 'none';
    if (bulkCount) bulkCount.textContent = `${n} valgt`;
  }

  tbody.querySelectorAll('.selectcheckbox').forEach(cb => {
    if (!cb.disabled) cb.addEventListener('change', updateBulkUI);
  });
  updateBulkUI();

  // --- Knapp: Fjern fra utvalg ---
  if (btnRemove) {
    btnRemove.onclick = () => {
      const orgnrs = getSelectedOrgnrs();
      if (!orgnrs.length) return;
      if (!confirm(`Fjerne ${orgnrs.length} bedrift(er) fra utvalget?`)) return;

      gSelectbedrifter = (gSelectbedrifter || []).filter(
        b => !orgnrs.includes(String(b.organisasjonsnummer))
      );
      try { localStorage.setItem('gSelectbedrifter', JSON.stringify(gSelectbedrifter)); } catch(e){}

      renderSelect(gSelectbedrifter);
    };
  }

  // --- Knapp: Flytt til annen gruppe ---
  if (btnMove) {
    btnMove.onclick = async () => {
      const orgnrs = getSelectedOrgnrs();
      if (!orgnrs.length) return;

      let groupId = null;
      if (typeof pickGroupViaDialog === 'function') {
        groupId = await pickGroupViaDialog();
      } else {
        groupId = prompt('Lim inn gruppe-ID som selskapene skal flyttes til:');
      }
      if (!groupId) return;

      (gSelectbedrifter || []).forEach(b => {
        if (orgnrs.includes(String(b.organisasjonsnummer))) b.group = String(groupId);
      });
      try { localStorage.setItem('gSelectbedrifter', JSON.stringify(gSelectbedrifter)); } catch(e){}

      renderSelect(gSelectbedrifter);
    };
  }

  // --- Knapp: Innhent mer data ---
  if (btnEnrich) {
    btnEnrich.onclick = async () => {
      const orgnrs = getSelectedOrgnrs();
      if (!orgnrs.length) return;
      logCompanyOnce(orgnrs[0], "dataFromProff");
    };
  }

  updateCounter("label-mailer-sendt", gSelectbedrifter.length, 1000);
}



function initContactInfoSelectFilter() {
  let select = document.getElementById('select-contact-info-select-filter');

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

function initContactStateSelectFilter(){
  const sel = document.getElementById('select-contact-state-select-filter');
  if (!sel) return;
  sel.innerHTML = '';
  [
    {value:'',        label:'Alle selskap'},
    {value:'portal',  label:'Er i Portal'},
    {value:'utvalg',  label:'Er i utvalg'},
    {value:'ready',  label:'Er i klar'},
  ].forEach(({value,label})=>{
    const o=document.createElement('option'); o.value=value; o.textContent=label; sel.appendChild(o);
  });
  sel.addEventListener('change', ()=> {
    if (typeof window.brregData !== 'undefined') startBrregList(window.brregData);
  });
}
  
  
  
  