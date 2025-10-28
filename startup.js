let gBrregbedrifter = JSON.parse(localStorage.getItem('gBrregbedrifter') || '[]');
let gSelectbedrifter = JSON.parse(localStorage.getItem('gSelectbedrifter') || '[]');
let gReadybedrifter = JSON.parse(localStorage.getItem('gReadybedrifter') || '[]');
let gGroupbedrifter = JSON.parse(localStorage.getItem('gGroupbedrifter') || '[]');
let gProsessertBedrifter = JSON.parse(localStorage.getItem('gProsessertBedrifter') || '[]');
let gCustomers = [];
let userid = null;
let userName = null;


  // --- Fargepalett tilpasset mørkt dashbord ---
  const colorsPalett = {
    total:   { bg: '#1E3A8A1A', text: '#93C5FD', border: '#1E3A8A40' },
    portal:  { bg: '#064E3B33', text: '#6EE7B7', border: '#10B98140' },
    prosess: { bg: '#78350F33', text: '#FDBA74', border: '#F9731640' },
    ready:   { bg: '#854D0E33', text: '#FCD34D', border: '#D9770640' },
    selected:{ bg: '#1E40AF33', text: '#93C5FD', border: '#3B82F640' },
    email:   { bg: '#312E8122', text: '#A78BFA', border: '#7C3AED40' }, // lilla
    web:     { bg: '#07598533', text: '#38BDF8', border: '#0EA5E940' }, // cyan
    phone:   { bg: '#14532D33', text: '#4ADE80', border: '#22C55E40' }  // grønn
  };


document.getElementById("select-field-preset").addEventListener('change', (e) => {
    startBrregList(gBrregbedrifter);
});

document.getElementById("select-contact-info-filter").addEventListener('change', (e) => {
  startBrregList(gBrregbedrifter);
});

document.getElementById("select-contact-state-filter").addEventListener('change', (e) => {
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

document.getElementById("groupEmailButton").addEventListener("click", function() {
    document.getElementById("emailTabButton").click();
});

document.getElementById("testtrigger").addEventListener("click", function() {
  //test
  triggerTimeRun();
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

document.getElementById("readymastercheckbox").addEventListener("change", function() {
  const container = document.getElementById("rowlistReady");
  const checkboxes = container.querySelectorAll(".selectcheckbox")
  checkboxes.forEach(cb => {
    // kun de som ikke er disabled
    if (!cb.disabled){
    cb.checked = this.checked;
    }
  });

  //hvis det er mer en 1 checkbox som er valgt så gjør maassbehandling synlig
  const bulkBar   = document.getElementById('ready-bulk-actions');
  const checkboxesChecked = container.querySelectorAll(".selectcheckbox:checked");
  if (checkboxesChecked.length > 0){
    bulkBar.style.display = "flex";
    const bulkCount = document.getElementById('ready-bulk-count');
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
        const user = (userName || document.getElementById('ng_user').value || '').trim();
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
  updateCounter("label-selected-customers", gSelectbedrifter.length, 1000);

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
  if (g2) gSelectbedrifter = JSON.parse(g2);
} catch(e) {}

function updateCounter(elementId, newValue, duration = 500, endingValue = "") {
  const el = document.getElementById(elementId);
  if (!el) return;

  // plukk ut tall fra eksisterende tekst (ignorerer evt. tidligere suffix)
  const currentValue = parseFloat((el.textContent || "").replace(/[^\d.-]/g, "")) || 0;
  const startTime = performance.now();
  const diff = newValue - currentValue;

  // legg til et automatisk mellomrom foran ending hvis det ikke allerede er der
  const suffix = endingValue ? (/^\s/.test(endingValue) ? endingValue : " " + endingValue) : "";

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);     // 0 → 1
    const ease = 1 - Math.pow(1 - progress, 3);           // myk easing
    const current = currentValue + diff * ease;

    // heltall underveis
    el.textContent = Math.round(current).toLocaleString("no-NO") + suffix;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // sørg for nøyaktig sluttverdi
      el.textContent = Math.round(newValue).toLocaleString("no-NO") + suffix;
    }
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
      updateCounter("label-companys-in-portal", gCustomers.length, 1000);

      //finne ut hvor mange kunder som har kommet inn i portalen de siste 30 dager
      let newcustomers = getNewCustomersInPortal(customers,30);
      updateCounter("label-new-customers", newcustomers, 1000, " siste 30 dager");

   
  
}
function getNewCustomersInPortal(customers,days){
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    let count = 0;

    //dato er lagret i feltet creatdate
    customers.forEach(customer => {
        if (customer && customer.creatdate) {
            const creatDate = new Date(customer.creatdate);
            if (creatDate >= cutoff) {
                count++;
            }
        }
    });

    
    return count;
}

function convertCustomerJsonStringsToObjects(jsonStrings) {
  return jsonStrings.map((jsonString, index) => {
      try {
          
          // Parse JSON-strengen uten HTML-dataen
          const data = JSON.parse(jsonString);


          // Sørg for at "group" og "category" alltid er arrays
          if (!data.cashflowjson) {
              data.cashflowjson = [];
          }

          if (!data.bruker) {
              data.bruker = [];
          }

          if (!data.invitasjon) {
              data.invitasjon = [];
          }

          if (!data.connection) {
              data.connection = [];
          }

          return data;
      } catch (error) {
          console.error(`Feil ved parsing av JSON-streng på indeks ${index}:`, jsonString, error);
          return null; // Returner null hvis parsing feiler
      }
  });
}

updateCounter("label-selected-customers", gSelectbedrifter.length, 1000);
updateCounter("label-ready-customers", gReadybedrifter.length, 1000);
updateCounter("label-mailer-sendt", gProsessertBedrifter.length, 1000);



function countReadyAndSendtCostumers(){
//telle alle cunder som har status som sendt returner antall
  return  gReadybedrifter.filter(b => b.status === 'EpostSendt').length;
  
}

function initFilterselectors() {

  initContactInfoFilter();
  initContactStateFilter();

  initContactInfoSelectFilter();
  initContactStateSelectFilter();

  initcssIconStyle();

}

function initcssIconStyle() {
  // --- 0) Injiser CSS én gang ---
  if (!document.getElementById('brreg-contact-style')) {
    const style = document.createElement('style');
    style.id = 'brreg-contact-style';
    style.textContent = `
      .icon-btn {
        display:inline-flex; align-items:center; justify-content:center;
        width:26px; height:26px; border-radius:6px; margin-right:6px;
        border:1px solid #e5e7eb; background:#f9fafb;
        color:#1e3a8a; cursor:pointer; text-decoration:none;
      }
      .icon-btn:hover { background:#eef2ff; }
      .contact-cell { white-space:nowrap; }
      tr.inportal { background: rgba(60,180,75,0.07); }
      tr.selected  { background: rgba(0,120,215,0.07); }
    `;
    document.head.appendChild(style);
  }
}