

async function hentNystartedeBedrifter({ fra, til, size = 100 }) {
    const base = 'https://data.brreg.no/enhetsregisteret/api/enheter';
    let page = 0;
    const alle = [];
  
    while (true) {
      const url = new URL(base);
      url.searchParams.set('fraRegistreringsdatoEnhetsregisteret', fra); // YYYY-MM-DD
      url.searchParams.set('tilRegistreringsdatoEnhetsregisteret', til); // YYYY-MM-DD
      url.searchParams.set('size', String(size));
      url.searchParams.set('page', String(page));
      url.searchParams.set('sort', 'registreringsdatoEnhetsregisteret,DESC');
  
      const res = await fetch(url.href, {
        headers: {
          // Versjonert content-type er ikke påkrevd, men greit om du vil pinne V2:
          'Accept': 'application/vnd.brreg.enhetsregisteret.enhet.v2+json;charset=UTF-8'
        }
      });
      if (!res.ok) throw new Error(`Feil fra BRREG: ${res.status}`);
  
      const data = await res.json();
  
      // HAL: enhetene ligger vanligvis her:
      const batch = data?._embedded?.enheter ?? [];
      alle.push(...batch);
  
      // Sjekk om vi er ferdige (ingen flere sider)
      const totalPages = data?.page?.totalPages ?? (batch.length < size ? page + 1 : page + 2);
      page += 1;
      if (page >= totalPages || batch.length === 0) break;
  
      // Sikkerhetsbrems: API-et begrenser til ~10k per spørring
      if (alle.length >= 10000) break;
    }
  
    return alle;
  }
  
  // Bruk:

  function loadDataBrreg(){
  hentNystartedeBedrifter({ fra: '2025-09-01', til: '2025-09-29' })
    .then(enheter => {
      console.log(`Fikk ${enheter.length} enheter`);
      // eksempel: skriv ut navn og orgnr
      enheter.slice(0, 5).forEach(e =>
        console.log(`${e.navn} (${e.organisasjonsnummer}) – registrert: ${e.registreringsdatoEnhetsregisteret}`)
      );
    })
    .catch(console.error);
}