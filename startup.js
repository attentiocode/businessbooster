let gBrregbedrifter = JSON.parse(localStorage.getItem('gBrregbedrifter') || '[]');
let gSelectbedrifter = JSON.parse(localStorage.getItem('gSelectbedrifter') || '[]');
let gReadybedrifter = JSON.parse(localStorage.getItem('gReadybedrifter') || '[]');
let gGroupbedrifter = JSON.parse(localStorage.getItem('gGroupbedrifter') || '[]');
let gCustomers = [];
let userid = null;


document.getElementById("select-field-preset").addEventListener('change', (e) => {
    startBrregList(gBrregbedrifter);
});

//sideknappene rooting
document.getElementById("dashboardSideButton").addEventListener("click", function() {
    document.getElementById("dashboardTabButton").click();
});

document.getElementById("groupSideButton").addEventListener("click", function() {
    document.getElementById("groupTabButton").click();
});

document.getElementById("presetSideButton").addEventListener("click", function() {
    document.getElementById("presetTabButton").click();
});


const fmt = d => d.toISOString().slice(0, 10);

const startOfISOWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = mandag
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
};

const endOfISOWeek = (date = new Date()) => {
  const start = startOfISOWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

async function hentNystartedeIPeriode({ fra, til, size = 200 }) {
  const base = 'https://data.brreg.no/enhetsregisteret/api/enheter';
  const alle = [];
  let page = 0;

  while (true) {
    const url = new URL(base);
    url.searchParams.set('fraRegistreringsdatoEnhetsregisteret', fra);
    url.searchParams.set('tilRegistreringsdatoEnhetsregisteret', til);
    url.searchParams.set('size', String(size));
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'registreringsdatoEnhetsregisteret,DESC');

    const res = await fetch(url.href, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Feil fra BRREG: ${res.status}`);

    const data = await res.json();
    const batch = data?._embedded?.enheter ?? [];
    alle.push(...batch);

    const hasNext = Boolean(data?._links?.next?.href);
    const totalPages = data?.page?.totalPages;

    if (batch.length === 0) break;
    if (totalPages != null && page + 1 >= totalPages) break;
    if (!hasNext) break;

    page++;
    if (alle.length >= 9500 || page > 2000) break; // failsafes
  }

  return alle;
}

async function hentNystartede({ fra, til, size = 200 } = {}) {
  if (!fra || !til) {
    const idag = new Date();
    fra = fmt(startOfISOWeek(idag));
    til = fmt(idag); // frem til i dag
  }
  return hentNystartedeIPeriode({ fra, til, size });
}


function loadSelectors(data){


   

    //Finne alle typer næringer
    const allActivities = new Set();
    data.forEach(item => {
        if (item.naeringskode1 && item.naeringskode1.beskrivelse) {
            allActivities.add(item.naeringskode1.beskrivelse);
        }
    });
    //Sorter alfabetisk
    const sortedActivities = Array.from(allActivities).sort((a, b) => a.localeCompare(b));

    //fyll presetfilter
    const industrieselect = document.getElementById('industries');
    //tømm selector
    industrieselect.innerHTML = ''; // 

    //legg til options
    sortedActivities.forEach(activity => {
        const option = document.createElement('option');
        option.value = activity;
        option.textContent = activity;
        industrieselect.appendChild(option);
    }
    );

    /*
    //Fyll select filter
    const selectorActivity = document.getElementById('select-field-activity');
    //tømm selector
    selectorActivity.innerHTML = '<option value="">— Velg næring —</option>'; // Bevar første option
    //legg til options
    sortedActivities.forEach(activity => {
        const option = document.createElement('option');
        option.value = activity;
        option.textContent = activity;
        selectorActivity.appendChild(option);
    }
    );

    */

}


function formatDate(d) {
    return d.toLocaleDateString("no-NO"); // DD.MM.YYYY
}
  
function getPeriods() {
    const today = new Date();
  
    // Denne uken (mandag → søndag)
    const day = (today.getDay() + 6) % 7; // 0 = mandag
    const monday = new Date(today);
    monday.setDate(monday.getDate() - day);
    monday.setHours(0, 0, 0, 0);
  
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
  
    const ukeValue = `${formatDate(monday)}-${formatDate(sunday)}`;
  
    // Denne måneden (1. → siste dag)
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
    const mndValue = `${formatDate(firstDay)}-${formatDate(lastDay)}`;
  
    return [
      { title: "Denne uken", value: ukeValue },
      { title: "Denne måneden", value: mndValue },
    ];
}
  
function loadPeriodsIntoSelector(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
  
    const periods = getPeriods();
    select.innerHTML = ""; // tøm eksisterende
  
    periods.forEach(p => {
      const option = document.createElement("option");
      option.value = p.value;
      option.textContent = p.title;
      select.appendChild(option);
    });
}
  
document.getElementById("brregmastercheckbox").addEventListener("change", function() {
    const container = document.getElementById("rowlist");
    const checkboxes = container.querySelectorAll(".selectcheckbox");
    checkboxes.forEach(cb => {
      // kun de som ikke er disabled
      if (!cb.disabled){
      cb.checked = this.checked;
      }
    });
    
});


document.getElementById("selectmastercheckbox").addEventListener("change", function() {
    const container = document.getElementById("rowlistSelect");
    const checkboxes = container.querySelectorAll(".selectcheckbox")
    checkboxes.forEach(cb => {
      // kun de som ikke er disabled
      if (!cb.disabled){
      cb.checked = this.checked;
      }
    });

    //hvis det er mer en 1 checkbox som er valgt så gjør maassbehandling synlig
    const bulkBar   = document.getElementById('select-bulk-actions');
    const checkboxesChecked = container.querySelectorAll(".selectcheckbox:checked");
    if (checkboxesChecked.length > 0){
      bulkBar.style.display = "flex";
      const bulkCount = document.getElementById('select-bulk-count');
      //finne ut hvor mange chackboxer som er checked i listen med id rowlistSelect
      const checkedCount = checkboxes.length;
      bulkCount.textContent = `${checkedCount} valgt`;

    }else{
      bulkBar.style.display = "none";
    }
    
});

function ruteresponse(data,responseid){

    if(responseid==="dataFromProff"){
      dataFromProff(data);
    }else if(responseid==="customerResponse"){
      customerResponse(data);
    }
}



// Valgfri persist (kan fjernes om du ikke vil skrive til localStorage her)
function persistAll() {
  try {
    localStorage.setItem('gGroupbedrifter', JSON.stringify(gGroupbedrifter));
    localStorage.setItem('gSelectbedrifter', JSON.stringify(gSelectbedrifter));
  } catch(e) {}
}

// Hjelp: generer id til ny gruppe
function newGroupId() {
  return 'grp_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

// Åpne dialogen og returner en Promise som gir valgt groupId (oppretter ny ved behov)
function pickGroupViaDialog() {
  return new Promise(resolve => {
    const dlg = document.getElementById('groupPicker');
    const select = document.getElementById('groupPickerSelect');
    const form = document.getElementById('newGroupForm');
    const okBtn = document.getElementById('grp_okBtn');
    const cancelBtn = document.getElementById('grp_cancelBtn');

    // 1) Fyll select med grupper + Ny gruppe
    function fillOptions() {
      select.innerHTML = '';
      // Eksisterende grupper
      gGroupbedrifter.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        select.appendChild(opt);
      });
      // Ny gruppe
      const optNew = document.createElement('option');
      optNew.value = '__new__';
      optNew.textContent = '➕ Ny gruppe…';
      select.appendChild(optNew);

      // Ingen grupper => preselect Ny gruppe
      if (gGroupbedrifter.length === 0) select.value = '__new__';
      form.style.display = (select.value === '__new__') ? 'block' : 'none';
      okBtn.textContent = (select.value === '__new__') ? 'Opprett og velg' : 'Velg';
    }

    fillOptions();

    // 2) Interaksjon
    select.onchange = () => {
      form.style.display = (select.value === '__new__') ? 'block' : 'none';
      okBtn.textContent = (select.value === '__new__') ? 'Opprett og velg' : 'Velg';
    };

    cancelBtn.onclick = () => { dlg.close(); resolve(null); };

    okBtn.onclick = () => {
      if (select.value === '__new__') {
        // Valider og opprett gruppe
        const name = (document.getElementById('ng_name').value || '').trim();
        const user = (document.getElementById('ng_user').value || '').trim();
        const desc = (document.getElementById('ng_desc').value || '').trim();
        if (!name || !user) { alert('Fyll inn Gruppnavn og Brukernavn.'); return; }
        const id = newGroupId();
        gGroupbedrifter.push({ id, name, user, desc });
        renderGroups(); // hvis du har en slik funksjon
        persistAll();
        dlg.close();
        resolve(id);
      } else {
        const chosen = select.value || null;
        if (!chosen) { alert('Velg en gruppe.'); return; }
        dlg.close();
        resolve(chosen);
      }
    };

    // 3) Åpne
    try { dlg.showModal(); } catch(e) { dlg.show(); }
  });
}


async function dataFromBrregToSelect() {
 
  const container = document.getElementById("rowlist");
  const checkboxes = container ? container.querySelectorAll(".selectcheckbox:checked:not([disabled])") : [];
  const orgnrs = Array.from(checkboxes).map(cb => cb.dataset.orgnr).filter(Boolean);

  if (orgnrs.length === 0) {
    alert("Ingen bedrifter valgt");
    return;
  }

  // La bruker velge/evt. lage gruppe
  const groupId = await pickGroupViaDialog();
  if (!groupId) return; // avbrutt

  // finne alle aktuelle selskaper i gBrregbedrifter
  const selectedCompanies = gBrregbedrifter.filter(b => orgnrs.includes(b.organisasjonsnummer));

  // sjekke at det ikke er noen som er alt i gSelectbedrifter
  const existingOrgnrs = new Set(gSelectbedrifter.map(b => b.organisasjonsnummer));
  const newCompanies = selectedCompanies
    .filter(b => !existingOrgnrs.has(b.organisasjonsnummer))
    .map(b => ({ ...b, group: groupId }));  // <- legg på groupId her

  //oppdater .status i newCompanies til Utvalg
  newCompanies.forEach(b => { b.status = 'Utvalg'; });

  // legg til
  gSelectbedrifter = gSelectbedrifter.concat(newCompanies);
  //lagre i lokalstorege
  persistAll();

  //oppdater teller
  // teller til 1500 over 1 sekund
  updateCounter("label-mailer-sendt", gSelectbedrifter.length, 1000);

  // markere/disablende de som er lagt til
  checkboxes.forEach(cb => {
    cb.disabled = true;
    const row = cb.closest(".default-row");
    if (row) {
      const statusEl = row.querySelector(".status");
      if (statusEl) statusEl.textContent = "Valgt";
    }
  });

  // oppdatere listevisning (din funksjon)
  if (typeof startBrregList === 'function') startBrregList(gBrregbedrifter);
  persistAll();
  console.log('Valgt groupId:', groupId);
  console.log('gSelectbedrifter:', gSelectbedrifter);
}

// (Valgfritt) last fra localStorage hvis du bruker persist
try {
  const g1 = localStorage.getItem('gGroupbedrifter');
  if (g1) window.gGroupbedrifter = JSON.parse(g1);
  const g2 = localStorage.getItem('gSelectbedrifter');
  if (g2) window.gSelectbedrifter = JSON.parse(g2);
} catch(e) {}

// Kjør når siden er ferdig lastet
window.addEventListener('DOMContentLoaded', () => {

  // oppdater telle-elementet
  updateCounter("label-mailer-sendt", gSelectbedrifter.length, 1000);
});

function updateCounter(elementId, newValue, duration = 500) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // hent dagens tallverdi fra elementet (fallback = 0)
  const currentValue = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
  const startTime = performance.now();
  const diff = newValue - currentValue;

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1); // 0 → 1
    const ease = 1 - Math.pow(1 - progress, 3);       // myk easing
    const current = currentValue + diff * ease;

    // hvis du vil ha heltall
    el.textContent = Math.round(current).toLocaleString('no-NO');

    if (progress < 1) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function getCustomer(){     
  //hente kunder
  GETairtable("app1WzN1IxEnVu3m0","tbldZL68MyLNBRjQC","rec1QGUGBMVaqxhp1","customerResponse","skipCache");
  }
  
function customerResponse(data){
  
      if (!data || !data.fields || !data.fields.membersjson || !Array.isArray(data.fields.membersjson)) {
          console.error("Ugyldig dataformat: Forventet et objekt med 'fields.supplierjson' som en array.");
          return; // Avbryt hvis data ikke er gyldig
      }
  
      //sjekke om data.feilds.superAdmin array inneholder min brukerid
      if(data.fields.superAdmin){
          if(data.fields.superAdmin.includes(userid)){
              
          }else{  
              return;
          }
      }
  
      // Konverter JSON-strenger til objekter
      const jsonStrings = data.fields.membersjson;
      
      let customers = convertCustomerJsonStringsToObjects(jsonStrings);
      gCustomers = customers;
  
}
