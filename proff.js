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
    dataFromProff(data);
  } catch (err) {
    console.error(`[proff] ${orgnr} – FEIL:`, err?.message || err);
    dataFromProff(null); // vis tom modal ved feil
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

function dataFromProff(data){
  // --- 0) Håndter null/ingen treff ---
  if (!data || (data && !data.name && !data.orgnr)) {
    const titleEl = document.getElementById('proffTitle');
    const subtitleEl = document.getElementById('proffSubtitle');
    const body = document.getElementById('proffBody');

    if (titleEl) titleEl.textContent = 'Selskap ikke funnet i Proff';
    if (subtitleEl) subtitleEl.innerHTML = '';

    if (body) {
      body.innerHTML = `
        <div class="proff-section" style="padding:12px;border:1px solid #374151;border-radius:8px;background:#111827;color:#E5E7EB;">
          <div style="font-weight:600;margin-bottom:6px;">Ingen treff</div>
          <div style="opacity:0.85;">
            Vi fant ingen data for dette selskapet i Proff akkurat nå. Prøv igjen senere,
            kontroller organisasjonsnummeret, eller søk manuelt på proff.no.
          </div>
        </div>
      `;
      if (typeof showProffModal === 'function') showProffModal();
      else alert('Selskap ikke funnet i Proff.');
    } else {
      alert('Selskap ikke funnet i Proff.');
    }
    return;
  }

  // --- 1) Sikre objekt + helpers ---
  const d = data || {};
  const title = _safe(d.name);
  const org = normalizeOrgnr(_safe(d.orgnr));
  const web = _link(d.homepage, prettyUrl(d.homepage));
  const email = _mail(d.email);
  const phone = _tel(d.phone);
  const phones = Array.isArray(d.phones) ? d.phones.filter(Boolean) : [];

  const v = d.address?.visit || {};
  const p = d.address?.postal || {};
  const leder = d.dagligLeder || {};

  // --- 2) Header ---
  const titleEl = document.getElementById('proffTitle');
  if (titleEl) titleEl.textContent = title;

  const subtitleEl = document.getElementById('proffSubtitle');
  if (subtitleEl) {
    subtitleEl.innerHTML = `Org.nr <span class="mono">${org}</span> ${
      d.companyId ? `<span class="proff-chip">ID: ${d.companyId}</span>` : ''
    }`;
  }

  // --- 3) Body ---
  const body = document.getElementById('proffBody');
  if (!body) return;

  body.innerHTML = `
    <div class="proff-grid">
      <div class="proff-section">
        <h4 class="proff-sec-title">Kontakt</h4>
        <div class="proff-row"><small>Nettside:</small> ${web || '—'}</div>
        <div class="proff-row"><small>E-post:</small> ${email || '—'}</div>
        <div class="proff-row"><small>Telefon:</small> ${phone || '—'}</div>
        ${phones.length ? `<div class="proff-row"><small>Andre numre:</small> ${phones.map(_tel).join(' · ')}</div>` : ''}
      </div>

      <div class="proff-section">
        <h4 class="proff-sec-title">Daglig leder</h4>
        <div class="proff-row">
          ${_safe(leder.name)} ${leder.role ? `<span class="proff-chip">${leder.role}</span>` : ''}
        </div>
        <div class="proff-row"><small>E-post:</small> ${_mail(leder.email) || '—'}</div>
        <div class="proff-row"><small>Telefon:</small> ${_tel(leder.phone) || '—'}</div>
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

    <!-- Enrichment panel -->
    <div id="proff-enrich-panel" class="proff-section" style="margin-top:16px;">
      <h4 class="proff-sec-title">Berik selskap i utvalg</h4>
      <div id="proff-enrich-content" class="proff-diff"></div>
      <div id="proff-enrich-actions" style="margin-top:12px; display:flex; gap:8px;"></div>
    </div>
  `;

  // --- 4) Diff mot gSelectbedrifter ---
  const selIdx = (gSelectbedrifter || []).findIndex(
    b => normalizeOrgnr(b?.organisasjonsnummer) === org
  );
  const diffEl = document.getElementById('proff-enrich-content');
  const actEl  = document.getElementById('proff-enrich-actions');

  if (selIdx === -1) {
    if (diffEl) {
      diffEl.innerHTML = `
        <div class="proff-row" style="opacity:0.9;">
          Dette selskapet er ikke i utvalget. Du kan legge det til først, og deretter berike.
        </div>`;
    }
    if (actEl) {
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Legg til i utvalg';
      Object.assign(addBtn.style, btnPrimaryStyle());
      addBtn.onclick = () => {
        const entry = {
          navn: d.name || '',
          organisasjonsnummer: org,
          epostadresse: d.email || '',
          telefon: d.phone || '',
          hjemmeside: d.homepage || '',
          lederNavn: leder.name || '',
          lederEpost: leder.email || '',
          lederTelefon: leder.phone || '',
        };
        gSelectbedrifter = Array.isArray(gSelectbedrifter) ? gSelectbedrifrifter : [];
        gSelectbedrifter.push(entry);
        try { localStorage.setItem('gSelectbedrifter', JSON.stringify(gSelectbedrifter)); } catch {}
        if (typeof renderSelect === 'function') renderSelect(gSelectbedrifter);
      };
      actEl.appendChild(addBtn);
    }
    if (typeof showProffModal === 'function') showProffModal();
    return;
  }

  const current = gSelectbedrifter[selIdx] || {};
  const diffRows = [];

  const DIFF_FIELDS = [
    { proff: 'email',             label: 'E-post',         target: 'epostadresse' },
    { proff: 'phone',             label: 'Telefon',        target: 'telefon' },
    { proff: 'homepage',          label: 'Nettside',       target: 'hjemmeside',
      renderNew: v => prettyUrl(v), renderOld: v => prettyUrl(v) },
    { proff: 'dagligLeder.name',  label: 'Leder navn',     target: 'lederNavn' },
    { proff: 'dagligLeder.email', label: 'Leder e-post',   target: 'lederEpost' },
    { proff: 'dagligLeder.phone', label: 'Leder telefon',  target: 'lederTelefon' },
  ];

  DIFF_FIELDS.forEach(({ proff, label, target, renderNew, renderOld }) => {
    const proffVal = pick(d, proff);
    const oldVal   = current[target];
    const sNew = toStr(proffVal);
    const sOld = toStr(oldVal);
    if (!sNew) return;
    if (sNew === sOld) return;

    diffRows.push({
      label,
      oldVal: renderOld ? renderOld(sOld) : sOld,
      newVal: renderNew ? renderNew(sNew) : sNew,
      target,
      rawNew: sNew
    });
  });

  if (diffEl) {
    if (!diffRows.length) {
      diffEl.innerHTML = `<div class="proff-row" style="opacity:0.8;">Ingen nye verdier å berike – alt er allerede oppdatert.</div>`;
    } else {
      diffEl.innerHTML = diffRows.map(r => `
        <div class="proff-diff-row"
             style="display:grid;grid-template-columns:130px 1fr 24px 1fr;gap:8px;align-items:center;padding:6px 8px;border:1px solid #374151;border-radius:6px;margin-bottom:6px;">
          <div style="color:#9CA3AF;">${r.label}</div>
          <div style="opacity:0.9;">${r.oldVal || '—'}</div>
          <div style="text-align:center;">→</div>
          <div style="font-weight:600;">${r.newVal}</div>
        </div>
      `).join('');
    }
  }

  if (actEl) {
    actEl.innerHTML = '';
    const enrichBtn = document.createElement('button');
    enrichBtn.textContent = 'Berik selskap';
    Object.assign(enrichBtn.style, btnPrimaryStyle());
    enrichBtn.disabled = diffRows.length === 0;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Lukk';
    Object.assign(cancelBtn.style, btnGhostStyle());

    enrichBtn.onclick = () => {
      if (!diffRows.length) return;
      const updated = { ...current };
      diffRows.forEach(r => { updated[r.target] = r.rawNew; });
      gSelectbedrifter[selIdx] = updated;
      try { localStorage.setItem('gSelectbedrifter', JSON.stringify(gSelectbedrifter)); } catch {}
      alert('Selskapet er beriket med nye data fra Proff.');
      if (typeof renderSelect === 'function') renderSelect(gSelectbedrifter);
    };

    cancelBtn.onclick = () => {
      if (typeof closeProffModal === 'function') closeProffModal();
      else document.getElementById('proffModal')?.classList.remove('open');
    };

    actEl.appendChild(enrichBtn);
    actEl.appendChild(cancelBtn);
  }

  if (typeof showProffModal === 'function') showProffModal();
}

// --- Små helpers brukt over (hvis du ikke allerede har dem globalt) ---
function normalizeOrgnr(v){ return String(v ?? '').replace(/\D/g,'').padStart(9,'0'); }
function prettyUrl(u=''){ return String(u||'').replace(/^https?:\/\//i,'').replace(/\/$/,''); }
function pick(obj, path){ return path.split('.').reduce((a,k)=> (a && a[k]!=null ? a[k] : undefined), obj); }
function toStr(v){ return v==null ? '' : String(v).trim(); }
function btnPrimaryStyle(){ return { background:'#2563EB', color:'#fff', border:'1px solid #1D4ED8', padding:'8px 12px', borderRadius:'8px', cursor:'pointer', fontWeight:'600' }; }
function btnGhostStyle(){ return { background:'transparent', color:'#E5E7EB', border:'1px solid #374151', padding:'8px 12px', borderRadius:'8px', cursor:'pointer', fontWeight:'500' }; }



// Felt-mapping fra Proff -> vårt datasett
const PROFF_FIELD_MAP = {
  email:        'epostadresse',
  phone:        'telefon',
  homepage:     'hjemmeside',
  // Lederfelter—hvis du ønsker å lagre disse også i dine entries:
  'dagligLeder.name':  'lederNavn',
  'dagligLeder.email': 'lederEpost',
  'dagligLeder.phone': 'lederTelefon',
};

