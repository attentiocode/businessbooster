

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
  // ---- helpers ----
  const escapeHtml = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');
  const pad9 = (v) => onlyDigits(v).padStart(9, '0');

  // ---- company / step ----
  const orgnr   = pad9(company?.organisasjonsnummer ?? company?.orgnr ?? '');
  const navn    = company?.navn || '';
  const kontakt = company?.kontaktperson?.navn || company?.lederNavn || '';
  const subject = stepp?.subject || 'Smarte innkjøp for bedre lønnsomhet';
  const ctatext = stepp?.cta || 'Prøv oss helt uforpliktet i 30 dager';
  const bodyInnerHtml = stepp?.body || '';

  // ---- tracking / links ----
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

  // ---- theme palette ----
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
      cardAlt:  '#0B1220'
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
      cardAlt:  '#F9FAFB'
    }
  };
  const T = palettes[theme] || palettes.dark;

  const preheader = '';

  // ---- HTML ----
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
    .container { width:100%; background:${T.pageBg}; padding:24px 0; }
    .card {
      width:100%; max-width:640px; margin:0 auto;
      background:${T.cardBg}; color:${T.text};
      border:1px solid ${T.cardBd}; border-radius:12px; overflow:hidden;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    }
    .header { padding:20px 24px; border-bottom:1px solid ${T.cardBd}; }
    .title  { font-size:20px; font-weight:700; color:${T.textStrong}; margin:0; }
    .subtle { font-size:12px; color:${T.subtle}; }
    .content { padding:24px; line-height:1.55; font-size:14px; color:${T.text}; }
    .list { margin:12px 0 18px; padding-left:18px; }
    .list li { margin:6px 0; }

    /* --- CTA med 100% hvit tekst --- */
    .cta {
      display:inline-block;
      margin-top:18px;
      padding:12px 22px;
      font-weight:700;
      background:${T.ctaBg};
      color:${T.ctaText} !important;
      border-radius:8px;
      border:1px solid ${T.ctaBd};
      text-align:center;
      text-decoration:none !important;
      -webkit-text-fill-color:${T.ctaText};
      text-rendering:optimizeLegibility;
      -webkit-font-smoothing:antialiased;
      mso-style-priority:100 !important;
    }

    .cta-secondary {
      display:inline-block;
      margin-top:12px;
      padding:10px 20px;
      font-weight:600;
      background:transparent;
      color:${T.link};
      border-radius:8px;
      border:1px solid ${T.ctaBd};
    }

    .meta { margin-top:20px; font-size:13px; color:${T.meta}; }
    .highlight {
      font-size:16px; color:#FBBF24; font-weight:600;
      margin-top:20px; text-align:center;
    }

    .signature { padding:20px 24px; border-top:1px solid ${T.cardBd}; background:${T.cardAlt}; }
    .footer { width:100%; max-width:640px; margin:12px auto 0; color:${T.footer}; font-size:12px; text-align:center; }
    .unsub { color:${T.footer} !important; text-decoration:underline; }
    .mute { color:${T.footerMute}; font-size:11px; }

    @media (max-width:480px) {
      .content { padding:20px; }
      .header { padding:16px 20px; }
      .signature { padding:16px 20px; }
    }

    .content a { color:${T.link}; }
  </style>
</head>
<body style="background:${T.pageBg}; margin:0;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden;">${preheader}</div>

  <div class="container">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
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
              <a href="${ctaHrefTrial}" class="cta" target="_blank" rel="noopener">
                ${escapeHtml(ctatext)}
              </a>
            </td>
          </tr>

          <tr>
            <td class="signature">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align:top; width:100px; padding-right:16px;">
                    <img src="https://ucarecdn.com/fa31999d-6d1c-4902-b1d0-8453a8009b5c/Tamara.jpg"
                         alt="Tamara Gangsøy" width="80" style="border-radius:6px; display:block;" />
                  </td>
                  <td style="vertical-align:top; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:${T.text}; font-size:14px; line-height:1.4;">
                    <p style="margin:0 0 4px; font-weight:600; color:${T.textStrong};">Tamara Gangsøy</p>
                    <p style="margin:0 0 8px;">Kundeservice<br />+47 45 49 19 01<br />
                      <a href="mailto:tamara@innkjops-gruppen.no" style="color:${T.link}; text-decoration:none;">tamara@innkjops-gruppen.no</a>
                    </p>
                  </td>
                </tr>
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



