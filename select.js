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
document.getElementById("filterGroupSelect").addEventListener("change", () => {
    renderSelect(gSelectbedrifter);
});



function renderSelect(data){
    const tbody = document.getElementById('rowlistSelect');
    if (!tbody) return;
    tbody.innerHTML = '';
  
    // Hjelpere for trygg tekst
    const val = v => (v == null ? '' : String(v));
    const low = v => val(v).toLowerCase();
  
    // Les filtre
    const searchEl = document.getElementById('searchSelect');
    const searchTerm  = low(searchEl ? searchEl.value : '');
  
    // ---- robust gruppefilter ----
    const sel = document.getElementById('filterGroupSelect');
    const rawFilter = sel ? sel.value : '';            // "" = alle, ellers en id
    const filterGroup = String(rawFilter || '').trim(); // normaliser

    let filteredData = Array.isArray(data) ? data.slice() : [];

    // ""  -> vis alle
    // "__none__" (hvis du bruker det) -> vis uten gruppe
    // ellers -> eksakt match (trimmet streng) mot b.group
    if (filterGroup === ''|| filterGroup.toLowerCase() === 'all') {
    // ingen filtrering
    } else {
    filteredData = filteredData.filter(
        b => String(b.group ?? '').trim() === filterGroup
    );
    }
  
    // 2) Tekstsøk (navn, orgnr, adresse, postnr, poststed, + evt gruppenavn/ansvarlig)
    if (searchTerm) {
      filteredData = filteredData.filter(b => {
        const a   = b?.forretningsadresse || b?.postadresse || {};
        const adr = Array.isArray(a.adresse) ? a.adresse.join(', ') : a.adresse;
  
        // enkel gruppeoppslag for å kunne søke på gruppenavn/ansvarlig
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
  
    // Oppdater teller om den finnes
    const counter = document.getElementById("counterlistutvalg");
    if (counter) counter.textContent = `${filteredData.length} Stk.`;
  
    // Render rader
    (filteredData || []).forEach((b, i) => {
      const tr = document.createElement('tr');
      tr.classList.add('default-row');
  
      // gruppe for visning
      const g = (gGroupbedrifter || []).find(gr => gr.id == b.group);
  
      const fmtDate = (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        return isNaN(dt) ? d : dt.toLocaleDateString('no-NO');
      };
  
      const adresse = b.forretningsadresse
        ? `${Array.isArray(b.forretningsadresse.adresse) ? b.forretningsadresse.adresse.join(', ') : (b.forretningsadresse.adresse || '')}, ${b.forretningsadresse?.postnummer || ''} ${b.forretningsadresse?.poststed || ''}`
            .replace(/^,\s*|\s*,\s*$/g,'').trim() || '—'
        : '—';
  
      tr.innerHTML = `
        <td style="width:40px;">
          <input
            type="checkbox"
            class="selectcheckbox"
            data-orgnr="${b.organisasjonsnummer || ''}"
            id="sel${i}"
          />
        </td>
        <td class="mono">${b.organisasjonsnummer ?? '—'}</td>
        <td>${b.navn ?? '—'}</td>
        <td>${adresse}</td>
        <td>${g ? g.name : '—'}</td>
        <td>${g ? (g.user || '—') : '—'}</td>
        <td>${fmtDate(b.registreringsdatoEnhetsregisteret || b.registreringsdatoForetaksregisteret)}</td>
        <td class="status">${b.status || 'Valgt'}</td>
      `;
  
      tbody.appendChild(tr);
    });
  }
  
  
  