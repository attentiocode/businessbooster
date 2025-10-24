function creatSaveCompatibleList(orgnrList) {
    const AIRTABLE_FIELDS = [
      "orgnr",
      "navn",
      "naeringskode1_kode",
      "hjemmeside",
      "epostadresse",
      "mobil",
      "forretningsadresse_adresse",
      "forretningsadresse_postnummer",
      "forretningsadresse_poststed",
      "forretningsadresse_kommune",
      "forretningsadresse_kommunenummer",
      "forretningsadresse_land",
      "registreringsdatoEnhetsregisteret",
      "underAvvikling",
      "underTvangsavviklingEllerTvangsopplosning",
      "maalform",
      "aktivitet",
      "status",
      "group",
      "email_series", // <- vi fyller denne under
    ];
  
    const ALIASES = {
      orgnr: ["organisasjonsnummer", "orgnr", "orgNr", "OrganizationNumber"],
      navn: ["navn", "name", "Navn", "Name"],
      epostadresse: ["epostadresse", "epost", "email", "mail", "Email", "Mail"],
      mobil: ["mobil", "telefon", "phone", "Mobile", "Telefon"],
      hjemmeside: ["hjemmeside", "web", "url", "nettside", "website", "Website"],
    };
  
    const normalizeOrgnr = (val) =>
      String(val || "").replace(/\D/g, "").padStart(9, "0");
  
    function primitiveToString(v) {
      if (v === null || v === undefined) return "";
      if (typeof v === "boolean") return v ? "true" : "false";
      if (typeof v === "number") return String(v);
      return String(v);
    }
  
    // --- NYTT: bygg JSON-streng for email_series fra globale stepp1..5 ---
    function buildEmailSeriesJSON() {
      const obj = {};
      for (let i = 1; i <= 5; i++) {
        const key = "stepp" + i;
        const val = globalThis?.[key]; // funker i både browser og node
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          obj[key] = val;
        }
      }
      // returner undefined hvis vi ikke har noe å lagre
      if (Object.keys(obj).length === 0) return undefined;
      try {
        return JSON.stringify(obj);
      } catch {
        return undefined;
      }
    }
    // ---------------------------------------------------------------
  
    // Kritisk: sørger for at verdien blir string eller boolean (aldri array)
    function sanitizeForAirtable(val) {
      if (val === null || val === undefined) return undefined;
      if (typeof val === "boolean") return val;
      if (typeof val === "number") return String(val);
      if (Array.isArray(val)) {
        const flat = val
          .flat(Infinity)
          .map((x) => primitiveToString(x).trim())
          .filter((x) => x.length > 0);
        const uniq = [...new Set(flat)];
        const joined = uniq.join(", ");
        return joined || undefined;
      }
      if (typeof val === "object") {
        const prims = Object.values(val)
          .filter((x) => ["string", "number", "boolean"].includes(typeof x))
          .map((x) => primitiveToString(x).trim())
          .filter((x) => x.length > 0);
        if (prims.length > 0) return prims.join(" ");
        try {
          const j = JSON.stringify(val);
          return j === "{}" ? undefined : j;
        } catch {
          return undefined;
        }
      }
      const s = String(val).trim();
      return s.length ? s : undefined;
    }
  
    function getCaseInsensitive(obj, key) {
      if (!obj || !key) return undefined;
      if (obj[key] != null && obj[key] !== "") return obj[key];
      const lowerKey = String(key).toLowerCase();
      for (const k of Object.keys(obj)) {
        if (String(k).toLowerCase() === lowerKey) {
          const v = obj[k];
          if (v != null && v !== "") return v;
        }
      }
      return undefined;
    }
  
    function getNested(obj, fieldPath) {
      if (!obj || !fieldPath.includes("_")) return undefined;
      const parts = fieldPath.split("_");
      let cur = obj;
      for (const part of parts) {
        if (!cur) return undefined;
        if (cur[part] != null && cur[part] !== "") {
          cur = cur[part];
          continue;
        }
        const key = Object.keys(cur).find(
          (k) => k.toLowerCase() === part.toLowerCase()
        );
        if (key && cur[key] != null && cur[key] !== "") cur = cur[key];
        else return undefined;
      }
      return cur;
    }
  
    function getValue(company, field) {
      if (!company) return undefined;
  
      // 1) Direkte/eksakt (case-insensitivt)
      const direct = getCaseInsensitive(company, field);
      if (direct != null && direct !== "") return direct;
  
      // 2) Alias (hvis definert)
      if (ALIASES[field]) {
        for (const alias of ALIASES[field]) {
          const aliasVal = getCaseInsensitive(company, alias);
          if (aliasVal != null && aliasVal !== "") return aliasVal;
        }
      }
  
      // 3) Nestet sti a_b_c
      if (field.includes("_")) {
        const nested = getNested(company, field);
        if (nested != null && nested !== "") return nested;
      }
  
      return undefined;
    }
  
    const data = [];
    const list = Array.isArray(orgnrList) ? orgnrList : [];
  
    // Forberedt én gang per kall
    const emailSeriesJson = buildEmailSeriesJSON();
  
    list.forEach((orgnr) => {
      const normalizedQueryOrgnr = normalizeOrgnr(orgnr);
  
      const company =
        (typeof gReadybedrifter !== "undefined" ? gReadybedrifter : []).find(
          (b) => {
            const bOrgnr = normalizeOrgnr(
              b?.organisasjonsnummer ??
                b?.orgnr ??
                b?.orgNr ??
                b?.OrganizationNumber ??
                ""
            );
            return bOrgnr === normalizedQueryOrgnr;
          }
        );
  
      if (!company) return;
  
      const record = {};
  
      for (const field of AIRTABLE_FIELDS) {
        let raw = getValue(company, field);
  
        if (field === "orgnr") {
          const fromCompany =
            company?.organisasjonsnummer ??
            company?.orgnr ??
            company?.orgNr ??
            company?.OrganizationNumber ??
            normalizedQueryOrgnr;
          raw = normalizeOrgnr(fromCompany);
        }
  
        if (field === "status" && (raw == null || raw === "")) {
          raw = "Klar for utsendelse";
        }
  
        // --- NYTT: tving email_series til å bruke den ferdige JSON-strengen ---
        if (field === "email_series") {
          raw = emailSeriesJson; // kan være undefined hvis ingen stepp* er satt
        }
        // ----------------------------------------------------------------------
  
        const val = sanitizeForAirtable(raw);
  
        if (typeof val === "boolean" || (typeof val === "string" && val.length > 0)) {
          record[field] = val;
        }
      }
  
      if (!("orgnr" in record)) record.orgnr = normalizedQueryOrgnr;
  
      data.push(record);
    });
  
    return data;
}
  
