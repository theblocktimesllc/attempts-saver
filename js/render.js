// render.js
// Table rendering, sorting indicators, stats

import { formatDateForDisplay, parseDateFlexible } from "./utils.js";

/**
 * Update statistics display.
 */
export function updateStats(list, dom) {
  const total = list.length;
  const totalAttempts = list.reduce((s, i) => s + (Number(i.attempts) || 0), 0);
  const avg = total ? Math.round(totalAttempts / total) : 0;

  if (dom.statTotalEl) dom.statTotalEl.textContent = String(total);
  if (dom.statAttemptsEl) dom.statAttemptsEl.textContent = String(totalAttempts);
  if (dom.statAverageEl) dom.statAverageEl.textContent = String(avg);
}

/**
 * Update sort indicators on header cells.
 */
export function updateSortIndicators(sortState) {
  document.querySelectorAll(".sortable").forEach(th => {
    const base = th.getAttribute("data-col");
    const text = th.dataset.label || th.textContent.replace(" ▲", "").replace(" ▼", "");
    th.textContent = text;
    if (base === sortState.column) th.textContent += sortState.direction === 1 ? " ▲" : " ▼";
  });
}

/**
 * Clear tbody safely.
 */
export function clearTableBodySafely(tableBody) {
  if (!tableBody) return;
  while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
}

/**
 * Render table rows from list.
 */
export function renderTable({ list, tableBody, sortState }) {
  if (!tableBody) return;
  clearTableBodySafely(tableBody);

  const frag = document.createDocumentFragment();

  list.forEach(item => {
    const tr = document.createElement("tr");
    tr.dataset.uid = item._uid || "";

    const tdName = document.createElement("td");
    tdName.textContent = item.name || "";
    tr.appendChild(tdName);

    const tdId = document.createElement("td");
    tdId.textContent = item.id || "";
    tr.appendChild(tdId);

    const tdType = document.createElement("td");
    tdType.textContent = item.type || "";
    tr.appendChild(tdType);

    const tdDate = document.createElement("td");
    tdDate.textContent = item.date || "";
    tr.appendChild(tdDate);

    const tdAttempts = document.createElement("td");
    tdAttempts.textContent = String(item.attempts || 0);
    tr.appendChild(tdAttempts);

    const tdNotes = document.createElement("td");
    tdNotes.textContent = item.notes || "";
    tr.appendChild(tdNotes);

    const tdActions = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "edit";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.dataset.uid = item._uid || "";

    const delBtn = document.createElement("button");
    delBtn.className = "borrar";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.dataset.uid = item._uid || "";

    tdActions.appendChild(editBtn);
    tdActions.appendChild(document.createTextNode(" "));
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    frag.appendChild(tr);
  });

  tableBody.appendChild(frag);

  updateSortIndicators(sortState);
  updateStats(list, {
    statTotalEl: document.getElementById("stat-total"),
    statAttemptsEl: document.getElementById("stat-attempts"),
    statAverageEl: document.getElementById("stat-average")
  });
}