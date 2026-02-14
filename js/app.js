// app.js
// Entry point: wire DOM elements and initialize UI module

import { initUI } from "./ui.js";

const dom = {
  levelNameEl: document.getElementById("level-name"),
  levelIdEl: document.getElementById("level-id"),
  idTypeEl: document.getElementById("id-type"),
  dateEl: document.getElementById("date"),
  attemptsEl: document.getElementById("attempts"),
  notesEl: document.getElementById("notes"),

  saveBtn: document.getElementById("save"),
  updateBtn: document.getElementById("update"),
  cancelEditBtn: document.getElementById("cancel-edit"),

  tableBody: document.querySelector("#table tbody"),
  searchInputEl: document.getElementById("search"),

  exportJsonBtn: document.getElementById("export-json"),
  exportCsvBtn: document.getElementById("export-csv"),
  exportTxtBtn: document.getElementById("export-txt"),
  importBtn: document.getElementById("import-btn"),
  importFileInput: document.getElementById("import-file"),

  filterTypeEl: document.getElementById("filter-type"),
  filterMinAttemptsEl: document.getElementById("filter-min-attempts"),
  filterMaxAttemptsEl: document.getElementById("filter-max-attempts"),
  filterDateFromEl: document.getElementById("filter-date-from"),
  filterDateToEl: document.getElementById("filter-date-to"),
  clearFiltersBtn: document.getElementById("clear-filters"),

  statTotalEl: document.getElementById("stat-total"),
  statAttemptsEl: document.getElementById("stat-attempts"),
  statAverageEl: document.getElementById("stat-average"),

  themeToggleBtn: document.getElementById("toggle-theme")
};

document.addEventListener("DOMContentLoaded", () => {
  const api = initUI(dom);
  window.appApi = api;
});