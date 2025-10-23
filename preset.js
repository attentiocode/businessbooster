(function () {
    const ROOT_ID = "industrySelector";
    const STORAGE_KEY = "industryPresets";
  
    const qs = (id) => document.getElementById(id);
    const readPresets = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const writePresets = (obj) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      // 🔔 Send ut signal når presets endres
      window.dispatchEvent(new Event("presetsUpdated"));
    };

    // Fyll bransje-select med "CODE – NAME" som label og CODE som value
    function loadIndustriesInselector(list) {
      // Forventet listeformat: [{ code: "01", name: "Jordbruk …" }, ...]
      const selectEl = document.getElementById("industries");
      const selectedList = document.getElementById("selectedList");
      const selectedCount = document.getElementById("selectedCount");

      if (!selectEl) return;

      // Bevar tidligere utvalg (sammenligner på value = code)
      const prevSelected = new Set(Array.from(selectEl.selectedOptions).map(o => o.value));

      // Tøm og bygg på nytt
      selectEl.innerHTML = "";

      // Sorter etter kode (naturlig/tekstlig sort funker fint her)
      const items = Array.isArray(list) ? [...list] : [];
      items.sort((a, b) => String(a.code).localeCompare(String(b.code), "nb"));

      // Lag options
      for (const it of items) {
        const opt = document.createElement("option");
        opt.value = String(it.code);                          // bare kode i value
        opt.textContent = `${it.code} – ${it.name}`;          // "kode – navn" i label
        opt.selected = prevSelected.has(opt.value);           // gjenvelg tidligere
        selectEl.appendChild(opt);
      }

      // Fyr "change" for å oppdatere chips og teller
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // ⬇️ NYTT: gjør tilgjengelig for kode utenfor IIFE
    window.loadIndustriesInselector = loadIndustriesInselector;

  
    function getSelectedValues(selectEl) {
      return Array.from(selectEl.selectedOptions).map(o => o.value);
    }
  
    function applyValues(selectEl, values) {
      const set = new Set(values);
      Array.from(selectEl.options).forEach(o => (o.selected = set.has(o.value)));
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
  
    function renderSelected(selectEl, listEl, countEl) {
      const values = getSelectedValues(selectEl);
      countEl.textContent = values.length;
      listEl.innerHTML = "";
      values.forEach(v => {
        const li = document.createElement("li");
        li.className = "chip";
        li.innerHTML = `<span>${v}</span><button type="button" class="chip-remove" aria-label="Fjern ${v}">&times;</button>`;
        li.querySelector(".chip-remove").addEventListener("click", () => {
          for (const o of selectEl.options) if (o.value === v) o.selected = false;
          selectEl.dispatchEvent(new Event("change"));
        });
        listEl.appendChild(li);
      });
    }
  
    function setQuickDateRange(range) {
      const fromEl = qs("dateFrom");
      const toEl = qs("dateTo");
      const today = new Date();
      let start, end = new Date();
  
      if (range === "week") {
        const weekday = (today.getDay() + 6) % 7;
        start = new Date(today);
        start.setDate(today.getDate() - weekday);
      } else if (range === "month") {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (range === "30days") {
        start = new Date(today);
        start.setDate(today.getDate() - 30);
      } else {
        fromEl.value = "";
        toEl.value = "";
        return;
      }
  
      fromEl.value = start.toISOString().split("T")[0];
      toEl.value = end.toISOString().split("T")[0];
      updateDateFilterState();
    }
  
    function updateDateFilterState() {
      const fromEl = qs("dateFrom");
      const toEl = qs("dateTo");
      const filterBox = qs("dateFilter");
  
      const active = !!(fromEl.value || toEl.value);
      filterBox.classList.toggle("active", active);
      filterBox.classList.toggle("inactive", !active);
      return active;
    }
  
    // 🆕 Hjelpefunksjon for å oppdatere ALLE preset-selects globalt
    function updateAllPresetDropdowns() {
      const presets = readPresets();
      const allDropdowns = document.querySelectorAll("#presetPicker, #select-field-preset");
  
      allDropdowns.forEach(drop => {
        const currentValue = drop.value;
        drop.length = 1; // behold første placeholder
        Object.keys(presets).sort().forEach(name => {
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          drop.appendChild(opt);
        });
        // behold valgt hvis fortsatt finnes
        if (presets[currentValue]) drop.value = currentValue;
      });
    }
  
    function init() {
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
      const quickButtons = document.querySelectorAll(".quick-range button");
  
      if (!selectEl.options.length) {
        ["Arkitekt", "Reklamebyrå", "Treningssenter", "IT-konsulent", "Helsevesen"].forEach(v => {
          const opt = document.createElement("option");
          opt.value = v;
          opt.textContent = v;
          selectEl.appendChild(opt);
        });
      }
  
      updateAllPresetDropdowns(); // initial load
  
      selectEl.addEventListener("change", () => renderSelected(selectEl, selectedList, selectedCount));
      renderSelected(selectEl, selectedList, selectedCount);
  
      [dateFrom, dateTo].forEach(el => el.addEventListener("input", updateDateFilterState));
      quickButtons.forEach(btn => btn.addEventListener("click", () => setQuickDateRange(btn.dataset.range)));
      updateDateFilterState();
  
      // Lagre preset
      saveBtn.addEventListener("click", () => {
        const name = (presetNameEl.value || "").trim();
        if (!name) return alert("Skriv navn på preset.");
        const dateActive = updateDateFilterState();
        const data = {
          industries: getSelectedValues(selectEl),
          dateFrom: dateActive ? dateFrom.value || null : null,
          dateTo: dateActive ? dateTo.value || null : null
        };
        const presets = readPresets();
        presets[name] = data;
        writePresets(presets); // trigger også event
        updateAllPresetDropdowns();
        picker.value = name;
        alert(`Preset "${name}" lagret.`);
      });
  
      // Hent preset
      applyBtn.addEventListener("click", () => {
        const name = picker.value;
        const presets = readPresets();
        if (!name || !presets[name]) return alert("Velg et preset først.");
        const { industries = [], dateFrom: df = "", dateTo: dt = "" } = presets[name];
        applyValues(selectEl, industries);
        dateFrom.value = df || "";
        dateTo.value = dt || "";
        updateDateFilterState();
      });
  
      // Slett preset
      deleteBtn.addEventListener("click", () => {
        const name = picker.value;
        if (!name) return;
        const presets = readPresets();
        delete presets[name];
        writePresets(presets); // trigger event
        updateAllPresetDropdowns();
        picker.value = "";
      });
  
      // Tøm alt
      clearBtn.addEventListener("click", () => {
        applyValues(selectEl, []);
        dateFrom.value = "";
        dateTo.value = "";
        updateDateFilterState();
      });
  
      // 🔔 Lytt på endringer fra andre steder
      window.addEventListener("presetsUpdated", updateAllPresetDropdowns);
    }
  
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", init)
      : init();
  })();
  