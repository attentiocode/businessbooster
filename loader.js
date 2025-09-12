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
      

        }

    });

}).catch(error => {
    console.error(error);
});
