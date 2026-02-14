// ui.js
// UI bindings and orchestration for actions (save, update, delete, export, import, filters)

import { loadAttempts, saveAttempts, sanitizeImportedAttempts, exportAttemptsToJsonString, mergeAndSaveAttempts } from "./storage.js";
import { generateUid, parseDateFlexible, formatDateForDisplay, toNumberSafe, normalizeStringForSearch } from "./utils.js";
import { notify, confirmAsync } from "./notifications.js";
import { validateAllFields, buildFieldConfig, attachClearOnInput, attachNumericInputHandlers } from "./validation.js";
import { renderTable, updateSortIndicators, updateStats } from "./render.js";

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
    if (dom.idTypeEl) dom.idTypeEl.value = item.type || "online";
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

      const parsedDate = parseDateFlexible(String(dom.dateEl.value || "").trim());
      const attemptsVal = parseInt(String(dom.attemptsEl.value || "").trim(), 10);
      if (!Number.isFinite(attemptsVal)) {
        notify("Attempts must be a valid number.");
        return;
      }

      const attemptObj = {
        _uid: generateUid(),
        name: String(dom.levelNameEl.value || "").trim(),
        id: String(dom.levelIdEl.value || "").trim(),
        type: dom.idTypeEl && dom.idTypeEl.value ? dom.idTypeEl.value : "online",
        date: parsedDate ? formatDateForDisplay(parsedDate) : String(dom.dateEl.value || "").trim(),
        attempts: attemptsVal,
        notes: dom.notesEl && dom.notesEl.value ? String(dom.notesEl.value).trim() : ""
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

      const parsedDate = parseDateFlexible(String(dom.dateEl.value || "").trim());
      const attemptsVal = parseInt(String(dom.attemptsEl.value || "").trim(), 10);
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
        name: String(dom.levelNameEl.value || "").trim(),
        id: String(dom.levelIdEl.value || "").trim(),
        type: dom.idTypeEl && dom.idTypeEl.value ? dom.idTypeEl.value : "online",
        date: parsedDate ? formatDateForDisplay(parsedDate) : String(dom.dateEl.value || "").trim(),
        attempts: attemptsVal,
        notes: dom.notesEl && dom.notesEl.value ? String(dom.notesEl.value).trim() : ""
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

  // Filters: uses Apply Filters button to trigger rendering.
  function applyFilters(list) {
    let out = Array.isArray(list) ? [...list] : [];

    // Type filter (normalize)
    const typeVal = dom.filterTypeEl && dom.filterTypeEl.value ? String(dom.filterTypeEl.value).toLowerCase() : "all";
    if (typeVal && typeVal !== "all") {
      out = out.filter(i => String(i.type || "").toLowerCase() === typeVal);
    }

    // Attempts min / max (safe numbers)
    const minA = dom.filterMinAttemptsEl ? toNumberSafe(dom.filterMinAttemptsEl.value) : null;
    const maxA = dom.filterMaxAttemptsEl ? toNumberSafe(dom.filterMaxAttemptsEl.value) : null;
    if (minA !== null) {
      out = out.filter(i => {
        const ai = toNumberSafe(i.attempts);
        return ai !== null && ai >= minA;
      });
    }
    if (maxA !== null) {
      out = out.filter(i => {
        const ai = toNumberSafe(i.attempts);
        return ai !== null && ai <= maxA;
      });
    }

    // Date range (inclusive for 'to')
    if (dom.filterDateFromEl && dom.filterDateFromEl.value) {
      const from = parseDateFlexible(String(dom.filterDateFromEl.value).trim());
      if (from) {
        out = out.filter(i => {
          const d = parseDateFlexible(String(i.date || "").trim());
          return d && d.getTime() >= from.getTime();
        });
      }
    }
    if (dom.filterDateToEl && dom.filterDateToEl.value) {
      const to = parseDateFlexible(String(dom.filterDateToEl.value).trim());
      if (to) {
        const toEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
        out = out.filter(i => {
          const d = parseDateFlexible(String(i.date || "").trim());
          return d && d.getTime() <= toEnd.getTime();
        });
      }
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
      // Clear search as well to show full list
      if (dom.searchInputEl) dom.searchInputEl.value = "";
      // After clearing, render full list
      renderCurrentTable();
      safeRestoreFocus();
    });
  }

  // Apply Filters button: user must click to apply filters and search
  if (dom.applyFiltersBtn) {
    dom.applyFiltersBtn.addEventListener("click", () => {
      renderCurrentTable();
      safeRestoreFocus();
    });
  }

  // Sorting headers
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

  // Import: merge + dedupe (import overrides existing on id/_uid conflict)
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
          // Use merge helper to avoid accidental replacement
          const merged = mergeAndSaveAttempts(parsed, { preferExisting: false });
          attemptsList = merged;
          renderCurrentTable();
          notify(`Import successful. ${Array.isArray(parsed) ? parsed.length : 0} items processed.`);
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

    // Search: only exact match against the level name (normalized)
    const qRaw = dom.searchInputEl && dom.searchInputEl.value ? dom.searchInputEl.value : "";
    const q = normalizeStringForSearch(qRaw);
    if (q) {
      list = list.filter(i => {
        const nameNorm = normalizeStringForSearch(i.name || "");
        return nameNorm === q;
      });
    }

    // Apply filters (only when user clicked Apply Filters)
    list = applyFilters(list);

    // Sorting
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

  // Keep search input free; rendering happens when user clicks Apply Filters.
  // If you want Enter to trigger apply, you can add a key handler here.
  if (dom.searchInputEl) {
    dom.searchInputEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        renderCurrentTable();
      }
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
    resetForm: resetFormUI,
    reload: () => {
      attemptsList = loadAttempts();
      renderCurrentTable();
    }
  };
}