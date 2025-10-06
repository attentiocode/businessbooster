// Industry Multi-Select + Preset Manager (vanilla JS)
// med "chips"-liste over valgte bransjer
(function () {
    const ROOT_ID = "industrySelector";
    const STORAGE_KEY = "industryPresets";
  
    function qs(id) { return document.getElementById(id); }
  
    function getRootedIds(root) {
      return {
        selectEl: root.querySelector("#industries"),
        // NYTT: elementer for visning av valgte
        selectedListEl: root.querySelector("#selectedList"),
        selectedCountEl: root.querySelector("#selectedCount"),
  
        presetNameEl: root.querySelector("#presetName"),
        saveBtn: root.querySelector("#savePreset"),
        presetPicker: root.querySelector("#presetPicker"),
        applyBtn: root.querySelector("#applyPreset"),
        deleteBtn: root.querySelector("#deletePreset"),
        clearBtn: root.querySelector("#clearSelection"),
        statusEl: root.querySelector("#industryStatus"),
      };
    }
  
    function readPresets() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
      catch { return {}; }
    }
    function writePresets(presets) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    }
  
    function setStatus(el, msg) {
      if (!el) return;
      el.textContent = msg;
      window.clearTimeout(el._statusTimer);
      el._statusTimer = window.setTimeout(() => { el.textContent = ""; }, 2200);
    }
  
    function getSelectedValues(selectEl) {
      return Array.from(selectEl.selectedOptions).map(o => o.value);
    }
  
    function applyValues(selectEl, values) {
      const set = new Set(values);
      Array.from(selectEl.options).forEach(o => { o.selected = set.has(o.value); });
      selectEl.dispatchEvent(new Event("change", { bubbles: true })); // trigger render
    }
  
    function populatePresetPicker(picker, presets) {
      picker.length = 1; // behold «— Velg preset —»
      Object.keys(presets).sort().forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        picker.appendChild(opt);
      });
    }
  
    // === NYTT: render liste/chips av valgte bransjer ===
    function renderSelected(selectEl, listEl, countEl) {
      if (!listEl || !countEl) return;
      const values = getSelectedValues(selectEl);
      countEl.textContent = values.length;
      listEl.innerHTML = "";
  
      values.forEach(v => {
        const li = document.createElement("li");
        li.className = "chip";
        li.setAttribute("data-value", v);
  
        const label = document.createElement("span");
        label.textContent = v;
  
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-remove";
        btn.setAttribute("aria-label", `Fjern ${v}`);
        btn.innerHTML = "&times;";
  
        btn.addEventListener("click", () => {
          // Avmerk i <select> og re-render
          for (const o of selectEl.options) {
            if (o.value === v) { o.selected = false; break; }
          }
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        });
  
        li.appendChild(label);
        li.appendChild(btn);
        listEl.appendChild(li);
      });
    }
  
    function init(root) {
      const {
        selectEl, selectedListEl, selectedCountEl,
        presetNameEl, saveBtn,
        presetPicker, applyBtn, deleteBtn, clearBtn, statusEl
      } = getRootedIds(root);
  
      if (!selectEl) return;
  
      // Fyll inn noen eksempel-opsjoner hvis tom (valgfritt)
      if (!selectEl.options.length) {
        [
          "Alle bransjer","Arkitektvirksomhet","Byggeteknisk konsulentvirksomhet",
          "Detaljhandel med bøker","Fysioterapi- og ergoterapitjenester",
          "Reklamebyråvirksomhet","Rengjøring av bygninger","Treningssentre"
        ].forEach(v => {
          const opt = document.createElement("option");
          opt.value = v; opt.textContent = v;
          selectEl.appendChild(opt);
        });
      }
  
      // Last inn presets
      let presets = readPresets();
      populatePresetPicker(presetPicker, presets);
  
      // Hold chip-listen i sync ved endringer i selecten
      selectEl.addEventListener("change", () => {
        renderSelected(selectEl, selectedListEl, selectedCountEl);
      });
      // Første render
      renderSelected(selectEl, selectedListEl, selectedCountEl);
  
      // Lagre preset
      saveBtn?.addEventListener("click", () => {
        const name = (presetNameEl?.value || "").trim();
        if (!name) return setStatus(statusEl, "Skriv inn et navn på presetet.");
        const values = getSelectedValues(selectEl);
        if (!values.length) return setStatus(statusEl, "Velg minst én bransje før du lagrer.");
        presets[name] = values;
        writePresets(presets);
        populatePresetPicker(presetPicker, presets);
        presetPicker.value = name;
        setStatus(statusEl, `Preset «${name}» lagret.`);
      });
  
      // Hent preset
      applyBtn?.addEventListener("click", () => {
        const name = presetPicker?.value;
        if (!name || !presets[name]) return setStatus(statusEl, "Velg et preset å hente.");
        applyValues(selectEl, presets[name]); // vil trigge renderSelected via change
        setStatus(statusEl, `Preset «${name}» hentet.`);
      });
  
      // Slett preset
      deleteBtn?.addEventListener("click", () => {
        const name = presetPicker?.value;
        if (!name || !presets[name]) return setStatus(statusEl, "Velg et preset å slette.");
        delete presets[name];
        writePresets(presets);
        populatePresetPicker(presetPicker, presets);
        presetPicker.value = "";
        setStatus(statusEl, `Preset «${name}» slettet.`);
      });
  
      // Tøm valg
      clearBtn?.addEventListener("click", () => {
        applyValues(selectEl, []); // triggere renderSelected
        setStatus(statusEl, "Valg tømt.");
      });
    }
  
    // Init når DOM er klar (fungerer fint i Webflow)
    const start = () => {
      const root = qs(ROOT_ID);
      if (root) init(root);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  })();
  