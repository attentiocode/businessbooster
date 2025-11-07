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
    "https://attentiocode.github.io/businessbooster/brreg.js",
    "https://attentiocode.github.io/businessbooster/ready.js",
    "https://attentiocode.github.io/businessbooster/emailloop.js",
    "https://attentiocode.github.io/businessbooster/multisave.js",
    "https://attentiocode.github.io/businessbooster/emailsending.js",
    "https://attentiocode.github.io/businessbooster/prosess.js",
    "https://attentiocode.github.io/businessbooster/timerunneroverview.js",
    "https://attentiocode.github.io/businessbooster/xlsexport.js",
    "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.2.0/exceljs.min.js",

    

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

            const lableusername = document.getElementById("lableusername");
            userName = member.navn;
            lableusername.innerText = member.navn || "";

            //trykk på knappen mainpagetabbutton
            document.getElementById("mainpagetabbutton").click();

            //hent alle kunder fra airtable
            getCustomer();
            //hent alle 
            getBoosterLeads();
            //
            initFilterselectors();
            //
            getAllallIndustri();

            //hent epostløp
            getEmailLoops();

        }else{
            console.log("Member is NOT logged in");
            //trykk på knappen logintabbutton
            document.getElementById("logintabbutton").click();
        }

    });


    
    

}).catch(error => {
    console.error(error);
});

