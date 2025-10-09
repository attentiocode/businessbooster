//når knappen med id tabSelectButton trykkes skal funksjonen starteSelection kjøres med gSelectbedrifter som inndata
document.getElementById("tabSelectButton").addEventListener("click", () => {
    startSelection(gSelectbedrifter);
});

document.getElementById("getInfoFromProff").addEventListener("click", () => {
    const list = document.getElementById('rowlistSelect');
    const checkboxes = list.querySelectorAll(".selectcheckbox:checked");
    const orgnrs = Array.from(checkboxes).map(cb => cb.dataset.orgnr).filter(Boolean);
    if (orgnrs.length === 0) {
        alert("Ingen selskaper valgt.");
        return;
    }
    
    logCompanyOnce("998766834","dataFromProff");
});

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
  
    // --- Les filtre ---
    const searchEl = document.getElementById('searchSelect');
    const searchTerm  = low(searchEl ? searchEl.value : '');
  
    const sel = document.getElementById('filterGroupSelectMaster');
    const rawFilter = sel ? sel.value : '';                  // "" = alle
    const filterGroup = String(rawFilter || '').trim();      // normaliser
  
    // --- Filtrer ---
    let filteredData = Array.isArray(data) ? data.slice() : [];
  
    // Gruppefilter
    if (!(filterGroup === '' || filterGroup.toLowerCase() === 'all')) {
      filteredData = filteredData.filter(b => String(b.group ?? '').trim() === filterGroup);
    }
  
    // Tekstsøk (navn, orgnr, adresse, postnr, poststed, + gruppenavn/ansvarlig)
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
  
    // Oppdater teller
    const counter = document.getElementById("counterlistutvalg");
    if (counter) counter.textContent = `${filteredData.length} Stk.`;
  
    // --- Render rader ---
    (filteredData || []).forEach((b, i) => {
      const tr = document.createElement('tr');
      tr.classList.add('default-row');
  
      const g = (gGroupbedrifter || []).find(gr => gr.id == b.group);
  
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
        <td class="status" style="font-size:10px;">${b.status || 'Valgt'}</td>
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
        .filter(cb => cb.checked && !cb.disabled) // ikke tell disabled
        .map(cb => cb.dataset.orgnr)
        .filter(Boolean);
    }
  
    function updateBulkUI() {
      const n = getSelectedOrgnrs().length;
      if (bulkBar)   bulkBar.style.display = n > 0 ? 'flex' : 'none';
      if (bulkCount) bulkCount.textContent = `${n} valgt`;
    }
  
    // Lytt på endringer i alle (ikke-disablede) checkbokser
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
  
        // re-render fra utvalget (eller fra filteredData hvis du ønsker å beholde filteret)
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
  
        console.log("Henter mer data for valgte selskaper...", orgnrs);
      };
    }
  }
  
  
  
  