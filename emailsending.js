

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

function getEmailBody(company, stepp) {
  // --- helpers --------------------------------------------------------------
  const escapeHtml = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');
  const pad9 = (v) => onlyDigits(v).padStart(9, '0');

  // --- company fields -------------------------------------------------------
  const orgnr   = pad9(company?.organisasjonsnummer ?? company?.orgnr ?? '');
  const navn    = company?.navn || '';
  const kontakt = company?.kontaktperson?.navn || company?.lederNavn || '';
  const greetingName = kontakt || navn || 'der';
  const subject = stepp?.subject || 'Smarte innkjøp for bedre lønnsomhet';

  //Stepp detaljer
  const ctatext = stepp?.cta || 'Prøv oss helt uforpliktet i 30 dager';
  const bodyInnerHtml = stepp?.body || '';


  // --- sporing (Zapier fyller inn {{trackingId}}) ---------------------------
  const PUBLIC_BASE_URL = 'https://airtable-time-runner.vercel.app'; // API-base
  const rawCtaTrial     = 'https://ikg-businessbooster.webflow.io/response';
  const rawCtaContact   = 'mailto:post@innkjops-gruppen.no';
  const rawUnsubscribe  = 'https://ikg-businessbooster.webflow.io/unsubscribe';

  // CTA via clk (tracker click) -> dest m/ rid i query
  const ctaHrefTrial =
    `${PUBLIC_BASE_URL}/api/clk?rid={{trackingId}}&to=${
      encodeURIComponent(`${rawCtaTrial}${rawCtaTrial.includes('?') ? '&' : '?'}rid={{trackingId}}`)
    }`;

  // Avmelding via clk (tracker click) -> din unsub-side m/ rid i query
  const unsubHref =
    `${PUBLIC_BASE_URL}/api/clk?rid={{trackingId}}&to=${
      encodeURIComponent(`${rawUnsubscribe}${rawUnsubscribe.includes('?') ? '&' : '?'}rid={{trackingId}}`)
    }`;

  // Åpningspiksel
  const openPixelSrc = `${PUBLIC_BASE_URL}/api/open.gif?rid={{trackingId}}`;

  // --- content --------------------------------------------------------------
  const preheader =
    '';

  // --- HTML -----------------------------------------------------------------
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
    /* Diskret footer for avmelding */
    .footer { width:100%; max-width:640px; margin:12px auto 0; color:#8FA2B8; font-size:12px; text-align:center; }
    .unsub { color:#8FA2B8 !important; text-decoration:underline; }
    .mute { color:#6B7E95; font-size:11px; }
    @media (max-width:480px) {
      .content { padding:20px; }
      .header { padding:16px 20px; }
      .signature { padding:16px 20px; }
    }
  </style>
</head>
<body style="background:#0B1220; margin:0;">
  <!-- preheader -->
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
                <p class="title">${subject}</p>
                <p class="subtle">Til ${navn ? escapeHtml(navn) : 'deres virksomhet'}${orgnr ? ' (org.nr ' + orgnr + ')' : ''}</p>
              </td>
            </tr>

            <tr>
              <td class="content">
                ${bodyInnerHtml}

                <a href="${ctaHrefTrial}" class="cta" target="_blank" rel="noopener">
                  ${escapeHtml(ctatext)}
                </a>
                
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

          <!-- Diskret avmelding i bunn -->
          <div class="footer">
            <span class="mute">Ønsker du ikke flere e-poster?</span>
            &nbsp;<a class="unsub" href="${unsubHref}" target="_blank" rel="noopener">Avmelding</a>
          </div>

        </td>
      </tr>
    </table>
  </div>

  <!-- Åpningspiksel (unngå display:none for bedre treff) -->
  <img src="${openPixelSrc}" width="1" height="1" style="opacity:0;width:1px;height:1px;border:0;" alt="" />
</body>
</html>
`;
}


function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
}



