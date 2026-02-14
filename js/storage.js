// storage.js
// Local storage helpers (English-only identifiers) with merge helper

const STORAGE_KEY = "attempts_saver_data";

/**
 * Generate a simple unique id for local records.
 */
function _generateUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}

/**
 * Sanitize imported array and ensure each item has required fields.
 * Accepts legacy Spanish keys (nombre, fecha, tipo, notas) and maps them to English.
 */
export function sanitizeImportedAttempts(rawArray) {
  try {
    if (!Array.isArray(rawArray)) return [];
    return rawArray.map(item => {
      const attemptsVal = parseInt(item && (item.attempts ?? item.intentos), 10);
      return {
        _uid: (item && item._uid) || _generateUid(),
        name: (item && (item.name ?? item.nombre)) ? String(item.name ?? item.nombre) : "",
        id: (item && item.id) ? String(item.id) : "",
        type: (item && (item.type ?? item.tipo)) ? String(item.type ?? item.tipo) : "online",
        date: (item && (item.date ?? item.fecha)) ? String(item.date ?? item.fecha) : "",
        attempts: Number.isFinite(attemptsVal) ? attemptsVal : 0,
        notes: (item && (item.notes ?? item.notas)) ? String(item.notes ?? item.notas) : ""
      };
    });
  } catch (err) {
    console.error("storage.sanitizeImportedAttempts error:", err);
    return [];
  }
}

/**
 * Load attempts from localStorage and normalize them.
 * If legacy keys or missing _uid are detected, the normalized array is persisted back.
 */
export function loadAttempts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeImportedAttempts(parsed);

    try {
      const needsRewrite = Array.isArray(parsed) && parsed.some(item =>
        !item || !item._uid || item.nombre || item.fecha || item.tipo || item.notas || item.intentos
      );
      if (needsRewrite) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      }
    } catch (e) {
      // ignore persistence errors
    }

    return sanitized;
  } catch (err) {
    console.error("storage.loadAttempts error:", err);
    return [];
  }
}

/**
 * Save attempts array to localStorage.
 */
export function saveAttempts(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error("storage.saveAttempts error:", err);
    return false;
  }
}

/**
 * Merge an imported array of attempts with existing stored attempts, deduplicate and save.
 *
 * Behavior:
 * - importedArray is sanitized first.
 * - deduplication key: prefer `id` if present, otherwise `_uid`.
 * - imported items override existing items with the same key by default.
 * - returns the merged array (and persists it).
 *
 * Options:
 * - preferExisting (boolean): if true, keep existing items on conflict instead of imported ones.
 */
export function mergeAndSaveAttempts(importedArray, options = { preferExisting: false }) {
  try {
    const imported = sanitizeImportedAttempts(importedArray || []);
    const existing = loadAttempts() || [];

    const map = new Map();

    // Helper to compute key
    const keyFor = item => {
      if (!item) return _generateUid();
      if (item.id && String(item.id).trim() !== "") return String(item.id);
      if (item._uid && String(item._uid).trim() !== "") return String(item._uid);
      return _generateUid();
    };

    // Insert existing first
    existing.forEach(item => {
      const key = keyFor(item);
      map.set(key, item);
    });

    // Merge imported: either override or skip based on options.preferExisting
    imported.forEach(item => {
      const key = keyFor(item);
      if (options.preferExisting) {
        if (!map.has(key)) map.set(key, item);
      } else {
        map.set(key, item);
      }
    });

    const merged = Array.from(map.values());
    saveAttempts(merged);
    return merged;
  } catch (err) {
    console.error("storage.mergeAndSaveAttempts error:", err);
    return loadAttempts();
  }
}

/**
 * Clear all attempts from storage.
 */
export function clearAttempts() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error("storage.clearAttempts error:", err);
    return false;
  }
}

/**
 * Export attempts to JSON string.
 */
export function exportAttemptsToJsonString(list) {
  try {
    return JSON.stringify(list, null, 2);
  } catch (err) {
    console.error("storage.exportAttemptsToJsonString error:", err);
    return "[]";
  }
}