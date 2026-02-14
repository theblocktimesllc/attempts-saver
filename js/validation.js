// validation.js
// Field validation helpers and input handlers

import { parseDateFlexible } from "./utils.js";

export function buildFieldConfig({ levelNameEl, levelIdEl, dateEl, attemptsEl }) {
  return [
    { el: levelNameEl, key: "name", label: "Level name", required: true, numeric: false },
    { el: levelIdEl, key: "id", label: "Level ID", required: true, numeric: true },
    { el: dateEl, key: "date", label: "Date", required: true, numeric: false },
    { el: attemptsEl, key: "attempts", label: "Attempts", required: true, numeric: true }
  ];
}

export function clearFieldErrors(fieldConfig) {
  fieldConfig.forEach(({ el }) => {
    if (!el) return;
    el.classList.remove("input-error");
    const msg = el.nextElementSibling;
    if (msg && msg.classList && msg.classList.contains("error-message")) msg.textContent = "";
  });
}

export function showFieldError(el, message) {
  if (!el) return;
  el.classList.add("input-error");
  const msg = el.nextElementSibling;
  if (msg && msg.classList && msg.classList.contains("error-message")) {
    msg.textContent = message;
  } else {
    const div = document.createElement("div");
    div.className = "error-message";
    div.textContent = message;
    el.insertAdjacentElement("afterend", div);
  }
}

export function validateAllFields(fieldConfig) {
  clearFieldErrors(fieldConfig);
  const errors = [];

  fieldConfig.forEach(({ el, label, required, numeric }) => {
    if (!el) return;
    const value = String(el.value || "").trim();

    if (required && !value) {
      errors.push({ el, message: `${label} is required.` });
      return;
    }

    if (numeric && value && !/^\d+$/.test(value)) {
      errors.push({ el, message: `${label} must contain only numbers.` });
      return;
    }

    if (el && el.id === "date" && value) {
      const parsed = parseDateFlexible(value);
      if (!parsed) errors.push({ el, message: `${label} must be a valid date (mm/dd/yyyy).` });
    }
  });

  errors.forEach(({ el, message }) => showFieldError(el, message));
  if (errors.length > 0) {
    try { errors[0].el.focus(); } catch (e) {}
  }

  return errors.length === 0;
}

export function attachClearOnInput(fieldConfig) {
  fieldConfig.forEach(({ el }) => {
    if (!el) return;
    el.addEventListener("input", () => {
      el.classList.remove("input-error");
      const msg = el.nextElementSibling;
      if (msg && msg.classList && msg.classList.contains("error-message")) msg.textContent = "";
    });
  });
}

export function attachNumericInputHandlers(elements = []) {
  elements.forEach(el => {
    if (!el) return;
    el.addEventListener("input", () => {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const cleaned = el.value.replace(/[^\d]/g, "");
      if (el.value !== cleaned) {
        el.value = cleaned;
        try { el.setSelectionRange(Math.max(0, start - 1), Math.max(0, end - 1)); } catch (e) {}
      }
    });
  });
}