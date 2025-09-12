
function createAirtableANDFormula(obj) {
    const conditions = Object.keys(obj).map(key => {
      const value = typeof obj[key] === 'string' ? `'${obj[key]}'` : obj[key];
      return `{${key}} = ${value}`;
    });
    return `AND(${conditions.join(', ')})`;
}

function airtablebodylistAND(obj){
    //Føringer etter dato
    let formula = createAirtableANDFormula(obj);
      let body = JSON.stringify({
              "formula":formula ,
              "pageSize": 50,
              "offset": 0
            });
      return body;
}

function rawdatacleaner(data){
    var array = [];
        for (var i = 0;i<data.data.length;i++){
          array.push(data.data[i].fields);
        }
    return array;
}
//
async function Getlistairtable(baseId,tableId,body,id,public){

    let response;
        if(public){
            response = await fetch(`https://expoapi-zeta.vercel.app/api/search?baseId=${baseId}&tableId=${tableId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: body
            });
        }else{
            let token = MemberStack.getToken();

            response = await fetch(`https://expoapi-zeta.vercel.app/api/search?baseId=${baseId}&tableId=${tableId}&token=${token}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: body
            });
            
        }


    if (!response.ok) {
    throw new Error(`HTTP-feil! status: ${response.status} - ${response.statusText}`);
    }else {
    let data = await response.json();
    apireturn({success: true, data: data, id: id});
    }

}

async function POSTairtable(baseId,tableId,body,id){
    let token = MemberStack.getToken();
    let response = await fetch(`https://expoapi-zeta.vercel.app/api/row?baseId=${baseId}&tableId=${tableId}&token=${token}`, {
       method: "POST",
       body:body,
       headers: {
       'Content-Type': 'application/json'
        }
       });
       if (!response.ok) {
        throw new Error(`HTTP-feil! status: ${response.status} - ${response.statusText}`);
        }else {
        let data = await response.json();
        apireturn({success: true, data: data, id: id});
      }
}
    
async function DELETEairtable(baseId,tableId,itemId,id){
    let token = MemberStack.getToken();
    
    let response = await fetch(`https://expoapi-zeta.vercel.app/api/row?baseId=${baseId}&tableId=${tableId}&rowId=${itemId}&token=${token}`, {
          method: "DELETE"
        });
        if (!response.ok) {
            throw new Error(`HTTP-feil! status: ${response.status} - ${response.statusText}`);
            }else {
            let data = await response.json();
            apireturn({success: true, data: data, id: id});
        }
}

