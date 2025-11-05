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
          background: rgba(128, 128, 128, 0.5);
          color: #fff;
          font-size: 11px;
          line-height: 18px;
          text-align: center;
          font-weight: 700;
          display: inline-block;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }
  
    // --- Hjelpere ---
    const val = v => (v == null ? '' : String(v));
    const low = v => val(v).toLowerCase();
    const isTruthy = (x) => x === true || x === 1 || x === '1' || String(x).toLowerCase() === 'true';
    const fmtDate = (d) => (!d ? '—' : (isNaN(new Date(d)) ? d : new Date(d).toLocaleDateString('no-NO')));
  
    // Flate adressefelt
    const fmtAddr = (b) => {
      const adr = b?.forretningsadresse_adresse || b?.postadresse_adresse;
      const postnr = b?.forretningsadresse_postnummer || b?.postadresse_postnummer;
      const poststed = b?.forretningsadresse_poststed || b?.postadresse_poststed;
      const parts = [adr, postnr, poststed].filter(Boolean);
      return parts.length ? parts.join(', ') : '—';
    };
  
    const normalizeOrgnr = (v) => String(v ?? '').replace(/\D/g, '').padStart(9, '0');
    const getOrgnr = (obj) => normalizeOrgnr(obj?.orgnr ?? obj?.organisasjonsnummer ?? obj?.orgNr ?? obj?.OrganizationNumber);
  
    // --- Predikater (brukes til både filter og badge-prioritet) ---
    const isStoppet   = b => !!b.stopp;
    const isAvmeldt   = b => !!b.unsubscribed || !!b.noInterest;
    const isAkseptert = b => Number(b.emailAcceptedCount || 0) > 0;
    const isUtgaatt   = b => {
      const sent  = Number(b.emailSentCount || 0);
      const total = Number(b.emailCount || 0);
      const acc   = Number(b.emailAcceptedCount || 0);
      return total > 0 && sent >= total && acc === 0;
    };
    const isAapnet    = b => Number(b.openedCount || 0) > 0;
    const isSendt     = b => Number(b.emailSentCount || 0) > 0;
    const isIProsess  = b => {
      const sent  = Number(b.emailSentCount || 0);
      const total = Number(b.emailCount || 0);
      const acc   = Number(b.emailAcceptedCount || 0);
      const stopp = !!b.stopp;
      const avm   = !!b.unsubscribed || !!b.noInterest;
      // Pågår: har planlagte, ikke ferdig, ikke akseptert, ikke stopp/avmeldt
      return total > 0 && sent < total && acc === 0 && !stopp && !avm;
    };
  
    // --- Badge-prioritet (hard) ---
    // 1) akseptert  2) avmeldt  3) sendt  4) stoppet  5) utgått  6) åpnet  7) i_prosess
    function getBadgeKey(b){
      if (isAkseptert(b)) return 'akseptert';
      if (isAvmeldt(b))   return 'avmeldt';
      if (isSendt(b))     return 'sendt';
      if (isStoppet(b))   return 'stoppet';
      if (isUtgaatt(b))   return 'utgått';
      if (isAapnet(b))    return 'åpnet';
      return 'i_prosess';
    }
  
    // Valgfritt: enkel “neste steg”
    function deriveStep(b) {
      const explicit = b?.step ?? b?.prosessStep ?? b?.prosess_step ?? b?.internnr ?? b?.internNr ?? null;
      if (explicit != null && /^\d+$/.test(String(explicit))) return Number(explicit);
      const sent = Number(b?.emailSentCount ?? 0);
      const total = Number(b?.emailCount ?? 0);
      if (total > 0) return Math.min(sent + 1, total);
      return null;
    }
  
    // --- Les filtre ---
    const searchEl   = document.getElementById('search-prosess-input');
    const searchTerm = low(searchEl ? searchEl.value : '');
  
    const grpSel      = document.getElementById('filterGroupProsessMaster');
    const rawFilter   = grpSel ? grpSel.value : '';
    const filterGroup = String(rawFilter || '').trim();
  
    const statusSel     = document.getElementById('filterStatusProsess');
    const statusFilter  = low(statusSel ? statusSel.value : ''); // "", "stoppet", "akseptert", "utgått", "i_prosess", "avmeldt", "åpnet", "sendt"
  
    // --- Filtrer grunnlag ---
    let filteredData = Array.isArray(data) ? data.slice() : [];
  
    // Gruppefilter
    if (!(filterGroup === '' || filterGroup.toLowerCase() === 'all')) {
      filteredData = filteredData.filter(b => String(b.group ?? '').trim() === filterGroup);
    }
  
    // Søk
    if (searchTerm) {
      filteredData = filteredData.filter(b => {
        const adr = fmtAddr(b);
        const grp = (window.gGroupbedrifter || []).find(gr => String(gr.id) === String(b.group ?? ''));
        return (
          low(b?.navn).includes(searchTerm) ||
          val(getOrgnr(b)).includes(searchTerm) ||
          low(adr).includes(searchTerm) ||
          (grp && (low(grp.name).includes(searchTerm) || low(grp.user).includes(searchTerm)))
        );
      });
    }
  
    // Statusfilter – med dedikerte predikater (forutsigbart)
    if (statusFilter) {
      filteredData = filteredData.filter(b => {
        switch (statusFilter) {
          case 'stoppet':   return isStoppet(b);
          case 'avmeldt':   return isAvmeldt(b);
          case 'akseptert': return isAkseptert(b);
          case 'utgått':    return isUtgaatt(b);
          case 'åpnet':     return isAapnet(b);
          case 'sendt':     return isSendt(b);   // vil du ha "strengt sendt", legg til opened=0 og accepted=0
          case 'i_prosess': return isIProsess(b);
          default:          return true;
        }
      });
    }
  
    // Oppdater teller
    const counterEl = document.getElementById('counterlistprosess');
    if (counterEl) counterEl.innerText = `${filteredData.length} stk. bedrifter`;
  
    // --- Render rader ---
    (filteredData || []).forEach((b) => {
      const tr = document.createElement('tr');
      tr.classList.add('default-row', 'prosess-row');
  
      const org = getOrgnr(b);
      const g = (window.gGroupbedrifter || []).find(gr => String(gr.id) === String(b.group ?? ''));
      const contactHtml = typeof renderContactIcons === 'function' ? renderContactIcons(b) : '';
  
      const emailcount    = Number(b.emailCount ?? 0);
      const emailsendt    = Number(b.emailSentCount ?? 0);
      const counttext     = `${emailsendt}/${emailcount}`;
      const showBadge     = emailcount > 0;
  
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
          ${showBadge ? `<span class="prosess-badge" aria-label="Antall eposter i forløp">${counttext}</span>` : ''}
        </td>
      `;
  
      // Badge-farge etter HARD prioritet
      const badgeEl = tr.querySelector('.prosess-badge');
      const badgeKey = getBadgeKey(b);
  
      if (badgeEl) {
        switch (badgeKey) {
          case 'akseptert': badgeEl.style.background = 'rgba(0, 200, 83, 0.75)'; break;   // grønn
          case 'avmeldt':   badgeEl.style.background = 'rgba(255, 82, 82, 0.75)'; break;  // rød
          case 'sendt':     badgeEl.style.background = 'rgba(139, 92, 246, 0.75)'; break; // lilla
          case 'stoppet':   badgeEl.style.background = 'rgba(180, 180, 180, 0.65)'; break;// grå
          case 'utgått':    badgeEl.style.background = 'rgba(255, 165, 0, 0.75)'; break;  // oransje
          case 'åpnet':     badgeEl.style.background = 'rgba(59, 130, 246, 0.75)'; break; // blå
          default:          badgeEl.style.background = 'rgba(128, 128, 128, 0.5)';        // semigrå
        }
      }
  
      tr.style.cursor = 'pointer';
  
      let clickTimer;
      tr.addEventListener('click', (e) => {
        const t = e.target;
        if (t.closest('input[type="checkbox"]') || t.closest('a')) return;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          if (typeof handleRowClick === 'function') handleRowClick(tr, b);
        }, 200);
      });
  
      tr.addEventListener('dblclick', (e) => {
        const t = e.target;
        if (t.closest('input[type="checkbox"]') || t.closest('a')) return;
        clearTimeout(clickTimer);
        if (typeof openEditPopup === 'function') openEditPopup(b, org);
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
    let obj = { external_rawId: airtableId };
    let body = airtablebodylistAND(obj);

    let baseId = "appISWcEA5QICIlzP";
    let tableId = "tblldBMExI1U4yMNI";

    let response;
    let token = MemberStack.getToken();

    response = await fetch(`https://expoapi-zeta.vercel.app/api/search?baseId=${baseId}&tableId=${tableId}&token=${token}`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: body
    });
        
    


    if (!response.ok) {
    throw new Error(`HTTP-feil! status: ${response.status} - ${response.statusText}`);
    return null;
    }else {
    let data = await response.json();
    return data.data;
    };
 

}

