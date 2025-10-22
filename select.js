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


function renderSelect(data) {
  const tbody = document.getElementById('rowlistSelect');
  if (!tbody) return;
  tbody.innerHTML = '';

  // --- Initér global ready-liste én gang ---
  if (!Array.isArray(window.gReadybedrifter)) {
    try {
      window.gReadybedrifter = JSON.parse(localStorage.getItem('gReadybedrifter') || '[]');
      if (!Array.isArray(window.gReadybedrifter)) window.gReadybedrifter = [];
    } catch { window.gReadybedrifter = []; }
  }

  // --- Hjelpere ---
  const val = v => (v == null ? '' : String(v));
  const low = v => val(v).toLowerCase();
  const fmtDate = (d) => (!d ? '—' : (isNaN(new Date(d)) ? d : new Date(d).toLocaleDateString('no-NO')));
  const fmtAddr = (b) => {
    const a = b?.forretningsadresse || b?.postadresse || {};
    const adr = Array.isArray(a.adresse) ? a.adresse.join(', ') : a.adresse;
    return [adr, a.postnummer, a.poststed].filter(Boolean).join(', ') || '—';
  };
  const normalizeOrgnr = (v) => String(v ?? '').replace(/\D/g, '').padStart(9, '0');
  const getOrgnr = (obj) =>
    normalizeOrgnr(obj?.organisasjonsnummer ?? obj?.orgnr ?? obj?.orgNr ?? obj?.OrganizationNumber);

  // Kontaktfelt-hjelpere
  const getEmail = (it) =>
    String(it?.epostadresse ?? it?.epost ?? it?.email ?? it?.mail ?? '').trim().replace(/^mailto:/i, '');
  const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
  const hasEmail = (it) => !!getEmail(it);
  const getPhone = (it) =>
    String(it?.mobil ?? it?.mobilnummer ?? it?.telefon ?? it?.telefonnummer ?? it?.phone ?? it?.tlf ?? '').trim();
  const hasPhone = (it) => !!getPhone(it);
  const getWeb = (it) =>
    String(it?.hjemmeside ?? it?.hjemmesideurl ?? it?.hjemmesideUrl ?? it?.web ?? it?.www ??
      it?.website ?? it?.nettside ?? '').trim();
  const hasWeb = (it) => !!getWeb(it);

  // Ready-status
  const isReady = (it) => {
    const s = low(it?.status ?? '');
    if (s === 'klar' || s === 'ready' || s.includes('klar for')) return true;
    return (window.gReadybedrifter || []).some(r => getOrgnr(r) === getOrgnr(it));
  };

  const readySet = new Set((window.gReadybedrifter || []).map(getOrgnr));

  // --- Render rader ---
  (Array.isArray(data) ? data : []).forEach((b, i) => {
    const tr = document.createElement('tr');
    tr.classList.add('default-row');

    const org = getOrgnr(b);
    const rowIsReady = readySet.has(org) || isReady(b);

    if (rowIsReady) tr.classList.add('ready');

    const contactHtml = renderContactIcons(b);
    const checkboxAttrs = rowIsReady ? 'checked disabled' : '';

    tr.innerHTML = `
      <td style="width:40px;"><input type="checkbox" class="selectcheckbox" data-orgnr="${org}" ${checkboxAttrs}></td>
      <td class="mono" style="font-size:10px;">${org}</td>
      <td style="font-weight:700;font-size:12px;">${b.navn ?? '—'}</td>
      <td style="font-size:11px;">${fmtAddr(b)}</td>
      <td style="font-size:11px;">${fmtDate(b.registreringsdatoEnhetsregisteret || b.registreringsdatoForetaksregisteret)}</td>
      <td class="contact-cell" style="font-size:11px;">${contactHtml}</td>
    `;

    // 🔹 Klikk på rad åpner redigerings-popup (kun hvis ikke klar)
    if (!rowIsReady) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return; // ikke trigge på checkbox
        openEditPopup(b, org);
      });
    }

    tbody.appendChild(tr);
  });

  // --- Popup (bygges kun én gang) ---
  if (!document.getElementById('edit-popup')) {
    const popup = document.createElement('div');
    popup.id = 'edit-popup';
    popup.style.cssText = `
      display:none; position:fixed; inset:0;
      background:rgba(0,0,0,0.5); z-index:9999;
      align-items:center; justify-content:center;
    `;
    popup.innerHTML = `
      <div id="edit-popup-content" style="
        background:#1f2937; color:#f9fafb;
        border-radius:8px; padding:20px; width:320px;
        font-family:system-ui; box-shadow:0 0 20px rgba(0,0,0,0.3);
      ">
        <h3 style="font-size:16px;margin-bottom:10px;">Rediger kontaktinfo</h3>
        <label style="display:block;margin-bottom:6px;">E-post</label>
        <input id="edit-email" type="text" style="width:100%;margin-bottom:10px;padding:6px;border-radius:4px;border:1px solid #374151;background:#111827;color:#f9fafb;">
        <label style="display:block;margin-bottom:6px;">Telefon</label>
        <input id="edit-phone" type="text" style="width:100%;margin-bottom:10px;padding:6px;border-radius:4px;border:1px solid #374151;background:#111827;color:#f9fafb;">
        <label style="display:block;margin-bottom:6px;">Nettside</label>
        <input id="edit-web" type="text" style="width:100%;margin-bottom:14px;padding:6px;border-radius:4px;border:1px solid #374151;background:#111827;color:#f9fafb;">
        <div style="text-align:right;">
          <button id="edit-cancel" style="margin-right:8px;background:#374151;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">Avbryt</button>
          <button id="edit-save" style="background:#2563eb;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">Lagre</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
  }

  // --- Popup funksjon ---
  function openEditPopup(item, orgnr) {
    const popup = document.getElementById('edit-popup');
    const emailEl = document.getElementById('edit-email');
    const phoneEl = document.getElementById('edit-phone');
    const webEl   = document.getElementById('edit-web');
    const cancel  = document.getElementById('edit-cancel');
    const saveBtn = document.getElementById('edit-save');

    emailEl.value = getEmail(item);
    phoneEl.value = getPhone(item);
    webEl.value   = getWeb(item);

    popup.style.display = 'flex';

    cancel.onclick = () => popup.style.display = 'none';

    saveBtn.onclick = () => {
      const newEmail = emailEl.value.trim();
      const newPhone = phoneEl.value.trim();
      const newWeb   = webEl.value.trim();

      // Oppdater i gSelectbedrifter
      const idx = (gSelectbedrifter || []).findIndex(b => getOrgnr(b) === orgnr);
      if (idx >= 0) {
        gSelectbedrifter[idx] = {
          ...gSelectbedrifter[idx],
          epostadresse: newEmail,
          telefon: newPhone,
          hjemmeside: newWeb
        };
        localStorage.setItem('gSelectbedrifter', JSON.stringify(gSelectbedrifter));
      }

      popup.style.display = 'none';
      renderSelect(gSelectbedrifter);
    };
  }
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

function updateSelectCounterDark(
  sumTotal = 0,
  sumEmail = 0,
  sumWeb = 0,
  sumPhone = 0,
  sumReady = 0,
  sumPortal = 0
) 


{
  const counter = document.getElementById('counterlistselect');
  if (!counter) return;

  counter.innerHTML = '';

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

  const colors = {
    total:   { bg: '#1E3A8A1A', text: '#93C5FD', border: '#1E3A8A40' }, // blå
    portal:  { bg: '#064E3B33', text: '#6EE7B7', border: '#10B98140' }, // grønn
    utvalg:  { bg: '#1E40AF33', text: '#93C5FD', border: '#3B82F640' }, // lys blå
    ready:   { bg: '#78350F33', text: '#FACC15', border: '#CA8A0440' }, // gul
    email:   { bg: '#312E8122', text: '#A78BFA', border: '#7C3AED40' }, // lilla
    web:     { bg: '#07598533', text: '#38BDF8', border: '#0EA5E940' }, // cyan
    phone:   { bg: '#14532D33', text: '#4ADE80', border: '#22C55E40' }  // grønn
  };

  const totalEl  = makeChip('Totalt', sumTotal, colors.total);
  const emailEl  = makeChip('Har e-post', sumEmail, colors.email);
  const webEl    = makeChip('Har nettside', sumWeb, colors.web);
  const phoneEl  = makeChip('Har telefon', sumPhone, colors.phone);
  const readyEl  = makeChip('Klar', sumReady, colors.ready);
  const portalEl = makeChip('I portal', sumPortal, colors.portal);
  counter.append(totalEl, emailEl, webEl, phoneEl, readyEl, portalEl);
}

  
  
  
  