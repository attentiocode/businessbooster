function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(`Failed to load script: ${url}`);
        document.head.appendChild(script);
    });
}

// Liste over CDN-URL-er som skal lastes inn
const cdnScripts = [
    "https://attentiocode.github.io/businessbooster/startup.js",
    "https://attentiocode.github.io/businessbooster/apicom.js"

];

// Laste inn alle skriptene sekvensielt
cdnScripts.reduce((promise, script) => {
    return promise.then(() => loadScript(script));
}, Promise.resolve()).then(() => {
    console.log("All scripts loaded via. attentiocode");
    
    MemberStack.onReady.then(function(member) {
        
        if (member.loggedIn){
            console.log("Member is logged in");

        }else{
            console.log("Member is NOT logged in");
        }

    });


    loadDataBrreg();
    

}).catch(error => {
    console.error(error);
});



function loadDataBrreg(){
// Eksempler:
// Fyll en array med resultatene
let bedrifter = [];

hentNystartede()
  .then(data => {
    bedrifter = data; // nå ligger alle objektene i arrayen "bedrifter"
    console.log('Antall bedrifter denne uken:', bedrifter.length);

    // Eksempel: logg de første 3
    bedrifter.slice(0, 3).forEach(e =>
      console.log(`${e.navn} (${e.organisasjonsnummer})`)
    );
  })
  .catch(console.error);




/*
// 2) Fra–til spesifikt
hentNystartede({ fra: '2025-09-01', til: '2025-09-15' })
  .then(data => console.log('1.–15. sept:', data.length));
*/

}