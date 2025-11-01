function renderProsess(data){
    const tbody = document.getElementById('rowlistProsess');
    if (!tbody) return;
    tbody.innerHTML = '';
  
    // --- Badge-styles (settes én gang) ---
    if (!document.getElementById('prosess-badge-style')) {
      const style = document.createElement('style');
      style.id = 'prosess-badge-style';
      style.textContent = `
        .prosess-row { position: relative; }
        .prosess-badge-cell { position: relative; width: 24px; }
        .prosess-badge {
          position: absolute;
          top: 4px;
          right: 6px;
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          border-radius: 9999px;
          background: #e02424; /* rød */
          color: #fff;
          font-size: 11px;
          line-height: 18px;
          text-align: center;
          font-weight: 700;
          display: inline-block;
          pointer-events: none; /* ikke klikkbar */
        }
      `;
      document.head.appendChild(style);
    }
  
    // --- Hjelpere ---
    const val = v => (v == null ? '' : String(v));
    const low = v => val(v).toLowerCase();
    const fmtDate = (d) => (!d ? '—' : (isNaN(new Date(d)) ? d : new Date(d).toLocaleDateString('no-NO')));
    const fmtAddr = (b) => {
      const a = b?.forretningsadresse || b?.postadresse || {};
      const adr = Array.isArray(a.adresse) ? a.adresse.join(', ') : a.adresse;
      return [adr, a.postnummer, a.poststed].filter(Boolean).join(', ') || '—';
    };
    const normalizeOrgnr = (v) => String(v ?? '').replace(/\D/g, '').padStart(9, '0');
    const getOrgnr = (obj) =>
      normalizeOrgnr(obj?.organisasjonsnummer ?? obj?.orgnr ?? obj?.orgNr ?? obj?.OrganizationNumber);
  
    // Kontaktfelt helpers (uendret fra deg)
    const getEmail = (it) =>
      String(it?.epostadresse ?? it?.epost ?? it?.email ?? it?.mail ?? '').trim().replace(/^mailto:/i, '');
    const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
    const hasEmail = (it) => !!getEmail(it);
  
    const getPhone = (it) =>
      String(it?.mobil ?? it?.mobilnummer ?? it?.telefon ?? it?.telefonnummer ?? it?.phone ?? it?.tlf ?? '').trim();
    const hasPhone = (it) => !!getPhone(it);
  
    const getWeb = (it) =>
      String(it?.hjemmeside ?? it?.hjemmesideurl ?? it?.hjemmesideUrl ?? it?.web ?? it?.www ?? it?.website ?? it?.nettside ?? '').trim();
    const hasWeb = (it) => !!getWeb(it);
  
    // --- Les filtre ---
    const searchEl   = document.getElementById('search-input-prosess');
    const searchTerm = low(searchEl ? searchEl.value : '');
  
    const grpSel      = document.getElementById('filterGroupProsessMaster');
    const rawFilter   = grpSel ? grpSel.value : '';
    const filterGroup = String(rawFilter || '').trim();
  
    // --- Filtrer grunnlag ---
    let filteredData = Array.isArray(data) ? data.slice() : [];
  
    if (!(filterGroup === '' || filterGroup.toLowerCase() === 'all')) {
      filteredData = filteredData.filter(b => String(b.group ?? '').trim() === filterGroup);
    }
  
    if (searchTerm) {
      filteredData = filteredData.filter(b => {
        const a   = b?.forretningsadresse || b?.postadresse || {};
        const adr = Array.isArray(a.adresse) ? a.adresse.join(', ') : a.adresse;
        const grp = (window.gGroupbedrifter || []).find(gr => String(gr.id) === String(b.group ?? ''));
        return (
          low(b?.navn).includes(searchTerm) ||
          val(b?.organisasjonsnummer).includes(searchTerm) ||
          low(adr).includes(searchTerm) ||
          val(a?.postnummer).includes(searchTerm) ||
          low(a?.poststed).includes(searchTerm) ||
          (grp && (low(grp.name).includes(searchTerm) || low(grp.user).includes(searchTerm)))
        );
      });
    }
  
    // --- Render rader ---
    (filteredData || []).forEach((b) => {
      const tr = document.createElement('tr');
      tr.classList.add('default-row', 'prosess-row');
  
      const org = getOrgnr(b);
      const g = (gGroupbedrifter || []).find(gr => String(gr.id) === String(b.group ?? ''));
      const contactHtml = renderContactIcons(b);
  
      // Normaliser antall eposter
      const countRaw = b?.countprosess ?? b?.countProsess ?? null;
      const count = Number(countRaw);
      const showBadge = Number.isFinite(count) && count > 0;
  
      tr.innerHTML = `
        <td style="width:40px;">
          <input type="checkbox" class="selectcheckbox" data-orgnr="${org}">
        </td>
        <td class="mono" style="font-size:10px;">${org}</td>
        <td style="font-weight:700;font-size:12px;">${b.navn ?? '—'}</td>
        <td style="font-size:11px;">${fmtAddr(b)}</td>
        <td style="font-size:11px;">${g ? g.name : '—'}</td>
        <td style="font-size:11px;">${g ? (g.user || '—') : '—'}</td>
        <td style="font-size:11px;">${fmtDate(b.registreringsdatoEnhetsregisteret || b.registreringsdatoForetaksregisteret)}</td>
        <td class="contact-cell" style="font-size:11px;">${contactHtml}</td>
        <td class="prosess-badge-cell">
          ${showBadge ? `<span class="prosess-badge" aria-label="Antall eposter i forløp">${count}</span>` : ''}
        </td>
      `;
  
      tr.style.cursor = 'pointer';

    // Enkeltklikk: toggle/åpne ekspansjon m/ fetch
    tr.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('input[type="checkbox"]')) return;
    if (t.closest('a')) return;
    handleRowClick(tr, b); // <— NY
    });

    // Dobbeltklikk: behold eksisterende adferd
    tr.addEventListener('dblclick', (e) => {
    const t = e.target;
    if (t.closest('input[type="checkbox"]')) return;
    if (t.closest('a')) return;
    const org = getOrgnr(b);
    if (typeof openEditPopup === 'function') {
        openEditPopup(b, org);
    }
    });

  
      tbody.appendChild(tr);
    });
  }
  


  // Hjelpere for ID-e
