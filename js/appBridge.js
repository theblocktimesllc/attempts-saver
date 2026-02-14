// js/appBridge.js
// Browser-compatible replacement for Electron preload API.
// Keeps the same global shape used by your renderer code.
// NOTE: uses the same storage key as storage.js to avoid mismatch.

(function () {
  if (window.appBridge) return;

  const STORAGE_KEY = "attempts_saver_data";

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function saveLocalAttempts(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) { console.error("saveLocalAttempts", e); }
  }

  window.appBridge = {
    ping: () => "pong",

    attemptsAPI: {
      async listAttempts() {
        try {
          const res = await fetch("/api/attempts");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          console.warn("attemptsAPI.listAttempts fallback", e);
          const raw = localStorage.getItem(STORAGE_KEY);
          return raw ? safeParse(raw) || [] : [];
        }
      },

      async getAttempt(id) {
        try {
          const res = await fetch(`/api/attempts/${encodeURIComponent(id)}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          console.warn("attemptsAPI.getAttempt fallback", e);
          const arr = safeParse(localStorage.getItem(STORAGE_KEY)) || [];
          return arr.find(a => String(a.id) === String(id) || String(a._uid) === String(id)) || null;
        }
      },

      async updateAttempt(id, patch) {
        try {
          const res = await fetch(`/api/attempts/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch)
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          console.warn("attemptsAPI.updateAttempt fallback", e);
          const arr = safeParse(localStorage.getItem(STORAGE_KEY)) || [];
          const idx = arr.findIndex(a => String(a.id) === String(id) || String(a._uid) === String(id));
          if (idx >= 0) {
            arr[idx] = Object.assign({}, arr[idx], patch);
            saveLocalAttempts(arr);
            return arr[idx];
          }
          throw e;
        }
      },

      async saveAttempt(attempt) {
        try {
          const res = await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attempt)
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          console.warn("attemptsAPI.saveAttempt fallback", e);
          const arr = safeParse(localStorage.getItem(STORAGE_KEY)) || [];
          arr.push(attempt);
          saveLocalAttempts(arr);
          return attempt;
        }
      },

      async deleteAttempt(id) {
        try {
          const res = await fetch(`/api/attempts/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          console.warn("attemptsAPI.deleteAttempt fallback", e);
          const arr = safeParse(localStorage.getItem(STORAGE_KEY)) || [];
          const filtered = arr.filter(a => String(a.id) !== String(id) && String(a._uid) !== String(id));
          saveLocalAttempts(filtered);
          return { success: true };
        }
      }
    },

    hostNotify(message) {
      try {
        let t = document.getElementById("host-toast");
        if (!t) {
          t = document.createElement("div");
          t.id = "host-toast";
          Object.assign(t.style, {
            position: "fixed",
            right: "16px",
            bottom: "16px",
            padding: "10px 14px",
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            borderRadius: "8px",
            zIndex: 99999,
            transition: "opacity 220ms ease",
            opacity: "0"
          });
          document.body.appendChild(t);
        }
        t.textContent = message;
        t.style.opacity = "1";
        setTimeout(() => { try { t.style.opacity = "0"; } catch (e) {} }, 3000);
      } catch (e) {
        console.error("hostNotify error", e);
      }
    }
  };
})();