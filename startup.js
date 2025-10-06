let gBrregbedrifter = [];
let gSelectbedrifter = [];

document.getElementById('select-field-activity').addEventListener('change', (e) => {
  startBrregList(gBrregbedrifter);
}
);

document.getElementById("select-field-preset").addEventListener('change', (e) => {
      startBrregList(gBrregbedrifter);
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


function loadDataBrreg(){
    // Fyll en array med resultatene
    gBrregbedrifter = [];
    
    hentNystartede()
      .then(data => {
        gBrregbedrifter = data;
        //laste selectorer
        loadSelectors(gBrregbedrifter);
          // Kjør når siden lastes
        loadPeriodsIntoSelector("periodeSelector");
        //starte listevisning
        startBrregList(gBrregbedrifter);


      })

      .catch(console.error);
    
    /*
    //Fra–til spesifikt
    hentNystartede({ fra: '2025-09-01', til: '2025-09-15' })
        .then(data => {
            bedrifter = data;
        })
        .catch(console.error);
*/
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

}


function startBrregList(data) {
  const list = document.getElementById('rowlist');
  const library = document.getElementById('elementlibrary');
  const nodeRow = library.querySelector('.default-row');
  const presetName = document.getElementById('select-field-preset')?.value;

  // ------------------------------------------------------------
  // 📦 1. Hent valgt preset (hvis det finnes)
  // ------------------------------------------------------------
  const presets = JSON.parse(localStorage.getItem('industryPresets') || '{}');
  const preset = presets[presetName] || null;

  // ------------------------------------------------------------
  // 🎯 2. Filtrer data basert på valgt preset
  // ------------------------------------------------------------
  let filteredData = data;

  if (preset) {
    const { industries = [], dateFrom, dateTo } = preset;

    filteredData = data.filter((item) => {
      let include = true;

      // --- Bransjefilter ---
      if (industries.length > 0) {
        const itemIndustry =
          (item.naeringskode1?.beskrivelse || '').toLowerCase() ||
          (item.bransje || '').toLowerCase();
        include =
          industries.some((ind) =>
            itemIndustry.includes(ind.toLowerCase())
          ) || false;
      }

      // --- Datofilter ---
      if (include && (dateFrom || dateTo)) {
        const regDate = new Date(item.registreringsdatoEnhetsregisteret);
        if (dateFrom) include = regDate >= new Date(dateFrom);
        if (dateTo) include = include && regDate <= new Date(dateTo);
      }

      return include;
    });
  }

  // ------------------------------------------------------------
  // 🔢 3. Sorter og vis listen
  // ------------------------------------------------------------
  filteredData.sort((a, b) => {
    const dateA = new Date(a.registreringsdatoEnhetsregisteret);
    const dateB = new Date(b.registreringsdatoEnhetsregisteret);
    if (dateA < dateB) return 1;
    if (dateA > dateB) return -1;

    const nameA = a.navn.toUpperCase();
    const nameB = b.navn.toUpperCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  // ------------------------------------------------------------
  // 🧹 4. Tøm liste og fyll med resultat
  // ------------------------------------------------------------
  list.innerHTML = '';
  const counterlistbrreg = document.getElementById('counterlistbrreg');
  const count = filteredData.length || 0;
  counterlistbrreg.textContent =
    `${count} stk. nyregistrerte bedrifter${preset ? ' (filtrert)' : ''}`;

  filteredData.forEach((item) => {
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
    const alreadySelected = gSelectbedrifter.some(
      (b) => b.organisasjonsnummer === item.organisasjonsnummer
    );
 
    let statusText = "brreg";
    if(alreadySelected){
        statusText = "Valgt";
    }

    node.querySelector('.status').textContent = statusText;

    const checkbox = node.querySelector('.selectcheckbox');
    checkbox.dataset.orgnr = item.organisasjonsnummer || '';
    if (alreadySelected) {
      checkbox.disabled = true;
    }

    list.appendChild(node);
  });
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
      cb.checked = this.checked;
    });
    
});


document.getElementById("testbutton").addEventListener("click", function() {
  logCompanyOnce('998766834',"dataFromProff");
});

function ruteresponse(data,responseid){

    if(responseid==="dataFromProff"){
      dataFromProff(data);
    }
}

function dataFromBrregToSelect(){

//finne alle checkboxer som er huket av
    const container = document.getElementById("rowlist");
    const checkboxes = container.querySelectorAll(".selectcheckbox:checked");
    const orgnrs = Array.from(checkboxes).map(cb => cb.dataset.orgnr).filter(Boolean);
    if(orgnrs.length===0){
        alert("Ingen bedrifter valgt");
        return;
    }

    //finne alle aktuelle selskaper i gBrregbedrifter
    const selectedCompanies = gBrregbedrifter.filter(b => orgnrs.includes(b.organisasjonsnummer));

    //sjekke at det ikke er noen som er alt i gSelectbedrifter da skal de ikke legges til
    const existingOrgnrs = new Set(gSelectbedrifter.map(b => b.organisasjonsnummer));
    const newCompanies = selectedCompanies.filter(b => !existingOrgnrs.has(b.organisasjonsnummer));
    gSelectbedrifter = gSelectbedrifter.concat(newCompanies);
    console.log(gSelectbedrifter);
   


}
