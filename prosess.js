function renderProsess(data){

        const tbody = document.getElementById('rowlistProsess');
        if (!tbody) return;
        tbody.innerHTML = '';
      
      
      
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
      
       
        // --- Les filtre ---
        const searchEl   = document.getElementById('search-input-prosess');
        const searchTerm = low(searchEl ? searchEl.value : '');
      
        const grpSel      = document.getElementById('filterGroupProsessMaster');
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
      
      
        // Lookup for handlers
        const byOrgnr = new Map(filteredData.map(it => [getOrgnr(it), it]));
      
        // --- Render rader ---
        (filteredData || []).forEach((b, i) => {
          const tr = document.createElement('tr');
          tr.classList.add('default-row');
      
          const org = getOrgnr(b);
      
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
      
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', (e) => {
              const t = e.target;
              if (t.closest('input[type="checkbox"]')) return;
              if (t.closest('a')) return;
              openEditPopup(b, org);
            });
          
      
          tbody.appendChild(tr);
    

        });
   

}