
function generateAndDownloadXls(filename, data) {
    const mapped = mapBrregData(data);
    exportXLS(mapped, filename);
  }
  
  function mapBrregData(data) {
    const arr = Array.isArray(data) ? data : [data];
  
    const pick = (obj, keys, def='') => {
      for (const k of keys) {
        const v = k.split('.').reduce((o, p) => (o && o[p] != null ? o[p] : undefined), obj);
        if (v != null && v !== '') return v;
      }
      return def;
    };
    const onlyDigits = s => String(s ?? '').replace(/\D+/g, '');
    const cap = s => String(s ?? '').trim();
    const upper = s => cap(s).toUpperCase();
  
    return arr.map(r => {
      const orgnr = onlyDigits(pick(r, ['organisasjonsnummer', 'orgnr']));
      const navn  = cap(pick(r, ['navn', 'bedriftsnavn']));
      const adrObj = pick(r, ['forretningsadresse', 'beliggenhetsadresse', 'postadresse'], {});
      const adresse = cap(Array.isArray(adrObj.adresse) ? adrObj.adresse[0] : adrObj.adresse || '');
      const postnr = cap(adrObj.postnummer || '');
      const poststed = upper(adrObj.poststed || '');
      const nk = pick(r, ['naeringskode1', 'næringskode', 'naeringskode'], {});
      const næringskode = cap(
        nk.kode ? nk.kode + (nk.beskrivelse ? ' ' + nk.beskrivelse : '') : (nk.beskrivelse || '')
      );
      const telefon = cap(pick(r, ['telefon', 'mobil']));
      const epost = cap(pick(r, ['epostadresse', 'epost']));
      const hjemmeside = cap(pick(r, ['hjemmeside', 'nettside', 'url']));
      const kontaktperson = cap(pick(r, ['kontaktperson', 'kontakt.navn']));
  
      // Nytt: legg til group og status
      const g = (gGroupbedrifter || []).find(gr => {
        const targetId = String(r.group ?? '');
        return String(gr.id) === targetId || String(gr.airtableId ?? '') === targetId;
      });
      const group = g ? cap(g.name) : '';
      const status = cap(pick(r, ['status', 'state', 'tilstand']));
  
      return {
        'Orgnr.': orgnr,
        'Bedriftsnavn': navn,
        'Adresse': adresse,
        'Postnummer': postnr,
        'Poststed': poststed,
        'Næringskode': næringskode,
        'Telefon': telefon,
        'Epost': epost,
        'Hjemmeside': hjemmeside,
        'Kontaktperson': kontaktperson,
        'Group': group,
        'Status': status
      };
    });
  }

async function exportXLS(rows, name) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(name);

    // Hent header fra det første objektet
    const headers = Object.keys(rows[0]);

    // Legg til header-raden
    worksheet.addRow(headers);

    // Legg til data-rader
    rows.forEach(row => {
        worksheet.addRow(headers.map(header => row[header] || ""));
    });

    // Style header-raden (rad 1)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true }; // Fet skrift
    headerRow.eachCell(cell => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D3D3D3' }, // Lys grå bakgrunn
        };
    });

    // Juster kolonnebredder
    worksheet.columns.forEach((column, colIndex) => {
        let maxLength = headers[colIndex].length; // Minimum bredde som lengden på header
        column.eachCell({ includeEmpty: true }, cell => {
            const cellLength = cell.value ? cell.value.toString().length : 10;
            if (cellLength > maxLength) {
                maxLength = cellLength;
            }
        });
        column.width = Math.min(maxLength + 2, 30); // Legg til litt ekstra plass, maks bredde 30 tegn
    });

    // Fryse første rad
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Lagre filen
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name + ".xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}