function startMultisaveProcess(orgnrList) {
    const baseid = "appEUYGzpBtxB0fFe";
    const tabelid = "tblpbfAQUiinho1LD";
  
    const data = creatSaveCompatibleList(orgnrList);
  
    // Post til Airtable
    multisaveAirtable(data, baseid, tabelid, "postToBoosterDB");
}
  
function multiReturnfromAirtable(payload) {
    
    let cleanerData = cleanReturnfromAirtable(payload)
    console.log("Multisave fullført med respons:", cleanerData);

    //opprette hele epostforløpet i timerunner db
    makeNextSteppInTimeRunner(cleanerData);

/*
    //sende eposter til hver bedrift basert på responsen fra Airtable med en loop og liten tidsforsinkelse på 100ms mellom hver
    cleanerData.forEach((company, index) => {
        setTimeout(() => {
            sendEmailToCompany(company);
        }, index * 100); // 100ms mellom hver
    });
*/
}

function makeNextSteppInTimeRunner(companyes){

    let timerunnerObjects = maketimerunnerObjects(companyes);
    console.log("Timerunner objekter som skal lagres:", timerunnerObjects);

    //starte multisav i timrunnerdb
    const baseid = "appISWcEA5QICIlzP";
    const tabelid = "tblldBMExI1U4yMNI";
    multisaveAirtable(data, baseid, tabelid, "postToTimeRunnerDB");

}

function multiReturnFromTimeRunnerAirtable(payload) {
    let cleanerData = cleanReturnfromAirtable(payload)
    console.log("Timerunner multisave fullført med respons:", cleanerData);
}

