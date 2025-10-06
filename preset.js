// Industry Multi-Select + Date Filter + Presets + Chips (vanilla JS)
(function () {
    const ROOT_ID = "industrySelector";
    const STORAGE_KEY = "industryPresets";
  
    // Hjelpere
    const qs = (id) => document.getElementById(id);
    const readPresets = () => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
      catch { return {}; }
    };
    const writePresets = (obj) => localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  
    const getSelectedValues = (selectEl) =>
      Array.from(selectEl.selectedOptions).map(o => o.value);
  
    const applyValues = (selectEl, values) => {
      const set = new Set(values);
      Array.from(selectEl.options).forEach(o => { o.selected = set.has(o.value); });
      selectEl.dispatchEvent(new Event("change", { bubbles: true })); // re-render chips
    };
  
    const renderSelected = (selectEl, listEl, countEl) => {
      const values = getSelectedValues(selectEl);
      countEl.textContent = values.length;
      listEl.innerHTML = "";
      values.forEach(v => {
        const li = document.createElement("li");
        li.className = "chip";
        li.dataset.value = v;
        li.innerHTML = `<span>${v}</span><button type="button" class="chip-remove" aria-label="Fjern ${v}">&times;</button>`;
        li.querySelector(".chip-remove").addEventListener("click", () => {
          for (const o of selectEl.options) if (o.value === v) o.selected = false;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        });
        listEl.appendChild(li);
      });
    };
  
    const setQuickDateRange = (range) => {
      const fromEl = qs("dateFrom");
      const toEl = qs("dateTo");
      const today = new Date();
      let start, end = new Date();
  
      switch (range) {
        case "week": {
          // Mandag som ukestart
          const d = new Date(today);
          const weekday = (d.getDay() + 6) % 7; // 0=mandag
          start = new Date(d); start.setDate(d.getDate() - weekday);
          break;
        }
        case "month": {
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        }
        case "30days": {
          start = new Date(today); start.setDate(today.getDate() - 30);
          break;
        }
        default: { fromEl.value = ""; toEl.value = ""; return; }
      }
      fromEl.value = start.toISOString().split("T")[0];
      toEl.value = end.toISOString().split("T")[0];
    };
  
    const init = () => {
      const root = qs(ROOT_ID);
      if (!root) return;
  
      // Elementer
      const selectEl = qs("industries");
      const selectedList = qs("selectedList");
      const selectedCount = qs("selectedCount");
      const dateFrom = qs("dateFrom");
      const dateTo = qs("dateTo");
      const presetNameEl = qs("presetName");
      const saveBtn = qs("savePreset");
      const picker = qs("presetPicker");
      const applyBtn = qs("applyPreset");
      const deleteBtn = qs("deletePreset");
      const clearBtn = qs("clearSelection");
      const quickButtons = root.querySelectorAll(".quick-range button");
  
      // Fallback-eksempler om listen er tom (kan fjernes i produksjon)
      if (!selectEl.options.length) {
        ["Arkitektvirksomhet","Reklamebyråvirksomhet","Treningssentre","IT-konsulent","Helsevesen"]
          .forEach(v => {
            const opt = document.createElement("option");
            opt.value = v; opt.textContent = v;
            selectEl.appendChild(opt);
          });
      }
  
      // Presets
      let presets = readPresets();
      const refreshPicker = () => {
        picker.length = 1; // behold placeholder
        Object.keys(presets).sort().forEach(name => {
          const opt = document.createElement("option");
          opt.value = name; opt.textContent = name;
          picker.appendChild(opt);
        });
      };
      refreshPicker();
  
      // Chips render
      selectEl.addEventListener("change", () => renderSelected(selectEl, selectedList, selectedCount));
      renderSelected(selectEl, selectedList, selectedCount);
  
      // Hurtigvalg dato
      quickButtons.forEach(btn =>
        btn.addEventListener("click", () => setQuickDateRange(btn.dataset.range))
      );
  
      // Lagre preset (bransjer + dato)
      saveBtn.addEventListener("click", () => {
        const name = (presetNameEl.value || "").trim();
        if (!name) return alert("Skriv navn på preset.");
        const data = {
          industries: getSelectedValues(selectEl),
          dateFrom: dateFrom.value || null,
          dateTo: dateTo.value || null
        };
        presets[name] = data;
        writePresets(presets);
        refreshPicker();
        picker.value = name;
        alert(`Preset "${name}" lagret.`);
      });
  
      // Hent preset
      applyBtn.addEventListener("click", () => {
        const name = picker.value;
        if (!name || !presets[name]) return alert("Velg et preset først.");
        const { industries = [], dateFrom: df = "", dateTo: dt = "" } = presets[name];
        applyValues(selectEl, industries);
        dateFrom.value = df || "";
        dateTo.value = dt || "";
      });
  
      // Slett preset
      deleteBtn.addEventListener("click", () => {
        const name = picker.value;
        if (!name) return;
        delete presets[name];
        writePresets(presets);
        refreshPicker();
        picker.value = "";
      });
  
      // Tøm alt
      clearBtn.addEventListener("click", () => {
        applyValues(selectEl, []);
        dateFrom.value = "";
        dateTo.value = "";
      });
    };
  
    // Start
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
  