const getOrgnr = (obj) =>
  normalizeOrgnr(obj?.organisasjonsnummer ?? obj?.orgnr ?? obj?.orgNr ?? obj?.OrganizationNumber);
const getAirtableId = (obj) => String(obj?.airtable ?? obj?.airTable ?? obj?.airtableId ?? obj?.airtable_id ?? '').trim();

// MOCK: Bytt dette med ekte fetch mot din server
// Forvent at du søker på "airtable" (airtableId) server-side.
async function fetchEmailFlowsByAirtable(airtableId) {
  // eksempel på ekte kall:
  // const res = await fetch(`/api/epostlop?airtable=${encodeURIComponent(airtableId)}`);
  // if (!res.ok) throw new Error('Serverfeil');
  // return await res.json();

  // Eksempeldata (du kan forme som du vil)
  await new Promise(r => setTimeout(r, 400)); // simuler litt latency
  return [
    {
      id: 'flow_01',
      step: 1,
      subject: 'Introduksjon',
      status: 'queued',            // queued | sent | failed | opened | clicked
      scheduledAt: '2025-10-28T09:00:00Z',
      sentAt: null,
      to: 'post@kunde.no'
    },
    {
      id: 'flow_02',
      step: 2,
      subject: 'Oppfølging #1',
      status: 'sent',
      scheduledAt: '2025-10-30T10:00:00Z',
      sentAt: '2025-10-30T10:00:12Z',
      to: 'post@kunde.no'
    },
    {
      id: 'flow_03',
      step: 3,
      subject: 'Oppfølging #2',
      status: 'queued',
      scheduledAt: '2025-11-02T10:00:00Z',
      sentAt: null,
      to: 'post@kunde.no'
    }
  ];
}