// Presenter flows i en liten tabell-grid
// Presenter flows i en liten tabell-grid (tilpasset Airtable-responsen over)
// Presenter flows i en tabell-grid med # og "Deaktiver" (stopp)
function renderEmailFlows(flows = []) {
    if (!Array.isArray(flows) || !flows.length) {
      return `<div class="muted">Ingen epostforløp funnet for denne kunden.</div>`;
    }
  
    // Normaliser datastruktur pr rad
    const norm = flows.map(row => {
      const id = row?.id || row?._rawJson?.id || null;
      const f = row?.fields || row?._rawJson?.fields || row || {};
  
      // payload kan være JSON-streng
      let payload = {};
      try {
        if (typeof f.payload === 'string') payload = JSON.parse(f.payload);
        else if (f.payload && typeof f.payload === 'object') payload = f.payload;
      } catch { /* ignorér parsefeil */ }
  
      // status
      let status = 'queued';
      if (f.executed === true) status = 'sent';
      else if (typeof f.status === 'string') {
        const s = f.status.toLowerCase();
        if (s === 'pending') status = 'queued';
        else if (['sent','opened','clicked','failed','queued'].includes(s)) status = s;
      }
  
      // stopp (truthy => stoppet)
      const stoppRaw = f.stopp;
      const stopp = stoppRaw === true || stoppRaw === 1 || stoppRaw === '1' || String(stoppRaw).toLowerCase() === 'true';
  
      if (stopp) {
        status = 'Stoppet';
      } else if (f.no_interest === true || f.no_interest === 1 || f.no_interest === '1' || String(f.no_interest).toLowerCase() === 'true') {
        status = 'Avmeldt';
      } else if (f.accepted === true || f.accepted === 1 || String(f.accepted).toLowerCase() === 'true') {
        status = 'Akseptert';
      } else if (f.open === true || f.open === 1 || String(f.open).toLowerCase() === 'true') {
        status = 'Åpnet';
      }
  
      return {
        id,
        subject: payload.subject || f.title || '—',
        to: payload.epost || payload.email || '',
        step: (typeof f.internnr === 'number' || /^\d+$/.test(String(f.internnr))) ? Number(f.internnr) : (f.step ?? null),
        status,
        scheduledAt: f.when || null,
        sentAt: f.executedAt || null,
        stopp
      };
    });
  
    // Sortér fornuftig (steg stigende)
    norm.sort((a, b) => {
      const sa = (a.step ?? Number.POSITIVE_INFINITY);
      const sb = (b.step ?? Number.POSITIVE_INFINITY);
      if (sa !== sb) return sa - sb;
      const ta = a.sentAt || a.scheduledAt || 0;
      const tb = b.sentAt || b.scheduledAt || 0;
      return new Date(ta) - new Date(tb);
    });
  
    const fmtDT = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return isNaN(d) ? '—' : d.toLocaleString('no-NO');
    };
  
    // Header
    const hdr = `
      <div class="flows-grid" style="margin-bottom:6px;grid-template-columns:auto 1fr auto auto auto auto;">
        <div class="hdr">#</div>
        <div class="hdr">Emne</div>
        <div class="hdr">Steg</div>
        <div class="hdr">Status</div>
        <div class="hdr">Planlagt / Sendt</div>
        <div class="hdr">Deaktiver</div>
      </div>
    `;
  
    // Rader
    const rows = norm.map((f, idx) => {
      const statusTag = (() => {
        const base = 'tag';
        if (f.status === 'Akseptert') return `${base} ok`;
        if (f.accepted === true) return `${base} ok`;
        if (f.open === true) return `${base} info`;
        if (f.stopp === true) return `${base} warn`;
        if (f.status === 'Avmeldt') return `${base} warn`;
        if (['sent','opened','clicked'].includes(f.status)) return `${base} info`;
        if (f.status === 'failed') return `${base} warn`;
        return base;
      })();
  
      const when = f.sentAt ? fmtDT(f.sentAt) : fmtDT(f.scheduledAt);
      const checked  = f.stopp ? 'checked' : '';
      const disabled = ['sent','opened','clicked'].includes(f.status) ? 'disabled' : '';
      const strikeStyle = disabled ? 'text-decoration: line-through; opacity:0.7;' : '';
  
      return `
        <div class="flows-grid" style="grid-template-columns:auto 1fr auto auto auto auto;">
          <div>${idx + 1}</div>
          <div>
            <strong>${escapeHtml(f.subject)}</strong>
            <div class="muted">${escapeHtml(f.to)}</div>
          </div>
          <div>${Number.isFinite(+f.step) ? f.step : '—'}</div>
          <div><span class="${statusTag}">${escapeHtml(f.status)}</span></div>
          <div>${when}</div>
          <div>
            <label class="muted" style="display:inline-flex;align-items:center;gap:6px;${strikeStyle}">
              <input type="checkbox"
                     class="flow-stop-toggle"
                     data-id="${escapeAttr(f.id)}"
                     data-step="${escapeAttr(f.step)}"
                     ${checked}
                     ${disabled}
              />
              Stopp
            </label>
          </div>
        </div>
      `;
    }).join('');
  
    return hdr + rows;
  
    // helpers
    function escapeHtml(s) {
      return String(s ?? '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    function escapeAttr(s) {
      return String(s ?? '').replace(/"/g, '&quot;');
    }
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
  

// ---- Hoved-click: IKKE toggle ved fetch ----
async function handleRowClick(tr, bedriftObj) {
    // Hvis allerede åpen → lukk og stopp
    if (isRowOpen(tr)) {
      closeExpandRow(tr);
      return;
    }
  
    // Åpne med "loading"
    openExpandRowAfter(tr, `<span class="spinner"></span> Henter epostforløp …`);
  
    // Hent data og ERSTATT innhold (ikke toggle)
    try {
      const airtableId = getAirtableId(bedriftObj);
      if (!airtableId) {
        replaceExpandContent(tr, `<div class="muted">Ingen "airtable"-verdi på denne raden.</div>`);
        return;
      }
      const flows = await fetchEmailFlowsByAirtable(airtableId);
      replaceExpandContent(tr, renderEmailFlows(flows));
    } catch (err) {
      replaceExpandContent(tr, `<div class="tag warn">Feil ved henting</div> <span class="muted">${String(err?.message || err)}</span>`);
    }
  }

  

  // ---- Expand helpers (ikke toggle i samme fn) ----
function isRowOpen(tr) {
    const next = tr.nextElementSibling;
    return !!(next && next.classList.contains('expand-row'));
  }
  
  function openExpandRowAfter(tr, contentHTML) {
    const colSpan = tr.children.length;
    let next = tr.nextElementSibling;
  
    if (next && next.classList.contains('expand-row')) {
      // finnes: bare oppdater innhold + høyde
      const inner = next.querySelector('.expand-inner');
      const wrap  = next.querySelector('.expand-wrap');
      inner.innerHTML = contentHTML;
      requestAnimationFrame(() => {
        wrap.style.maxHeight = inner.scrollHeight + 'px';
      });
      return;
    }
  
    // opprett ny
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
  
    const wrap  = expandTr.querySelector('.expand-wrap');
    const inner = expandTr.querySelector('.expand-inner');
    wrap.style.maxHeight = '0px';
    requestAnimationFrame(() => {
      wrap.style.maxHeight = inner.scrollHeight + 'px';
    });
  }
  
  function replaceExpandContent(tr, contentHTML) {
    const next = tr.nextElementSibling;
    if (!(next && next.classList.contains('expand-row'))) return openExpandRowAfter(tr, contentHTML);
    const inner = next.querySelector('.expand-inner');
    const wrap  = next.querySelector('.expand-wrap');
    inner.innerHTML = contentHTML;
    requestAnimationFrame(() => {
      wrap.style.maxHeight = inner.scrollHeight + 'px';
    });
  }
  
  function closeExpandRow(tr) {
    const next = tr.nextElementSibling;
    if (!(next && next.classList.contains('expand-row'))) return;
    const wrap = next.querySelector('.expand-wrap');
    wrap.style.maxHeight = '0px';
    setTimeout(() => next.remove(), 260);
  }
  

  // Kalles når bruker klikker "Deaktiver" (stopp) på en flow
function onToggleFlowStop(flowId, isStopped, step) {

    let data = JSON.stringify({stopp: isStopped});

        PATCHairtable(
        "appISWcEA5QICIlzP",
        "tblldBMExI1U4yMNI",
        flowId,
        data
        );

        // Finne raden i gTimerunnerObjects og oppdatere stopp-statusen og deretter opptadere overview
        let timrunnerObject = gTimerunnerObjects.find(obj => String(obj.airtable) === String(flowId));
        if (timrunnerObject) {
            timrunnerObject.stopp = isStopped;
            timeRunner.update(gTimerunnerObjects);
        }

}

  
// Lytt globalt etter endringer på checkbokser i utvidelsen
document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.matches('.flow-stop-toggle')) return;
    const flowId = el.getAttribute('data-id') || null;
    const step   = el.getAttribute('data-step') || null;
    const isStopped = !!el.checked;
    onToggleFlowStop(flowId, isStopped, step);

    //finne nærmeste element med class="tag info"
    const tagEl = el.closest('.flows-grid').querySelector('.tag');
    if (tagEl) {
      if (isStopped) {
        tagEl.className = 'tag warn';
        tagEl.innerText = 'Stoppet';
      } else {
        tagEl.className = 'tag';
        tagEl.innerText = 'queued';
      }
    }


});

  