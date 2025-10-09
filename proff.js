// Justér til ditt domene hvis frontenden kjører et annet sted:
const API_BASE = 'https://boosterapi.vercel.app';

/**
 * Logger ett selskap fra Proff-API via din boosterapi-backend.
 * Bruk: logCompanyOnce('830068872')
 */
async function logCompanyOnce(orgnr,returnid) {
  try {
    const clean = String(orgnr).replace(/\D/g, '');
    if (!/^\d{9}$/.test(clean)) throw new Error('Ugyldig orgnr (må være 9 siffer)');

    console.time(`[proff] ${clean}`);
    const res = await fetch(`${API_BASE}/api/proff/company/enrich/${encodeURIComponent(clean)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json().catch(() => ({}));
    if (!json?.ok) throw new Error(json?.error || 'Ukjent API-feil');

    // Endepunktet ditt returnerer { ok, source, data, shaped }
    const data = json.shaped ?? json.data ?? json;
    console.timeEnd(`[proff] ${clean}`);
    ruteresponse(data,returnid);
  } catch (err) {
    console.error(`[proff] ${orgnr} – FEIL:`, err?.message || err);
    throw err;
  }
}



// Hjelpere
const _val = v => (v == null ? '' : String(v));
const _safe = (v, dash='—') => (_val(v).trim() || dash);
const _link = (url, text) => url ? `<a class="proff-link" href="${url}" target="_blank" rel="noopener">${text||url}</a>` : '—';
const _tel = (n) => n ? `<a class="proff-link" href="tel:${n}">${n}</a>` : '—';
const _mail = (m)=> m ? `<a class="proff-link" href="mailto:${m}">${m}</a>` : '—';

function closeProffModal(){
  const m = document.getElementById('proffModal');
  if (!m) return;
  m.classList.add('hidden');
  // gi fokus tilbake hvis ønskelig
}

function showProffModal(){
  const m = document.getElementById('proffModal');
  if (!m) return;
  m.classList.remove('hidden');

  // Lukking: overlay, X, knapp, Escape
  m.querySelectorAll('[data-close]').forEach(el=>{
    el.onclick = closeProffModal;
  });
  function onEsc(e){ if (e.key === 'Escape') { closeProffModal(); window.removeEventListener('keydown', onEsc); } }
  window.addEventListener('keydown', onEsc, { once:true });
}

// Hovedfunksjonen du etterspurte:
function dataFromProff(data){
  // Sikre objekt
  const d = data || {};
  const title = _safe(d.name);
  const org = _safe(d.orgnr);
  const web = _link(d.homepage, d.homepage?.replace(/^https?:\/\//,''));
  const email = _mail(d.email);
  const phone = _tel(d.phone);
  const phones = Array.isArray(d.phones) ? d.phones.filter(Boolean) : [];

  const v = d.address?.visit || {};
  const p = d.address?.postal || {};

  const leder = d.dagligLeder || {};

  // Fyll header
  document.getElementById('proffTitle').textContent = title;
  document.getElementById('proffSubtitle').innerHTML = `Org.nr <span class="mono">${org}</span> ${d.companyId ? `<span class="proff-chip">ID: ${d.companyId}</span>` : ''}`;

  // Bygg body
  const body = document.getElementById('proffBody');
  if (!body) return;

  body.innerHTML = `
    <div class="proff-grid">
      <div class="proff-section">
        <h4 class="proff-sec-title">Kontakt</h4>
        <div class="proff-row"><small>Nettside:</small> ${web}</div>
        <div class="proff-row"><small>E-post:</small> ${email}</div>
        <div class="proff-row"><small>Telefon:</small> ${phone}</div>
        ${phones.length ? `<div class="proff-row"><small>Andre numre:</small> ${phones.map(_tel).join(' · ')}</div>` : ''}
      </div>

      <div class="proff-section">
        <h4 class="proff-sec-title">Daglig leder</h4>
        <div class="proff-row">${_safe(leder.name)} ${leder.role ? `<span class="proff-chip">${leder.role}</span>` : ''}</div>
        <div class="proff-row"><small>E-post:</small> ${_mail(leder.email)}</div>
        <div class="proff-row"><small>Telefon:</small> ${_tel(leder.phone)}</div>
      </div>

      <div class="proff-section">
        <h4 class="proff-sec-title">Besøksadresse</h4>
        <div class="proff-row">
          ${_safe(v.addressLine)}${v.boxAddressLine ? ', ' + v.boxAddressLine : ''}<br>
          ${_safe(v.zipCode)} ${_safe(v.postPlace)}
        </div>
      </div>

      <div class="proff-section">
        <h4 class="proff-sec-title">Postadresse</h4>
        <div class="proff-row">
          ${_safe(p.addressLine)}${p.boxAddressLine ? ', ' + p.boxAddressLine : ''}<br>
          ${_safe(p.zipCode)} ${_safe(p.postPlace)}
        </div>
      </div>
    </div>
  `;

  showProffModal();
}