

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


function getEmailBody(company, stepp, theme = 'dark') {
  const escapeHtml = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');
  const pad9 = (v) => onlyDigits(v).padStart(9, '0');

  const orgnr   = pad9(company?.organisasjonsnummer ?? company?.orgnr ?? '');
  const navn    = company?.navn || '';
  const subject = stepp?.subject || 'Smarte innkjøp for bedre lønnsomhet';
  const ctatext = stepp?.cta || 'Prøv oss helt uforpliktet i 30 dager';
  const bodyInnerHtml = stepp?.body || '';

  const PUBLIC_BASE_URL = 'https://airtable-time-runner.vercel.app';
  const rawCtaTrial     = 'https://ikg-businessbooster.webflow.io/response';
  const rawUnsubscribe  = 'https://ikg-businessbooster.webflow.io/unsubscribe';

  const ctaHrefTrial =
    `${PUBLIC_BASE_URL}/api/clk?rid={{trackingId}}&to=${
      encodeURIComponent(`${rawCtaTrial}${rawCtaTrial.includes('?') ? '&' : '?'}rid={{trackingId}}`)
    }`;
  const unsubHref =
    `${PUBLIC_BASE_URL}/api/clk?rid={{trackingId}}&to=${
      encodeURIComponent(`${rawUnsubscribe}${rawUnsubscribe.includes('?') ? '&' : '?'}rid={{trackingId}}`)
    }`;
  const openPixelSrc = `${PUBLIC_BASE_URL}/api/open.gif?rid={{trackingId}}`;

  // FARGEPALETTER (mørk -> hvit logo, lys -> sort logo)
  const palettes = {
    dark: {
      pageBg:   '#0B1220',
      cardBg:   '#0F172A',
      cardBd:   '#1F2937',
      text:     '#E5E7EB',
      textStrong:'#F3F4F6',
      subtle:   '#93A1B3',
      meta:     '#9CA3AF',
      footer:   '#8FA2B8',
      footerMute:'#6B7E95',
      ctaBg:    '#2563EB',
      ctaBd:    '#1D4ED8',
      ctaText:  '#FFFFFF',
      link:     '#60A5FA',
      cardAlt:  '#0B1220',
      logo:     'https://ucarecdn.com/288f27b9-52b5-4dcd-8322-b58829dcb71f/Logoikghvit.png' // HVIT
    },
    light: {
      pageBg:   '#F3F4F6',
      cardBg:   '#FFFFFF',
      cardBd:   '#E5E7EB',
      text:     '#111827',
      textStrong:'#0F172A',
      subtle:   '#6B7280',
      meta:     '#6B7280',
      footer:   '#6B7280',
      footerMute:'#9CA3AF',
      ctaBg:    '#2563EB',
      ctaBd:    '#1D4ED8',
      ctaText:  '#FFFFFF',
      link:     '#1D4ED8',
      cardAlt:  '#F9FAFB',
      logo:     'https://ucarecdn.com/c957df15-f29a-486b-bd73-97b2e49362be/Logoikgsort.png'   // SORT
    }
  };
  const T = palettes[theme] || palettes.dark;

  const preheader = '';

  // Bygger «bulletproof» CTA (VML for MSO + vanlig <a> for andre)
  const ctaButtonHtml = `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
      href="${ctaHrefTrial}"
      style="height:46px;v-text-anchor:middle;width:320px;"
      arcsize="12%" strokecolor="${T.ctaBd}" fillcolor="${T.ctaBg}">
      <w:anchorlock/>
      <center style="color:#FFFFFF;font-family:Segoe UI, Arial, sans-serif;font-size:15px;font-weight:bold;">
        ${escapeHtml(ctatext)}
      </center>
    </v:roundrect>
    <![endif]-->

    <!--[if !mso]><!-- -->
    <a href="${ctaHrefTrial}"
       target="_blank" rel="noopener"
       style="
         display:inline-block; margin-top:18px; padding:12px 22px;
         background:${T.ctaBg}; border:1px solid ${T.ctaBd};
         border-radius:8px; color:${T.ctaText}; text-decoration:none;
         font-weight:700; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
         -webkit-text-fill-color:${T.ctaText}; line-height:1;">
       ${escapeHtml(ctatext)}
    </a>
    <!--<![endif]-->
  `;

  return `
<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8">
<meta name="x-apple-disable-message-reformatting">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Innkjøps-gruppen</title>
<style>
  body,table,td,p {margin:0;padding:0;}
  img {border:0;outline:none;text-decoration:none;display:block;}
  a {text-decoration:none;}

  .container {width:100%;background:${T.pageBg};padding:24px 0;}
  .card {
    width:100%;max-width:640px;margin:0 auto;
    background:${T.cardBg};color:${T.text};
    border:1px solid ${T.cardBd};border-radius:12px;overflow:hidden;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  }
  .header {padding:20px 24px;border-bottom:1px solid ${T.cardBd};}
  .title {font-size:20px;font-weight:700;color:${T.textStrong};margin:0;}
  .subtle {font-size:12px;color:${T.subtle};}
  .content {padding:24px;line-height:1.55;font-size:14px;color:${T.text};}
  .signature {padding:20px 24px;border-top:1px solid ${T.cardBd};background:${T.cardAlt};}

  .footer {width:100%;max-width:640px;margin:12px auto 0;color:${T.footer};font-size:12px;text-align:center;}
  .unsub {color:${T.footer} !important;text-decoration:underline;}
  .mute {color:${T.footerMute};font-size:11px;}

  @media (max-width:480px){
    .content{padding:20px;}
    .header{padding:16px 20px;}
    .signature{padding:16px 20px;}
  }
</style>
</head>
<body style="background:${T.pageBg};margin:0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;">${preheader}</div>

  <div class="container">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" class="card" cellpadding="0" cellspacing="0">
          <tr>
            <td class="header">
              <p class="title">${escapeHtml(subject)}</p>
              <p class="subtle">Til ${navn ? escapeHtml(navn) : 'deres virksomhet'}${orgnr ? ' (org.nr ' + orgnr + ')' : ''}</p>
            </td>
          </tr>

          <tr>
            <td class="content">
              ${bodyInnerHtml}

              <!-- CTA (bulletproof) -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr><td>
                  ${ctaButtonHtml}
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="signature">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;width:160px;padding-right:20px;">
                    <img src="https://ucarecdn.com/fa31999d-6d1c-4902-b1d0-8453a8009b5c/Tamara.jpg"
                         alt="Tamara Gangsøy" width="128"
                         style="border-radius:10px;display:block;" />
                  </td>
                  <td style="vertical-align:middle;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${T.text};font-size:14px;line-height:1.5;">
                    <p style="margin:0 0 6px;font-weight:600;color:${T.textStrong};font-size:16px;">Tamara Gangsøy</p>
                    <p style="margin:0 0 10px;">Kundeservice<br>
                      <strong>+47&nbsp;45&nbsp;49&nbsp;19&nbsp;01</strong><br>
                      <a href="mailto:tamara@innkjops-gruppen.no" style="color:${T.link};text-decoration:none;">tamara@innkjops-gruppen.no</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Logo nederst, velges etter tema -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td align="center">
                  <img src="${T.logo}" alt="Innkjøps-Gruppen" width="140" style="display:block;margin:0 auto;">
                </td></tr>
              </table>
            </td>
          </tr>
        </table>

        <div class="footer">
          <span class="mute">Ønsker du ikke flere e-poster?</span>
          &nbsp;<a class="unsub" href="${unsubHref}" target="_blank" rel="noopener">Avmelding</a>
        </div>

      </td></tr>
    </table>
  </div>

  <img src="${openPixelSrc}" width="1" height="1" style="opacity:0;width:1px;height:1px;border:0;" alt="">
</body>
</html>`;
}








function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
}



