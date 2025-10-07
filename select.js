//når knappen med id tabSelectButton trykkes skal funksjonen starteSelection kjøres med gSelectbedrifter som inndata
document.getElementById("tabSelectButton").addEventListener("click", () => {
    startSelection(gSelectbedrifter);
  });
  

function startSelection(data) {
    
   
        const list = document.getElementById('rowlistSelect');
        const library = document.getElementById('elementlibrary');
        const nodeRow = library.querySelector('.default-row');
        
    
      
        // ------------------------------------------------------------
        // 🧹 4. Tøm liste og fyll med resultat
        // ------------------------------------------------------------
        list.innerHTML = '';
        const counterlistbrreg = document.getElementById('counterlistutvalg');
        const count = filteredData.length || 0;
        counterlistbrreg.textContent =
          `${count} stk. nyregistrerte bedrifter${preset ? ' (filtrert)' : ''}`;
      
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
}
      

