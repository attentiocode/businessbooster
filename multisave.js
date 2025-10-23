// Lager et Airtable-kompatibelt data-array basert på orgnr-listen
function creatSaveCompatibleList(orgnrList) {
    // Felter slik de finnes i CSV/Airtable (eksakt stavemåte)
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
    ];
  
    // Vanlige alias vi ser i company-objekt
    const ALIASES = {
      orgnr: ["organisasjonsnummer", "orgnr", "orgNr", "OrganizationNumber"],
      navn: ["navn", "name", "Navn", "Name"],
      epostadresse: ["epostadresse", "epost", "email", "mail", "Email", "Mail"],
      mobil: ["mobil", "telefon", "phone", "Mobile", "Telefon"],
      hjemmeside: ["hjemmeside", "web", "url", "nettside", "website", "Website"],
    };
  
    const normalizeOrgnr = (val) =>
      String(val || "").replace(/\D/g, "").padStart(9, "0");
  
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
  
    // "a_b_c" -> obj.a?.b?.c (case-insensitivt pr. ledd)
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
        const key = Object.keys(cur).find((k) => k.toLowerCase() === part.toLowerCase());
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
  
    list.forEach((orgnr) => {
      const normalizedQueryOrgnr = normalizeOrgnr(orgnr);
  
      // Finn company i gReadybedrifter
      const company = (typeof gReadybedrifter !== "undefined" ? gReadybedrifter : []).find((b) => {
        const bOrgnr = normalizeOrgnr(
          b?.organisasjonsnummer ?? b?.orgnr ?? b?.orgNr ?? b?.OrganizationNumber ?? ""
        );
        return bOrgnr === normalizedQueryOrgnr;
      });
  
      if (!company) return;
  
      const record = {};
  
      for (const field of AIRTABLE_FIELDS) {
        let val = getValue(company, field);
  
        if (field === "orgnr") {
          const fromCompany =
            company?.organisasjonsnummer ??
            company?.orgnr ??
            company?.orgNr ??
            company?.OrganizationNumber ??
            normalizedQueryOrgnr;
          val = normalizeOrgnr(fromCompany);
        }
  
        if (field === "status" && (val == null || val === "")) {
          val = "Klar for utsendelse";
        }
  
        if (val != null && val !== "") {
          record[field] = val;
        }
      }
  
      // sikkerhet: alltid med orgnr
      if (!record.orgnr) record.orgnr = normalizedQueryOrgnr;
  
      data.push(record);
    });
  
    return data;
}
  

function startMultisaveProcess(orgnrList) {
    const baseid = "apphYxX1bX4Yt1F6I";
    const tabelid = "tbl9f3Y6b1f3bK3zE";
  
    const data = creatSaveCompatibleList(orgnrList);
  
    // Post til Airtable
    multisaveAirtable(data, baseid, tabelid);
}
  

function returnfromAirtable(data) {

}



async function multisaveAirtable(data, baseid, tabelid) {
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
        multiimportRespond({ success: true, data: allResponses});
    } catch (error) {
        console.error("Prosesseringen ble stoppet på grunn av en feil:", error);
        statusProcessing(totalRows, uploadedRows);
        multiimportRespond({ success: false, error: error.message});
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