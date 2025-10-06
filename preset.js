// Industry Multi-Select + Preset Manager (vanilla JS)
// ---------------------------------------------------
// Hvordan det fungerer:
// - Lagrer presets i localStorage under nøkkel 'industryPresets'.
// - Henter opp presets ved load og fyller "Velg preset"-menyen.
// - Støtter Lagre, Hent, Slett, og Tøm valg.
// ---------------------------------------------------

(function () {
    const ROOT_ID = "industrySelector";
    const STORAGE_KEY = "industryPresets";
  
    function qs(id) { return document.getElementById(id); }
  
    function getRootedIds(root) {
      return {
        selectEl: root.querySelector("#industries"),
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
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      } catch {
        return {};
      }
    }
  
    function writePresets(presets) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    }
  
    function setStatus(el, msg) {
      if (!el) return;
      el.textContent = msg;
      // Tøm status etter noen sekunder
      window.clearTimeout(el._statusTimer);
      el._statusTimer = window.setTimeout(() => { el.textContent = ""; }, 2200);
    }
  
    function getSelectedValues(selectEl) {
      return Array.from(selectEl.selectedOptions).map(o => o.value);
    }
  
    function applyValues(selectEl, values) {
      const set = new Set(values);
      Array.from(selectEl.options).forEach(o => { o.selected = set.has(o.value); });
      // Fyr av change-event om nødvendig:
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
  
    function populatePresetPicker(picker, presets) {
      // Bevar første "— Velg preset —"
      picker.length = 1;
      Object.keys(presets).sort().forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        picker.appendChild(opt);
      });
    }
  
    function init(root) {
      const {
        selectEl, presetNameEl, saveBtn,
        presetPicker, applyBtn, deleteBtn, clearBtn, statusEl
      } = getRootedIds(root);
  
      if (!selectEl) return;
  
      // Last inn presets
      let presets = readPresets();
      populatePresetPicker(presetPicker, presets);
  
      // Lagre preset
      saveBtn?.addEventListener("click", () => {
        const name = (presetNameEl?.value || "").trim();
        if (!name) {
          setStatus(statusEl, "Skriv inn et navn på presetet.");
          return;
        }
        const values = getSelectedValues(selectEl);
        if (!values.length) {
          setStatus(statusEl, "Velg minst én bransje før du lagrer.");
          return;
        }
        presets[name] = values;
        writePresets(presets);
        populatePresetPicker(presetPicker, presets);
        presetPicker.value = name;
        setStatus(statusEl, `Preset «${name}» lagret.`);
      });
  
      // Hent preset
      applyBtn?.addEventListener("click", () => {
        const name = presetPicker?.value;
        if (!name || !presets[name]) {
          setStatus(statusEl, "Velg et preset å hente.");
          return;
        }
        applyValues(selectEl, presets[name]);
        setStatus(statusEl, `Preset «${name}» hentet.`);
      });
  
      // Slett preset
      deleteBtn?.addEventListener("click", () => {
        const name = presetPicker?.value;
        if (!name || !presets[name]) {
          setStatus(statusEl, "Velg et preset å slette.");
          return;
        }
        delete presets[name];
        writePresets(presets);
        populatePresetPicker(presetPicker, presets);
        presetPicker.value = "";
        setStatus(statusEl, `Preset «${name}» slettet.`);
      });
  
      // Tøm valg
      clearBtn?.addEventListener("click", () => {
        applyValues(selectEl, []);
        setStatus(statusEl, "Valg tømt.");
      });
    }
  
    // Init når DOM er klar (fungerer fint i Webflow)
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        const root = qs(ROOT_ID);
        if (root) init(root);
      });
    } else {
      const root = qs(ROOT_ID);
      if (root) init(root);
    }
  })();
  