function maketimerunnerObjects(companyes) {
    
    const baseid = "appEUYGzpBtxB0fFe";
    const tabelid = "tblpbfAQUiinho1LD";
    let timerunnerObjects = [];

    companyes.forEach(company => {

        let email_series = company.email_series ? JSON.parse(company.email_series) : {};
        let steppCount = Object.keys(email_series).filter(key => key.startsWith('stepp')).length;
        for (var i = 0; i < steppCount; i++) {

            let daystepp = email_series['stepp' + (i + 1)];
            const nextSteppDate = new Date();
            nextSteppDate.setDate(nextSteppDate.getDate() + daystepp);

            let emailBody = getEmailBody(company,null);
            let subject = eval('subject' + (i + 1));


            let timerunnerObject = {
                when: nextSteppDate.toISOString().split('T')[0],
                externalId: company.organisasjonsnummer,
                hookUrl: "https://hooks.zapier.com/hooks/catch/24993663/uragru1/",
                method: "POST",
                payload: {
                    orgnr: company.orgnr || '',
                    navn: company.navn || '',
                    epost: company.epostadresse || '',
                    telefon: company.telefon || '',
                    hjemmeside: company.hjemmeside || '',
                    emailBody: emailBody,
                    subject: subject
                },
                title: `Epost steg ${i + 1} til ${company.navn || company.organisasjonsnummer}`,
                description: `Automatisk epost steg ${i + 1}}`,
                customerId:company.orgnr,
                status: "pending",
                external_databaseId: baseid,
                external_tableId: tabelid,
                external_rawId: company.id || ''
            };
            timerunnerObjects.push(timerunnerObject);

        }

    });

    return timerunnerObjects;

}

function cleanReturnfromAirtable(payload) {
    console.log("Multisave fullført med respons:", payload);
  
    // 1) Hent ut selve listene (kan være payload.data eller payload direkte)
    const chunks = Array.isArray(payload?.data) ? payload.data : payload;
  
    // 2) Flat ut alle chunkene til én liste med records
    const records = (Array.isArray(chunks) ? chunks : [chunks])
      .flatMap(chunk => Array.isArray(chunk) ? chunk : [chunk])
      .filter(Boolean);
  
    // 3) Ekstraher KUN rad-data (fields). Faller tilbake til _rawJson.fields hvis nødvendig
    const rows = records.map(rec => {
        const fields = rec?.fields ?? rec?._rawJson?.fields ?? {};
        return { id: rec?.id, ...fields };
      });
  
    return rows; // <- ren array med rad-objekter
}

async function multisaveAirtable(data, baseid, tabelid, returid) {
    const batchSize = 10;
    const totalRows = data.length;
    let uploadedRows = 0;
    const allResponses = [];

    const sendBatch = async (batch) => {
        try {
            const response = await POSTairtableMulti(baseid, tabelid, batch);
            uploadedRows += batch.length;

            statusProcessing(totalRows, uploadedRows);
            allResponses.push(response);
        } catch (error) {
            console.error("Feil ved sending av batch:", error);
            throw error;
        }
    };

    const processBatches = async () => {
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            await sendBatch(batch);
        }

        statusProcessing(totalRows, uploadedRows);
        console.log("Alle rader er ferdig prosessert.");
    };

    try {
        statusProcessing(totalRows, uploadedRows);
        await processBatches();

        if(returid === "postToBoosterDB"){
        multiReturnfromAirtable({ success: true, data: allResponses});
        }else if(returid === "postToTimeRunnerDB"){
        multiReturnFromTimeRunnerAirtable({ success: true, data: allResponses});
        }


    } catch (error) {
        console.error("Prosesseringen ble stoppet på grunn av en feil:", error);
        statusProcessing(totalRows, uploadedRows);
    }
}


async function POSTairtableMulti(baseId, tableId, body) {
    return new Promise(async (resolve, reject) => {
        try {
            const token = await MemberStack.getToken();
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


function statusProcessing(totalRows, uploadedRows) {
    const statusElement = document.getElementById("ready-bulk-status");
    console.log("Status oppdatering:", { totalRows, uploadedRows });
    
    if (!statusElement) return;

    if (uploadedRows >= totalRows) {
        statusElement.innerText = `Ferdig! Lastet opp ${uploadedRows} av ${totalRows} rader.`;
    } else {
        statusElement.innerText = `Laster opp... ${uploadedRows} av ${totalRows} rader lastet opp.`;
    }
        
}