var stepp1 = 1; //dager til neste steg
var stepp2 = 2;
var stepp3 = 3;
var stepp4 = 4;
var stepp5 = 5;

var subject1 = "Slik kan Innkjøps-gruppen hjelpe dere med bedre innkjøpsbetingelser";
var subject2 = "Har dere vurdert Innkjøps-gruppen for bedre innkjøpsbetingelser?";
var subject3 = "Få bedre innkjøpsbetingelser med Innkjøps-gruppen";
var subject4 = "Siste sjanse til å forbedre innkjøpsbetingelsene deres";
var subject5 = "Avsluttende tilbud: Forbedre innkjøpsbetingelsene deres i dag";

var emailbody1 = "";
var emailbody2 = "";
var emailbody3 = "";
var emailbody4 = "";
var emailbody5 = "";


function sendEmailToCompany(company, totalRows, uploadedRows) {
   
   if (!company || !company.orgnr) {
        console.error("Invalid company data:", company);
        return;
    }

    let emailBody = getEmailBody(company,null);
    let subject = subject1;

    const payload = {
        orgnr: company.orgnr || '',
        navn: company.navn || '',
        epost: company.epostadresse || '',
        telefon: company.telefon || '',
        hjemmeside: company.hjemmeside || '',
        emailBody: emailBody,
        subject: subject
    };

    //sende til zapier
    let url = "https://hooks.zapier.com/hooks/catch/24993663/uragru1/"
    sendDataToZapierWebhook(payload, url);
    updateCounter("label-mailer-sendt", countReadyAndSendtCostumers(), 1000);

    //oppdater status i UI
    statusProcessing("Mailer sendt",totalRows, uploadedRows)


}

async function sendDataToZapierWebhook(data,url) {
    const formData = new FormData();
    for (const key in data) {
        const value = data[key];
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }

    const response = await fetch(url, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        console.error("Error sending data to Zapier:", response.statusText);
    }
}


function getEmailBody(company, type) {
    const orgnr   = String(company?.organisasjonsnummer ?? company?.orgnr ?? '').replace(/\D/g,'').padStart(9,'0');
    const navn    = company?.navn || '';
    const kontakt = company?.kontaktperson?.navn || company?.lederNavn || '';
    const greetingName = kontakt || navn || 'der';
  
    const preheader = `Prøv Innkjøps-gruppen helt uforpliktet i 30 dager – sparer du ikke, betaler du ikke.`;
    const ctaHrefTrial = 'https://www.innkjops-gruppen.no/prov-gratis';
    const ctaHrefContact = 'mailto:post@innkjops-gruppen.no';
  
    return `
    <!doctype html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Innkjøps-gruppen</title>
      <style>
        body,table,td,p { margin:0; padding:0; }
        img { border:0; outline:none; text-decoration:none; display:block; }
        a { text-decoration:none; }
        .container { width:100%; background:#0B1220; padding:24px 0; }
        .card {
          width:100%; max-width:640px; margin:0 auto;
          background:#0F172A; color:#E5E7EB;
          border:1px solid #1F2937; border-radius:12px; overflow:hidden;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }
        .header { padding:20px 24px; border-bottom:1px solid #1F2937; }
        .title  { font-size:20px; font-weight:700; color:#F3F4F6; margin:0; }
        .subtle { font-size:12px; color:#93A1B3; }
        .content { padding:24px; line-height:1.55; font-size:14px; color:#E5E7EB; }
        .list { margin:12px 0 18px; padding-left:18px; }
        .list li { margin:6px 0; }
        .chip {
          display:inline-block; font-size:12px; padding:4px 10px; border-radius:9999px;
          background:rgba(37,99,235,0.12); color:#93C5FD; border:1px solid rgba(37,99,235,0.35);
          margin-right:6px; margin-top:8px;
        }
        .cta {
          display:inline-block; margin-top:18px; padding:12px 22px; font-weight:700;
          background:#2563EB; color:#ffffff; border-radius:8px; border:1px solid #1D4ED8;
        }
        .cta-secondary {
          display:inline-block; margin-top:12px; padding:10px 20px; font-weight:600;
          background:transparent; color:#60A5FA; border-radius:8px; border:1px solid #1E3A8A;
        }
        .meta { margin-top:20px; font-size:13px; color:#9CA3AF; }
        .highlight {
          font-size:16px; color:#FBBF24; font-weight:600;
          margin-top:20px; text-align:center;
        }
        .signature { padding:20px 24px; border-top:1px solid #1F2937; background:#0B1220; }
        @media (max-width:480px) {
          .content { padding:20px; }
          .header { padding:16px 20px; }
          .signature { padding:16px 20px; }
        }
      </style>
    </head>
    <body style="background:#0B1220; margin:0;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden;">
        ${preheader}
      </div>
  
      <div class="container">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <table role="presentation" class="card" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header">
                    <p class="title">Smarte innkjøp for bedre lønnsomhet</p>
                    <p class="subtle">Til ${navn ? navn : 'deres virksomhet'} ${orgnr ? '(org.nr ' + orgnr + ')' : ''}</p>
                  </td>
                </tr>
  
                <tr>
                  <td class="content">
                    <p>Hei ${escapeHtml(greetingName)},</p>
                    <p style="margin-top:10px;">
                      Vi i <strong>Innkjøps-gruppen</strong> hjelper bedrifter å redusere kostnader og oppnå bedre avtaler –
                      helt uten binding. Dere får tilgang til fremforhandlede priser og rammeavtaler med solide leverandører
                      innenfor de viktigste innkjøpsområdene.
                    </p>
  
                    <ul class="list">
                      <li><strong>Lavere priser</strong> gjennom felles volum</li>
                      <li><strong>Forutsigbare vilkår</strong> og enklere administrasjon</li>
                      <li><strong>Ingen binding</strong> – prøv oss risikofritt</li>
                      <li><strong>Personlig oppfølging</strong> fra vårt erfarne team</li>
                    </ul>
  
                    <div class="highlight">
                      Sparer du ikke – betaler du ikke.
                    </div>
  
                    <a href="${ctaHrefTrial}" class="cta" target="_blank" rel="noopener">
                      Prøv oss helt uforpliktet i 30 dager
                    </a>
  
                    <a href="${ctaHrefContact}" class="cta-secondary" target="_blank" rel="noopener">
                      Har du spørsmål? Ta gjerne kontakt her
                    </a>
  
                    <div class="meta">
                      Mange bedrifter sparer betydelige summer allerede første måned – la oss vise deg hvordan.
                    </div>
                  </td>
                </tr>
  
                <tr>
                  <td class="signature">
                    <p>&nbsp;<strong>innkj&oslash;psGRUPPEN<br /></strong>
                      <span>Mobil:&nbsp;+47 91 14 52 94</span><br />
                      <span>Epost: </span><u><a href="mailto:post@innkjops-gruppen.no">post@innkjops-gruppen.no</a><br /><br /></u>
                      <u><a href="http://www.innkjops-gruppen.no/">www.innkjops-gruppen.no</a><br />
                        <img width="400" height="109" alt="" src="https://uploads-ssl.webflow.com/6346cf959f8b0bccad5075af/65a8e9fe0b759f07aa7d7b13_image002.png" />
                      </u><strong></strong>
                    </p>
                  </td>
                </tr>
  
              </table>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `;
}
  
function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
}



