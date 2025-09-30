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
    let bedrifter = [];
    
    hentNystartede()
      .then(data => {
        bedrifter = data;
        //starte listevisning
        startBrregList(data);


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


function startBrregList(data){

    const list = document.getElementById('rowlist');
    const library = document.getElementById('elementlibrary');
    const nodeRow = library.querySelector('.default-row');

    //filter


    //sorter på dato
    data.sort((a,b) => (a.registreringsdatoEnhetsregisteret > b.registreringsdatoEnhetsregisteret) ? -1 : ((b.registreringsdatoEnhetsregisteret > a.registreringsdatoEnhetsregisteret) ? 1 : 0));


    data.forEach(item => {
        const node = nodeRow.cloneNode(true);
        
        node.querySelector('.company-name').textContent = item.navn || 'Ukjent navn';
        node.querySelector('.org-nr').textContent = item.organisasjonsnummer || 'Ukjent org.nr';
        node.querySelector('.start-date').textContent = item.registreringsdatoEnhetsregisteret || 'Ukjent dato';

        if (item.hjemmeside) {
            const link = document.createElement('a');
            link.href = item.hjemmeside;
            link.textContent = item.hjemmeside;
            link.target = '_blank';
            node.querySelector('.e-mail').innerHTML = ''; // Clear existing content
            node.querySelector('.e-mail').appendChild(link);
        } else {
            node.querySelector('.e-mail').textContent = 'Ingen epost';
        }

        list.appendChild(node);
    });












}