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
    "businessbooster/startup.js",
    "businessbooster/apicom.js",
    "businessbooster/proff.js",
    "businessbooster/preset.js",
    "businessbooster/select.js",
    "businessbooster/group.js",
    "businessbooster/brreg.js"
];

// Laste inn alle skriptene sekvensielt
cdnScripts.reduce((promise, script) => {
    return promise.then(() => loadScript(script));
}, Promise.resolve()).then(() => {
    console.log("All scripts loaded lokalt");
    
    MemberStack.onReady.then(function(member) {
        
        if (member.loggedIn){
            console.log("Member is logged in");

        }else{
            console.log("Member is NOT logged in");
            //trykk på knappen logintabbutton
        }

    });


    
    

}).catch(error => {
    console.error(error);
});
