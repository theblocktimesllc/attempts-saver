// preload.js
// Minimal, safe preload script for renderer <-> main communication.
// Exposes a small, controlled API to the renderer via contextBridge.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appBridge", {
  ping: () => "pong",

  // Attempts API: first tries a fetch-based backend, falls back to local functions if not available.
  attemptsAPI: {
    listAttempts: async () => {
      try {
        const res = await fetch("/api/attempts");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.warn("attemptsAPI.listAttempts fallback", e);
        return [];
      }
    },

    getAttempt: async (id) => {
      try {
        const res = await fetch(`/api/attempts/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.warn("attemptsAPI.getAttempt fallback", e);
        return null;
      }
    },

    updateAttempt: async (id, patch) => {
      try {
        const res = await fetch(`/api/attempts/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error("attemptsAPI.updateAttempt error", e);
        throw e;
      }
    }
  },

  // Simple host notification helper (renderer can call to show a small toast)
  hostNotify: (message) => {
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
          transition: "opacity 220ms ease"
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
});

console.log("preload: appBridge exposed");