// utils.js
// Utility functions (dates, uid, escape)

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function generateUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}

export function parseDateFlexible(str) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const m = trimmed.match(mmddyyyy);
  if (m) {
    const mm = Number(m[1]), dd = Number(m[2]), yyyy = Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    if (d && d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd) return d;
    return null;
  }
  const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const y = trimmed.match(ymd);
  if (y) {
    const yyyy = Number(y[1]), mm = Number(y[2]), dd = Number(y[3]);
    const d = new Date(yyyy, mm - 1, dd);
    if (d && d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd) return d;
    return null;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateForDisplay(d) {
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}