// Presenter flows i en liten tabell-grid
function renderEmailFlows(flows = []) {
  if (!flows.length) {
    return `<div class="muted">Ingen epostforløp funnet for denne kunden.</div>`;
  }
  const hdr = `
    <div class="flows-grid" style="margin-bottom:6px;">
      <div class="hdr">Emne</div>
      <div class="hdr">Steg</div>
      <div class="hdr">Status</div>
      <div class="hdr">Planlagt / Sendt</div>
    </div>
  `;
  const rows = flows.map(f => {
    const statusTag = (() => {
      const base = 'tag';
      if (f.status === 'sent' || f.status === 'opened' || f.status === 'clicked') return `${base} ok`;
      if (f.status === 'failed') return `${base} warn`;
      return base;
    })();
    const when =
      f.sentAt
        ? new Date(f.sentAt).toLocaleString('no-NO')
        : (f.scheduledAt ? new Date(f.scheduledAt).toLocaleString('no-NO') : '—');

    return `
      <div class="flows-grid">
        <div><strong>${f.subject || '—'}</strong><div class="muted">${f.to || ''}</div></div>
        <div>${Number.isFinite(+f.step) ? f.step : '—'}</div>
        <div><span class="${statusTag}">${f.status || '—'}</span></div>
        <div>${when}</div>
      </div>
    `;
  }).join('');

  return hdr + rows;
}

// Oppretter / toggler en ekspansjonsrad etter gitt <tr>
function toggleExpandRowAfter(tr, contentHTML, open = true) {
    const next = tr.nextElementSibling;
    const isExpandRow = next && next.classList.contains('expand-row');
  
    // Hvis raden allerede er åpen, og vi klikker igjen ⇒ lukk den
    if (isExpandRow) {
      const wrap = next.querySelector('.expand-wrap');
      wrap.style.maxHeight = '0px';
      setTimeout(() => next.remove(), 260);
      return; // <- stopper her, så du får "toggle"-oppførsel
    }
  
    // Ellers åpne ny
    const colSpan = tr.children.length;
    const expandTr = document.createElement('tr');
    expandTr.className = 'expand-row';
    expandTr.innerHTML = `
      <td colspan="${colSpan}">
        <div class="expand-wrap">
          <div class="expand-inner">${contentHTML}</div>
        </div>
      </td>
    `;
    tr.parentNode.insertBefore(expandTr, tr.nextSibling);
  
    const wrap = expandTr.querySelector('.expand-wrap');
    const inner = expandTr.querySelector('.expand-inner');
    wrap.style.maxHeight = '0px';
    requestAnimationFrame(() => {
      wrap.style.maxHeight = inner.scrollHeight + 'px';
    });
  }
  

// Hovedfunksjon for klikk på rad (enkeltklikk = åpne/toggle ekspansjon)
async function handleRowClick(tr, bedriftObj) {
  const airtableId = getAirtableId(bedriftObj);
  if (!airtableId) {
    // Ingen airtable-id => bare toggl tom seksjon med melding
    toggleExpandRowAfter(tr, `<div class="muted">Ingen "airtable"-verdi på denne raden.</div>`, true);
    return;
  }

  // Vis loading mens vi henter
  toggleExpandRowAfter(tr, `<span class="spinner" aria-hidden="true"></span> Henter epostforløp …`, true);

  try {
    const flows = await fetchEmailFlowsByAirtable(airtableId);
    const html = renderEmailFlows(flows);
    toggleExpandRowAfter(tr, html, true);
  } catch (err) {
    toggleExpandRowAfter(tr, `<div class="tag warn">Feil ved henting</div> <span class="muted">${String(err?.message || err)}</span>`, true);
  }
}
