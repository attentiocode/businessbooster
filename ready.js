
document.getElementById('tabReadyButton').addEventListener('click', () => {
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
    const searchEl   = document.getElementById('searchSelect-ready');
    const searchTerm = low(searchEl ? searchEl.value : '');
  
    const grpSel      = document.getElementById('filterGroupReadyMaster');
    const rawFilter   = grpSel ? grpSel.value : '';
    const filterGroup = String(rawFilter || '').trim(); // "" eller group-id
  
    const infoSel     = document.getElementById('select-contact-info-ready-filter');
    const infoFilter  = infoSel ? String(infoSel.value || '') : '';
  
    const stateSel     = document.getElementById('select-contact-state-ready-filter');
    const stateFilter  = stateSel ? String(stateSel.value || '') : ''; // '', 'portal', 'utvalg', 'ready'
  
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
  
    // Kontaktfilter
    if (infoFilter) {
      filteredData = filteredData.filter(b => passesContactFilter(b, infoFilter));
    }
  
    // Statefilter (for select-listen)
    if (stateFilter) {
      filteredData = filteredData.filter(b => {
        const org = getOrgnr(b);
        if (stateFilter === 'ready')  return isReady(b);
        if (stateFilter === 'utvalg') return inUtvalgSet.has(org);
        if (stateFilter === 'portal') return inPortalSet.has(org);
        return true;
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
      let rowIsReady  = isReady(b);
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
        sumEmail,
        sumWeb,
        sumPhone,  
        sumPortal
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
        renderReady(gReadybedrifter);

        //start funksjonen startEmailProcess med de valgte orgnr
        startEmailProcess(orgnrs);
        }

    }
  
    // Ev. annen teller
    updateCounter("label-ready-customers", (gReadybedrifter || []).length, 1000);
  }




  function updateReadyCounterDark(
    sumTotal = 0,
    sumEmail = 0,
    sumWeb = 0,
    sumPhone = 0,
    sumPortal = 0,
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
    const portalEl = makeChip('I portal', sumPortal, colors.portal);
    counter.append(totalEl, emailEl, webEl, phoneEl, portalEl);
  }



function startEmailProcess(orgnrList) {

    //skal sende epost til hver orgnr i listen til funkjsonen sendEmailToCompany
    orgnrList.forEach(orgnr => {
        sendEmailToCompany(orgnr);
    });
}

function sendEmailToCompany(orgnr) {
    // Simulert sending av e-post til en bedrift basert på org.nr
    console.log(`Sender e-post til bedrift med org.nr: ${orgnr}`);
  //hent opp bedriftsdata fra gReadybedrifter
    const company = (gReadybedrifter || []).find(b => {
        const bOrgnr = String(b.organisasjonsnummer || b.orgnr || b.orgNr || b.OrganizationNumber || '').replace(/\D/g, '').padStart(9, '0');
        return bOrgnr === orgnr;
    });
    if (!company) {
        console.error(`Fant ikke bedrift med org.nr: ${orgnr}`);
        return;
    }

    let emailBody = getEmailBody(company,null);
    let subject = `Kort om hvordan Innkjøps-gruppen kan gi dere bedre innkjøpsbetingelser og lavere kostnader.`;

    const payload = {
        orgnr: orgnr,
        navn: company.navn || '',
        epost: company.epostadresse || '',
        telefon: company.telefon || '',
        hjemmeside: company.hjemmeside || '',
        emailBody: emailBody,
        subject: subject
    };

    //sende til zapier
    let url = "https://hooks.zapier.com/hooks/catch/24993663/uragru1/"
    
    sendDataToZapierWebhook(payload, url);

    //oppdatere status i gReadybedrifter til "sendt"
    company.status = "EpostSendt";
    updateCounter("label-mailer-sendt", countReadyAndSendtCostumers(), 1000);


}

async function sendDataToZapierWebhook(data,url) {
    const formData = new FormData();
    for (const key in data) {
        const value = data[key];
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }

    const response = await fetch(url, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        console.error("Error sending data to Zapier:", response.statusText);
    }
}


function getEmailBody(company, type) {
    const orgnr   = String(company?.organisasjonsnummer ?? company?.orgnr ?? '').replace(/\D/g,'').padStart(9,'0');
    const navn    = company?.navn || '';
    const kontakt = company?.kontaktperson?.navn || company?.lederNavn || '';
    const greetingName = kontakt || navn || 'der';
  
    const preheader = `Prøv Innkjøps-gruppen helt uforpliktet i 30 dager – sparer du ikke, betaler du ikke.`;
    const ctaHrefTrial = 'https://www.innkjops-gruppen.no/prov-gratis';
    const ctaHrefContact = 'mailto:post@innkjops-gruppen.no';
  
    return `
    <!doctype html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Innkjøps-gruppen</title>
      <style>
        body,table,td,p { margin:0; padding:0; }
        img { border:0; outline:none; text-decoration:none; display:block; }
        a { text-decoration:none; }
        .container { width:100%; background:#0B1220; padding:24px 0; }
        .card {
          width:100%; max-width:640px; margin:0 auto;
          background:#0F172A; color:#E5E7EB;
          border:1px solid #1F2937; border-radius:12px; overflow:hidden;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }
        .header { padding:20px 24px; border-bottom:1px solid #1F2937; }
        .title  { font-size:20px; font-weight:700; color:#F3F4F6; margin:0; }
        .subtle { font-size:12px; color:#93A1B3; }
        .content { padding:24px; line-height:1.55; font-size:14px; color:#E5E7EB; }
        .list { margin:12px 0 18px; padding-left:18px; }
        .list li { margin:6px 0; }
        .chip {
          display:inline-block; font-size:12px; padding:4px 10px; border-radius:9999px;
          background:rgba(37,99,235,0.12); color:#93C5FD; border:1px solid rgba(37,99,235,0.35);
          margin-right:6px; margin-top:8px;
        }
        .cta {
          display:inline-block; margin-top:18px; padding:12px 22px; font-weight:700;
          background:#2563EB; color:#ffffff; border-radius:8px; border:1px solid #1D4ED8;
        }
        .cta-secondary {
          display:inline-block; margin-top:12px; padding:10px 20px; font-weight:600;
          background:transparent; color:#60A5FA; border-radius:8px; border:1px solid #1E3A8A;
        }
        .meta { margin-top:20px; font-size:13px; color:#9CA3AF; }
        .highlight {
          font-size:16px; color:#FBBF24; font-weight:600;
          margin-top:20px; text-align:center;
        }
        .signature { padding:20px 24px; border-top:1px solid #1F2937; background:#0B1220; }
        @media (max-width:480px) {
          .content { padding:20px; }
          .header { padding:16px 20px; }
          .signature { padding:16px 20px; }
        }
      </style>
    </head>
    <body style="background:#0B1220; margin:0;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden;">
        ${preheader}
      </div>
  
      <div class="container">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <table role="presentation" class="card" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header">
                    <p class="title">Smarte innkjøp for bedre lønnsomhet</p>
                    <p class="subtle">Til ${navn ? navn : 'deres virksomhet'} ${orgnr ? '(org.nr ' + orgnr + ')' : ''}</p>
                  </td>
                </tr>
  
                <tr>
                  <td class="content">
                    <p>Hei ${escapeHtml(greetingName)},</p>
                    <p style="margin-top:10px;">
                      Vi i <strong>Innkjøps-gruppen</strong> hjelper bedrifter å redusere kostnader og oppnå bedre avtaler –
                      helt uten binding. Dere får tilgang til fremforhandlede priser og rammeavtaler med solide leverandører
                      innenfor de viktigste innkjøpsområdene.
                    </p>
  
                    <ul class="list">
                      <li><strong>Lavere priser</strong> gjennom felles volum</li>
                      <li><strong>Forutsigbare vilkår</strong> og enklere administrasjon</li>
                      <li><strong>Ingen binding</strong> – prøv oss risikofritt</li>
                      <li><strong>Personlig oppfølging</strong> fra vårt erfarne team</li>
                    </ul>
  
                    <div class="highlight">
                      Sparer du ikke – betaler du ikke.
                    </div>
  
                    <a href="${ctaHrefTrial}" class="cta" target="_blank" rel="noopener">
                      Prøv oss helt uforpliktet i 30 dager
                    </a>
  
                    <a href="${ctaHrefContact}" class="cta-secondary" target="_blank" rel="noopener">
                      Har du spørsmål? Ta gjerne kontakt her
                    </a>
  
                    <div class="meta">
                      Mange bedrifter sparer betydelige summer allerede første måned – la oss vise deg hvordan.
                    </div>
                  </td>
                </tr>
  
                <tr>
                  <td class="signature">
                    <p>&nbsp;<strong>innkj&oslash;psGRUPPEN<br /></strong>
                      <span>Mobil:&nbsp;+47 91 14 52 94</span><br />
                      <span>Epost: </span><u><a href="mailto:post@innkjops-gruppen.no">post@innkjops-gruppen.no</a><br /><br /></u>
                      <u><a href="http://www.innkjops-gruppen.no/">www.innkjops-gruppen.no</a><br />
                        <img width="400" height="109" alt="" src="https://uploads-ssl.webflow.com/6346cf959f8b0bccad5075af/65a8e9fe0b759f07aa7d7b13_image002.png" />
                      </u><strong></strong>
                    </p>
                  </td>
                </tr>
  
              </table>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `;
  }
  
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
  }
  
  
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
  }
  
  
  /* Enkel HTML-escaping for hilsning */
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
  }

