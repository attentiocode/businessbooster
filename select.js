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
    
   /*
        const list = document.getElementById('rowlistSelect');
        const library = document.getElementById('elementlibrary');
        const nodeRow = library.querySelector('.default-row');
        
    
      
        // ------------------------------------------------------------
        // 🧹 4. Tøm liste og fyll med resultat
        // ------------------------------------------------------------
        list.innerHTML = '';

        //opdatert counter
        const counterlistutvalg = document.getElementById("counterlistutvalg");
        counterlistutvalg.textContent = `Totalt: ${data.length}`;
        
        
      
        data.forEach((item) => {
          const node = nodeRow.cloneNode(true);
      
          node.querySelector('.org-nr').textContent =
            item.organisasjonsnummer || 'Ukjent org.nr';
          node.querySelector('.company-name').textContent =
            item.navn || 'Ukjent navn';
          node.querySelector('.start-date').textContent =
            item.registreringsdatoEnhetsregisteret || 'Ukjent dato';
          node.querySelector('.address').textContent = item.forretningsadresse
            ? `${item.forretningsadresse?.adresse || ''}, ${
                item.forretningsadresse?.postnummer || ''
              } ${item.forretningsadresse?.poststed || ''}`.trim()
            : 'Ukjent adresse';
      
          //hvis dette selskaper alt er i gSelectbedrifter så skal den være disabled
          const alreadyReady = gReadybedrifter.some(
            (b) => b.organisasjonsnummer === item.organisasjonsnummer
          );
       
          let statusText = "Utvalg";
          if(alreadyReady){
              statusText = "Klar";
          }
          node.querySelector('.status').textContent = statusText;
      
      
          //marker raden node som valgt hvis alreadySelected
          if (alreadyReady) {
            node.classList.add('selected');
          }
      
          const checkbox = node.querySelector('.selectcheckbox');
          checkbox.dataset.orgnr = item.organisasjonsnummer || '';
          if (alreadyReady) {
            checkbox.disabled = true;
            checkbox.checked = true;
          }
          //når checkbox endres så skal counter oppdateres
          checkbox.addEventListener('change', () => {
            const container = list;
            const checkboxes = container.querySelectorAll(".selectcheckbox:checked");
            const counterlistbrregselected = document.getElementById("counterlistutvalgselect");
            counterlistbrregselected.style.display = checkboxes.length > 0 ? "inline" : "none";
            const selectedCount = checkboxes.length || 0;
            counterlistbrregselected.textContent = `${selectedCount} valgt`;
      
            const sentToReady = document.getElementById("sentToReady");
            sentToReady.style.display = checkboxes.length > 0 ? "inline-block" : "none";
      
          });
      
          list.appendChild(node);
        });
        */
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



function renderSelect(data) {
    const tbody = document.getElementById('rowlistSelect');
    if (!tbody) return;
    tbody.innerHTML = '';
  
    // ---- Hjelpere ----
    const val = v => (v == null ? '' : String(v));
    const low = v => val(v).toLowerCase();
    const getGroupId = b => val(b?.group ?? b?.groupId ?? b?.gruppeId).trim();
  
    const fmtDate = (d) => {
      if (!d) return '—';
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      // vis som dd.mm.yyyy
      return dt.toLocaleDateString('no-NO');
    };
  
    const fmtAddr = (b) => {
      const a = b?.forretningsadresse || b?.postadresse || {};
      const adr = Array.isArray(a.adresse) ? a.adresse.join(', ') : a.adresse;
      const parts = [adr, a.postnummer, a.poststed].filter(Boolean);
      return parts.length ? parts.join(', ') : '—';
    };
  
    // Bygg gruppe-index (tåler ulike id-felt)
    const groupIdx = (window.gGroupbedrifter || []).reduce((m, g) => {
      const keys = [
        g?.id, g?.airtableid, g?.groupId, g?.gruppeId
      ].map(x => val(x).trim()).filter(Boolean);
      keys.forEach(k => { m[k] = g; });
      return m;
    }, {});
  
    const resolveGroup = (b) => {
      const gid = getGroupId(b);
      if (!gid) return null;
      return groupIdx[gid] || null;
    };
  
    // ---- Filtre fra UI ----
    const filterGroup = val(document.getElementById('filterGroupSelect')?.value || 'ALL').trim();
    const searchTerm = low(document.getElementById('searchSelect')?.value || '');
  
    let filteredData = Array.isArray(data) ? data.slice() : [];
  
    // 1) Gruppefilter (ALL = alle, __none__ = uten gruppe)
    if (filterGroup && filterGroup !== 'ALL') {
      if (filterGroup === '__none__') {
        filteredData = filteredData.filter(b => getGroupId(b) === '');
      } else {
        filteredData = filteredData.filter(b => getGroupId(b) === filterGroup);
      }
    }
  
    // 2) Tekstsøk (navn, orgnr, adresse, postnr, poststed, gruppenavn/ansvarlig)
    if (searchTerm) {
      filteredData = filteredData.filter(b => {
        const g = resolveGroup(b);
        const a = b?.forretningsadresse || b?.postadresse || {};
        const adr = Array.isArray(a.adresse) ? a.adresse.join(', ') : a.adresse;
  
        return (
          low(b?.navn).includes(searchTerm) ||
          val(b?.organisasjonsnummer).includes(searchTerm) ||
          low(adr).includes(searchTerm) ||
          val(a?.postnummer).includes(searchTerm) ||
          low(a?.poststed).includes(searchTerm) ||
          (g && (low(g.name).includes(searchTerm) || low(g.user).includes(searchTerm)))
        );
      });
    }
  
    // ---- Render rader ----
    (filteredData || []).forEach((b, i) => {
      const g = resolveGroup(b);
      const tr = document.createElement('tr');
      tr.classList.add('default-row');
  
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
        <td>${fmtAddr(b)}</td>
        <td>${g ? g.name : '—'}</td>
        <td>${g ? (g.user || '—') : '—'}</td>
        <td>${fmtDate(b.registreringsdatoEnhetsregisteret || b.registreringsdatoForetaksregisteret)}</td>
        <td class="status">${b.status || 'Valgt'}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  