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
    "https://attentiocode.github.io/businessbooster/apicom.js",
    "https://attentiocode.github.io/businessbooster/proff.js",
    "https://attentiocode.github.io/businessbooster/preset.js",
    "https://attentiocode.github.io/businessbooster/select.js",
    "https://attentiocode.github.io/businessbooster/group.js",
    "https://attentiocode.github.io/businessbooster/brreg.js"
    
    
];

// Laste inn alle skriptene sekvensielt
cdnScripts.reduce((promise, script) => {
    return promise.then(() => loadScript(script));
}, Promise.resolve()).then(() => {
    console.log("All scripts loaded via. attentiocode GitHub");
    
    MemberStack.onReady.then(function(member) {
        
        if (member.loggedIn){
            console.log("Member is logged in");
            userid = member.airtableid;
            
            //trykk på knappen mainpagetabbutton
            document.getElementById("mainpagetabbutton").click();

            //hent alle kunder fra airtable
            getCustomer();

        }else{
            console.log("Member is NOT logged in");
            //trykk på knappen logintabbutton
            document.getElementById("logintabbutton").click();
        }

    });


    
    

}).catch(error => {
    console.error(error);
});

