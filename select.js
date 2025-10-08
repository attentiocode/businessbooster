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
      

// Forventet globalt:
// gSelectbedrifter: [{organisasjonsnummer, navn, forretningsadresse, registreringsdatoEnhetsregisteret, group, ...}]
// gGroupbedrifter:  [{id, name, user, desc}]


  function renderSelect(data){

    const tbody = document.getElementById('rowlistSelect');
    if (!tbody) return;
  
    tbody.innerHTML = '';
  

    (data || []).forEach((b, i) => {
  
        const tr = document.createElement('tr');
        tr.classList.add('default-row');

        const g = gGroupbedrifter.find(gr => gr.id === b.group);
        const fmtDate = (d) => {
          if (!d) return '—';
          const dt = new Date(d);
          if (isNaN(dt)) return d;
          return dt.toISOString().split('T')[0];
        }
        const adresse = b.forretningsadresse
          ? `${b.forretningsadresse?.adresse || ''}, ${
              b.forretningsadresse?.postnummer || ''
            } ${b.forretningsadresse?.poststed || ''}`.trim()
          : '—';
  
        tr.innerHTML = `
          <td style="width:40px;">
            <input
              type="checkbox"
              class="selectcheckboxSelect"
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
  