async function PATCHairtable(baseId,tableId,itemId,body,id){
    // fra memberstack
    let token = MemberStack.getToken();
    let response = await fetch(`https://expoapi-zeta.vercel.app/api/row?baseId=${baseId}&tableId=${tableId}&rowId=${itemId}&token=${token}`, {
          method: "PATCH",
          body:body,
            headers: {
             'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP-feil! status: ${response.status} - ${response.statusText}`);
            }else {
            let data = await response.json();
            apireturn({success: true, data: data, id: id});
        }
}
    
async function GETairtable(baseId,tableId,itemId,id,public){

    let response;

        if(public){
            response = await fetch(`https://expoapi-zeta.vercel.app/api/row?baseId=${baseId}&tableId=${tableId}&rowId=${itemId}`);
        }else{
            let token = MemberStack.getToken();
            response = await fetch(`https://expoapi-zeta.vercel.app/api/row?baseId=${baseId}&tableId=${tableId}&rowId=${itemId}&token=${token}&skipCache=true`);
        }
        if (!response.ok) {
            throw new Error(`HTTP-feil! status: ${response.status} - ${response.statusText}`);
            }else {
            let data = await response.json();
            apireturn({success: true, data: data, id: id});
        }   
}

async function POSTairtableMulti(baseId, tableId, body) {
    return new Promise(async (resolve, reject) => {
        try {
            const token = await MemberStack.getToken();
            console.log("Token mottatt:", token);

            let requestBody = body.map(item => ({ fields: { ...item } }));

            console.log("Request Body som skal sendes:", requestBody);

            const response = await fetch(
                `https://expoapi-zeta.vercel.app/api/row?baseId=${baseId}&tableId=${tableId}&token=${token}`,
                {
                    method: "POST",
                    body: JSON.stringify(requestBody),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Feilrespons fra API: ${response.status} - ${response.statusText}`);
                console.error("Responsdata fra API:", errorText);
                reject(new Error(`HTTP-feil! status: ${response.status} - ${response.statusText}`));
            } else {
                const data = await response.json();
                console.log("Batch lagret med suksess:", data);
                resolve(data); // Returner responsdata for denne batchen
            }
        } catch (error) {
            console.error("Feil i POSTairtableMulti:", error);
            reject(error);
        }
    });
}

async function multisave(data, baseid, tabelid, returid) {
    const batchSize = 10;
    let sendpacks = 0;
    const allResponses = []; // Array for å samle alle responsdata

    // Funksjon for å sende en batch til Airtable
    const sendBatch = async (batch) => {
        try {
            console.log("Sender batch:", batch);
            const response = await POSTairtableMulti(baseid, tabelid, batch);
            sendpacks++;
            console.log(`Batch ${sendpacks} sendt.`);
            allResponses.push(response); // Legg til responsen for denne batchen
        } catch (error) {
            console.error("Feil ved sending av batch:", error);
            throw error; // Stop prosesseringen hvis en batch feiler
        }
    };

    // Prosessering av batcher
    const processBatches = async () => {
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize); // Hent batch
            await sendBatch(batch); // Vent på at batch blir sendt og bekreftet
        }
        console.log("Alle batcher er ferdig prosessert.");
    };

    // Start batch-prosesseringen
    try {
        await processBatches();
        console.log("Samlede responsdata:", allResponses);
        apireturn({ success: true, data: allResponses, id: returid });
    } catch (error) {
        console.error("Prosesseringen ble stoppet på grunn av en feil:", error);
        apireturn({ success: false, error: error.message, id: returid });
    }
}

function convertMultiResponseData(data) {
    return data.flatMap(samling => samling.map(item => item.fields));
}

// Bygger Airtable-body som matcher én/flere eksakte ID-er inne i {klientid},
// selv om feltet er lookup/linked (ARRAYJOIN) og inneholder komma + mellomrom.
function airtableBodyKlientidFind(idOrArray, extraFilters = {}, options = {}) {
    const pageSize = options.pageSize ?? 50;
    const offset   = options.offset ?? 0;
    const ids = Array.isArray(idOrArray) ? idOrArray.filter(Boolean) : [idOrArray];
  
    if (ids.length === 0) throw new Error("airtableBodyKlientidFind: minst én id må oppgis");
  
    const esc = s => String(s).replace(/'/g, "\\'");
  
    // Normaliser felt: join -> fjern space, NBSP og linjeskift -> wrap i komma
    // NBSP i strengen under er U+00A0 (ser ut som et blankt mellomrom).
    const normalizedField =
      `"," & ` +
      `SUBSTITUTE(` +
        `SUBSTITUTE(` +
          `SUBSTITUTE(ARRAYJOIN({klientid}, ","), " ", ""),` +
          `" ", ""` +                    // NBSP
        `), ` +
        `"\n", ""` +                    // line feed
      `) & ","`;
  
    // Lag OR(...) over alle id-er
    const containsParts = ids.map(id =>
      `FIND("," & '${esc(id)}' & ",", ${normalizedField}) > 0`
    );
    const containsClause = containsParts.length === 1
      ? containsParts[0]
      : `OR(${containsParts.join(", ")})`;
  
    // Ekstra AND-filtre (likhet)
    const andFilters = Object.entries(extraFilters).map(([k, v]) =>
      typeof v === "string" ? `{${k}} = '${esc(v)}'` : `{${k}} = ${v}`
    );
  
    const formula = andFilters.length
      ? `AND(${[containsClause, ...andFilters].join(", ")})`
      : containsClause;
  
    return JSON.stringify({ formula, pageSize, offset });
  }
  
  
  
  

function apireturn(response){
    if(response.success){
     ruteresponse(response.data,response.id);
    }else{
        console.log(response);
    }
}