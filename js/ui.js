// ui.js
// UI bindings and orchestration for actions (save, update, delete, export, import, filters)

import { loadAttempts, saveAttempts, sanitizeImportedAttempts, exportAttemptsToJsonString } from "./storage.js";
import { generateUid, parseDateFlexible, formatDateForDisplay } from "./utils.js";
import { notify, confirmAsync } from "./notifications.js";
import { validateAllFields, buildFieldConfig, attachClearOnInput, attachNumericInputHandlers } from "./validation.js";
import { renderTable } from "./render.js";

/**
 * Initialize UI with DOM references.
 */
export function initUI(dom) {
  let attemptsList = loadAttempts();
  let editingUid = null;
  let sortState = { column: null, direction: 1 };

  const fieldConfig = buildFieldConfig({
    levelNameEl: dom.levelNameEl,
    levelIdEl: dom.levelIdEl,
    dateEl: dom.dateEl,
    attemptsEl: dom.attemptsEl
  });

  attachClearOnInput(fieldConfig);
  attachNumericInputHandlers([dom.levelIdEl, dom.attemptsEl]);

  function findIndexByUid(uid) {
    return attemptsList.findIndex(a => a._uid === uid);
  }

  function resetFormUI() {
    editingUid = null;
    if (dom.levelNameEl) dom.levelNameEl.value = "";
    if (dom.levelIdEl) dom.levelIdEl.value = "";
    if (dom.dateEl) dom.dateEl.value = "";
    if (dom.attemptsEl) dom.attemptsEl.value = "";
    if (dom.notesEl) dom.notesEl.value = "";

    if (dom.saveBtn) dom.saveBtn.hidden = false;
    if (dom.updateBtn) dom.updateBtn.hidden = true;
    if (dom.cancelEditBtn) dom.cancelEditBtn.hidden = true;

    try { if (dom.levelNameEl) dom.levelNameEl.focus(); } catch (e) {}
  }

  function enterEditModeByIndex(index) {
    const item = attemptsList[index];
    if (!item) return;
    editingUid = item._uid;

    dom.levelNameEl.value = item.name || "";
    dom.levelIdEl.value = item.id || "";
    dom.idTypeEl.value = item.type || "online";
    dom.dateEl.value = item.date || "";
    dom.attemptsEl.value = String(item.attempts || "");
    dom.notesEl.value = item.notes || "";

    if (dom.saveBtn) dom.saveBtn.hidden = true;
    if (dom.updateBtn) dom.updateBtn.hidden = false;
    if (dom.cancelEditBtn) dom.cancelEditBtn.hidden = false;

    try { dom.levelNameEl.focus(); } catch (e) {}
  }

  if (dom.saveBtn) {
    dom.saveBtn.addEventListener("click", () => {
      const ok = validateAllFields(fieldConfig);
      if (!ok) return;

      const parsedDate = parseDateFlexible(dom.dateEl.value.trim());
      const attemptsVal = parseInt(dom.attemptsEl.value.trim(), 10);
      if (!Number.isFinite(attemptsVal)) {
        notify("Attempts must be a valid number.");
        return;
      }

      const attemptObj = {
        _uid: generateUid(),
        name: dom.levelNameEl.value.trim(),
        id: dom.levelIdEl.value.trim(),
        type: dom.idTypeEl.value || "online",
        date: parsedDate ? formatDateForDisplay(parsedDate) : dom.dateEl.value.trim(),
        attempts: attemptsVal,
        notes: dom.notesEl.value ? dom.notesEl.value.trim() : ""
      };

      attemptsList.push(attemptObj);
      saveAttempts(attemptsList);
      resetFormUI();
      renderCurrentTable();
      safeRestoreFocus();
      notify("Saved.");
    });
  }

  if (dom.updateBtn) {
    dom.updateBtn.addEventListener("click", () => {
      if (!editingUid) {
        notify("No item selected for editing.");
        return;
      }
      const ok = validateAllFields(fieldConfig);
      if (!ok) return;

      const parsedDate = parseDateFlexible(dom.dateEl.value.trim());
      const attemptsVal = parseInt(dom.attemptsEl.value.trim(), 10);
      if (!Number.isFinite(attemptsVal)) {
        notify("Attempts must be a valid number.");
        return;
      }

      const idx = findIndexByUid(editingUid);
      if (idx === -1) {
        notify("Item not found.");
        resetFormUI();
        renderCurrentTable();
        return;
      }

      const existing = attemptsList[idx];
      attemptsList[idx] = {
        ...existing,
        name: dom.levelNameEl.value.trim(),
        id: dom.levelIdEl.value.trim(),
        type: dom.idTypeEl.value || "online",
        date: parsedDate ? formatDateForDisplay(parsedDate) : dom.dateEl.value.trim(),
        attempts: attemptsVal,
        notes: dom.notesEl.value ? dom.notesEl.value.trim() : ""
      };

      saveAttempts(attemptsList);
      resetFormUI();
      renderCurrentTable();
      safeRestoreFocus();
      notify("Updated.");
    });
  }

  if (dom.cancelEditBtn) {
    dom.cancelEditBtn.addEventListener("click", () => {
      resetFormUI();
      safeRestoreFocus();
    });
  }

  function applyFilters(list) {
    let out = Array.isArray(list) ? [...list] : [];

    if (dom.filterTypeEl && dom.filterTypeEl.value && dom.filterTypeEl.value !== "all") {
      out = out.filter(i => i.type === dom.filterTypeEl.value);
    }

    const minA = dom.filterMinAttemptsEl && dom.filterMinAttemptsEl.value ? Number(dom.filterMinAttemptsEl.value) : null;
    const maxA = dom.filterMaxAttemptsEl && dom.filterMaxAttemptsEl.value ? Number(dom.filterMaxAttemptsEl.value) : null;
    if (minA !== null) out = out.filter(i => Number(i.attempts) >= minA);
    if (maxA !== null) out = out.filter(i => Number(i.attempts) <= maxA);

    if (dom.filterDateFromEl && dom.filterDateFromEl.value) {
      const from = parseDateFlexible(dom.filterDateFromEl.value);
      if (from) out = out.filter(i => {
        const d = parseDateFlexible(i.date);
        return d && d >= from;
      });
    }
    if (dom.filterDateToEl && dom.filterDateToEl.value) {
      const to = parseDateFlexible(dom.filterDateToEl.value);
      if (to) out = out.filter(i => {
        const d = parseDateFlexible(i.date);
        return d && d <= to;
      });
    }

    return out;
  }

  if (dom.clearFiltersBtn) {
    dom.clearFiltersBtn.addEventListener("click", () => {
      if (dom.filterTypeEl) dom.filterTypeEl.value = "all";
      if (dom.filterMinAttemptsEl) dom.filterMinAttemptsEl.value = "";
      if (dom.filterMaxAttemptsEl) dom.filterMaxAttemptsEl.value = "";
      if (dom.filterDateFromEl) dom.filterDateFromEl.value = "";
      if (dom.filterDateToEl) dom.filterDateToEl.value = "";
      renderCurrentTable();
      safeRestoreFocus();
    });
  }

  document.querySelectorAll(".sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-col");
      if (!col) return;
      if (sortState.column === col) sortState.direction *= -1;
      else { sortState.column = col; sortState.direction = 1; }
      renderCurrentTable();
      safeRestoreFocus();
    });
  });

  function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 150);
  }

  if (dom.exportJsonBtn) {
    dom.exportJsonBtn.addEventListener("click", () => {
      downloadBlob(exportAttemptsToJsonString(attemptsList), "application/json", "attempts.json");
    });
  }

  if (dom.exportCsvBtn) {
    dom.exportCsvBtn.addEventListener("click", () => {
      const q = s => `"${String(s || "").replace(/"/g, '""')}"`;
      const header = ["Name","ID","Type","Date","Attempts","Notes"].map(q).join(",");
      const rows = attemptsList.map(i => [
        q(i.name),
        q(i.id),
        q(i.type),
        q(i.date),
        q(i.attempts),
        q(i.notes)
      ].join(","));
      const csv = [header, ...rows].join("\n");
      downloadBlob(csv, "text/csv", "attempts.csv");
    });
  }

  if (dom.exportTxtBtn) {
    dom.exportTxtBtn.addEventListener("click", () => {
      const txt = attemptsList.map(i => `${i.name} | ${i.id} | ${i.type} | ${i.date} | ${i.attempts} | ${i.notes}`).join("\n");
      downloadBlob(txt, "text/plain", "attempts.txt");
    });
  }

  if (dom.importBtn && dom.importFileInput) {
    dom.importBtn.addEventListener("click", () => dom.importFileInput.click());

    dom.importFileInput.addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!Array.isArray(parsed)) {
            notify("Imported file must be an array of attempts.");
            return;
          }
          const sanitized = sanitizeImportedAttempts(parsed);
          attemptsList = sanitized;
          saveAttempts(attemptsList);
          renderCurrentTable();
          notify("Import successful.");
        } catch (err) {
          console.error("Import error:", err);
          notify("Failed to import file. Make sure it's valid JSON.");
        } finally {
          dom.importFileInput.value = "";
          safeRestoreFocus();
        }
      };
      reader.readAsText(file);
    });
  }

  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("light");
      const theme = document.body.classList.contains("light") ? "light" : "dark";
      try { localStorage.setItem("attempts_theme", theme); } catch (e) {}
    });
    try {
      const saved = localStorage.getItem("attempts_theme");
      if (saved === "light") document.body.classList.add("light");
    } catch (e) {}
  }

  if (dom.tableBody) {
    dom.tableBody.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const uid = btn.dataset.uid;
      if (!uid) return;
      const idx = findIndexByUid(uid);
      if (idx === -1) return;

      if (btn.classList.contains("edit")) {
        enterEditModeByIndex(idx);
      } else if (btn.classList.contains("borrar")) {
        const confirmed = await confirmAsync(`Delete "${attemptsList[idx].name}"?`);
        if (!confirmed) { safeRestoreFocus(); return; }
        attemptsList.splice(idx, 1);
        saveAttempts(attemptsList);
        renderCurrentTable();
        safeRestoreFocus();
        notify("Deleted.");
      }
    });
  }

  function safeRestoreFocus() {
    if (!dom.levelNameEl) return;
    setTimeout(() => {
      try {
        if (document.activeElement && document.activeElement !== document.body) {
          try { document.activeElement.blur(); } catch (e) {}
        }
        try { dom.levelNameEl.focus(); } catch (e) {}
      } catch (err) {
        console.error("safeRestoreFocus error:", err);
      }
    }, 0);
  }

  function renderCurrentTable() {
    let list = Array.isArray(attemptsList) ? [...attemptsList] : [];

    const q = dom.searchInputEl && dom.searchInputEl.value ? dom.searchInputEl.value.trim().toLowerCase() : "";
    if (q) list = list.filter(i => String(i.name || "").toLowerCase().includes(q));

    list = applyFilters(list);

    if (sortState.column) {
      list.sort((a, b) => {
        let x = a[sortState.column];
        let y = b[sortState.column];

        if (sortState.column === "date") {
          const dx = parseDateFlexible(String(x || ""));
          const dy = parseDateFlexible(String(y || ""));
          x = dx ? dx.getTime() : 0;
          y = dy ? dy.getTime() : 0;
        }

        if (sortState.column === "id" || sortState.column === "attempts") {
          x = Number(x || 0);
          y = Number(y || 0);
        }

        if (x < y) return -1 * sortState.direction;
        if (x > y) return 1 * sortState.direction;
        return 0;
      });
    }

    renderTable({
      list,
      tableBody: dom.tableBody,
      sortState
    });
  }

  if (dom.searchInputEl) {
    let t = null;
    dom.searchInputEl.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => renderCurrentTable(), 180);
    });
  }

  (function init() {
    if (dom.updateBtn) dom.updateBtn.hidden = true;
    if (dom.cancelEditBtn) dom.cancelEditBtn.hidden = true;
    if (dom.saveBtn) dom.saveBtn.hidden = false;

    if (dom.attemptsEl) dom.attemptsEl.setAttribute("inputmode", "numeric");
    if (dom.levelIdEl) dom.levelIdEl.setAttribute("inputmode", "numeric");

    renderCurrentTable();
    safeRestoreFocus();
  })();

  return {
    getAttempts: () => attemptsList,
    render: renderCurrentTable,
    resetForm: resetFormUI
  };
}