
document.getElementById('tabReadyButton').addEventListener('click', () => {
    renderReady(gReadybedrifter || []);
});

//når søkefeltet med id searchSelect endres skal renderSelect kjøres med gSelectbedrifter som inndata
document.getElementById("search-Select-ready").addEventListener("input", () => {
  renderReady(gReadybedrifter || []);
});


function renderReady(data) {
    const tbody = document.getElementById('rowlistReady');
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
  
    // Kontaktfelt helpers
    const getEmail = (it) =>
      String(it?.epostadresse ?? it?.epost ?? it?.email ?? it?.mail ?? '')
        .trim()
        .replace(/^mailto:/i, '');
    const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
    const hasEmail = (it) => !!getEmail(it);
  
    const getPhone = (it) =>
      String(it?.mobil ?? it?.mobilnummer ?? it?.telefon ?? it?.telefonnummer ?? it?.phone ?? it?.tlf ?? '').trim();
    const hasPhone = (it) => !!getPhone(it);
  
    const getWeb = (it) =>
      String(it?.hjemmeside ?? it?.hjemmesideurl ?? it?.hjemmesideUrl ??
        it?.web ?? it?.www ?? it?.website ?? it?.nettside ?? '').trim();
    const hasWeb = (it) => !!getWeb(it);
  
    // Sets for state
    const inPortalSet = new Set((window.gCustomers || []).map(getOrgnr).filter(Boolean));
    const inUtvalgSet = new Set((gSelectbedrifter || []).map(getOrgnr).filter(Boolean));
    const readySet    = new Set((window.gReadybedrifter || []).map(getOrgnr).filter(Boolean));
  
    // Ready-status
    const isReady = (it) => {
      const org = getOrgnr(it);
      if (readySet.has(org)) return true;
      const s = low(it?.status ?? '');
      return s === 'klar' || s === 'ready' || s.includes('klar for');
  
  
  
  
    };
  
    // Kontaktfilter (for ready-listen)
    const passesContactFilter = (item, filterVal) => {
      if (!filterVal) return true;
  
      const email = hasEmail(item);
      const web = hasWeb(item);
      const phone = hasPhone(item);
  
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
        case 'missing-email': return !email; // 👈 nytt filter for “mangler epost”
        default:             return true;
      }
    };

    // --- Les filtre ---
    const searchEl   = document.getElementById('search-Select-ready');
    const searchTerm = low(searchEl ? searchEl.value : '');
  
    const grpSel      = document.getElementById('filterGroupReadyMaster');
    const rawFilter   = grpSel ? grpSel.value : '';
    const filterGroup = String(rawFilter || '').trim(); // "" eller group-id
  
    // --- Filtrer grunnlag ---
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
  
    // --- TELLERE ---
    let sumTotal   = filteredData.length;
    let sumPortal  = 0;
    let sumEmail   = 0;
    let sumWeb     = 0;
    let sumPhone   = 0;
  
    // Lookup for handlers
    const byOrgnr = new Map(filteredData.map(it => [getOrgnr(it), it]));
  
    // --- Render rader ---
    (filteredData || []).forEach((b, i) => {
      const tr = document.createElement('tr');
      tr.classList.add('default-row');
  
      const org = getOrgnr(b);
      const rowIsPortal = inPortalSet.has(org);
      let isSendt = false;
  
      
  
      if (rowIsPortal) sumPortal++;
      if (hasEmail(b)) sumEmail++;
      if (hasWeb(b))   sumWeb++;
      if (hasPhone(b)) sumPhone++;
  
    
  
      const g = (gGroupbedrifter || []).find(gr => String(gr.id) === String(b.group ?? ''));
      const contactHtml = renderContactIcons(b);
      const checkboxAttrs = '';
    
  
      tr.innerHTML = `
        <td style="width:40px;">
          <input type="checkbox" class="selectcheckbox" data-orgnr="${org}" ${checkboxAttrs}>
        </td>
        <td class="mono" style="font-size:10px;">${org}</td>
        <td style="font-weight:700;font-size:12px;">${b.navn ?? '—'}</td>
        <td style="font-size:11px;">${fmtAddr(b)}</td>
        <td style="font-size:11px;">${g ? g.name : '—'}</td>
        <td style="font-size:11px;">${g ? (g.user || '—') : '—'}</td>
        <td style="font-size:11px;">${fmtDate(b.registreringsdatoEnhetsregisteret || b.registreringsdatoForetaksregisteret)}</td>
        <td class="contact-cell" style="font-size:11px;">${contactHtml}</td>
      `;
  
      
      if (!isSendt) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
          const t = e.target;
          if (t.closest('input[type="checkbox"]')) return;
          if (t.closest('a')) return;
          openEditPopup(b, org);
        });
      }
  
      tbody.appendChild(tr);
    });
  
    // --- Oppdater teller / chips ---
    if (typeof updateReadyCounterDark === 'function') {
        updateReadyCounterDark(
        sumTotal,
        sumPortal,
        sumEmail,
        sumWeb,
        sumPhone,  
        
      );
    } else {
      const counter = document.getElementById("counterlistready");
      if (counter) counter.textContent = `${sumTotal} Stk.`;
    }
  
    // --- Popup bygges én gang ---
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
          border-radius:8px; padding:20px; width:340px;
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
  
    // --- Popup logikk ---
    function openEditPopup(item, orgnr) {
      const popup  = document.getElementById('edit-popup');
      const emailEl = document.getElementById('edit-email');
      const phoneEl = document.getElementById('edit-phone');
      const webEl   = document.getElementById('edit-web');
      const cancel  = document.getElementById('edit-cancel');
      const saveBtn = document.getElementById('edit-save');
  
      //hvis det er fler en 1 checkbox som er huket av skal knappen document.getElementById('ba-enrich'); være skjult
      emailEl.value = getEmail(item);
      phoneEl.value = getPhone(item);
      webEl.value   = getWeb(item);
  
      popup.style.display = 'flex';
  
      cancel.onclick = () => popup.style.display = 'none';
  
      saveBtn.onclick = () => {
        const newEmail = emailEl.value.trim();
        const newPhone = phoneEl.value.trim();
        const newWeb   = webEl.value.trim();
  
        // Oppdater i gSelectbedrifter hvis finnes der
        const idx = (gReadybedrifter || []).findIndex(b => getOrgnr(b) === orgnr);
        if (idx >= 0) {
            gReadybedrifter[idx] = {
            ...gReadybedrifter[idx],
            epostadresse: newEmail,
            telefon: newPhone,
            hjemmeside: newWeb
          };
          try { localStorage.setItem('gReadybedrifter', JSON.stringify(gReadybedrifter)); } catch {}
        } else {
          // Fallback: oppdater den lokale data-listen (valgfritt)
          const srcIdx = (Array.isArray(data) ? data : []).findIndex(b => getOrgnr(b) === orgnr);
          if (srcIdx >= 0) {
            data[srcIdx] = { ...data[srcIdx], epostadresse: newEmail, telefon: newPhone, hjemmeside: newWeb };
          }
        }
  
        popup.style.display = 'none';
        renderReady(gReadybedrifter || data);
      };
    }
  
    // --- Massebehandling UI + handlers ---
    const bulkBar   = document.getElementById('ready-bulk-actions');
    const bulkCount = document.getElementById('ready-bulk-count');
    const btnRemove = document.getElementById('ra-remove');
    const btnMove   = document.getElementById('ra-move');
    const btnStart = document.getElementById('ra-start');
   
    function getSelectedOrgnrs() {
      return Array.from(tbody.querySelectorAll('.selectcheckbox'))
        .filter(cb => cb.checked && !cb.disabled) // ready-rader (disabled) ekskluderes
        .map(cb => normalizeOrgnr(cb.dataset.orgnr))
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
  
    // Fjern fra utvalg
    if (btnRemove) {
      btnRemove.onclick = () => {
        const orgnrs = getSelectedOrgnrs();
        if (!orgnrs.length) return;
        if (!confirm(`Fjerne ${orgnrs.length} bedrift(er) fra klar status?`)) return;
  
        gSelectbedrifter = (gSelectbedrifter || []).filter(
          b => !orgnrs.includes(normalizeOrgnr(b.organisasjonsnummer))
        );
        try { localStorage.setItem('gSelectbedrifter', JSON.stringify(gReadybedrifter)); } catch(e){}
  
        renderReady(gReadybedrifter);
      };
    }
  
    // Flytt til annen gruppe
    if (btnMove) {
      btnMove.onclick = async () => {
        const orgnrs = getSelectedOrgnrs();
        if (!orgnrs.length) return;
  
        let groupId = null;
        if (typeof pickGroupViaDialog === 'function') groupId = await pickGroupViaDialog();
        else groupId = prompt('Lim inn gruppe-ID som selskapene skal flyttes til:');
        if (!groupId) return;
  
        (gReadybedrifter || []).forEach(b => {
          if (orgnrs.includes(normalizeOrgnr(b.organisasjonsnummer))) b.group = String(groupId);
        });
        try { localStorage.setItem('gSelectbedrifter', JSON.stringify(gSelectbedrifter)); } catch(e){}
  
        renderReady(gReadybedrifter);
      };
    }
  
    // Klar til sending
    if (btnStart) {
        btnStart.onclick = () => {

        const orgnrs = getSelectedOrgnrs();
        if (!orgnrs.length) {
          alert('Velg minst ett selskap først.');
          return;
        }

        //oppdatere gReadybedrifter med status "EpostStartet" for valgte orgnr
        (gReadybedrifter || []).forEach(b => {
          if (orgnrs.includes(normalizeOrgnr(b.organisasjonsnummer))) {
            b.status = "EpostStartet";
          }
        });

        try { localStorage.setItem('gReadybedrifter', JSON.stringify(gReadybedrifter)); } catch(e){}
        

        //start massesendeprosess og lagring i db
        startMultisaveProcess(orgnrs);
        renderReady(gReadybedrifter);

        }

    }
  
    // Ev. annen teller
    updateCounter("label-ready-customers", (gReadybedrifter || []).length, 1000);
  }




  function updateReadyCounterDark( 
    sumTotal = 0,
    sumPortal = 0,
    sumEmail = 0,
    sumWeb = 0,
    sumPhone = 0,
    
  ) 
  
  
  {
    const counter = document.getElementById('counterlistready');
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

    let colors = colorsPalett;
  
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
  
   
  
    const totalEl  = makeChip('Totalt', sumTotal, colors.total);
    const portalEl = makeChip('I portal', sumPortal, colors.portal);
    const emailEl  = makeChip('Har e-post', sumEmail, colors.email);
    const webEl    = makeChip('Har nettside', sumWeb, colors.web);
    const phoneEl  = makeChip('Har telefon', sumPhone, colors.phone);
    
    counter.append(totalEl, emailEl, webEl, phoneEl, portalEl);
  }




