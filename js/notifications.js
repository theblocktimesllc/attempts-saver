// notifications.js
// Non-blocking notifications and confirm modal

export function ensureNotificationContainer() {
  let container = document.getElementById("notif-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notif-container";
    container.setAttribute("role", "status");
    container.style.position = "fixed";
    container.style.right = "16px";
    container.style.top = "16px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }
  return container;
}

export function notify(message, timeout = 2500) {
  const container = ensureNotificationContainer();
  const n = document.createElement("div");
  n.className = "app-notif";
  n.textContent = message;
  n.style.background = "#222";
  n.style.color = "#fff";
  n.style.padding = "8px 12px";
  n.style.marginTop = "8px";
  n.style.borderRadius = "6px";
  n.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  container.appendChild(n);
  setTimeout(() => {
    n.style.opacity = "0";
    setTimeout(() => n.remove(), 300);
  }, timeout);
}

export function ensureConfirmModal() {
  let modal = document.getElementById("confirm-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "confirm-modal";
  modal.style.position = "fixed";
  modal.style.left = "0";
  modal.style.top = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.display = "none";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "10000";

  const backdrop = document.createElement("div");
  backdrop.className = "confirm-backdrop";
  modal.appendChild(backdrop);

  const box = document.createElement("div");
  box.className = "confirm-box";

  const msg = document.createElement("div");
  msg.id = "confirm-modal-msg";
  msg.style.marginBottom = "12px";
  box.appendChild(msg);

  const actions = document.createElement("div");
  actions.className = "confirm-actions";

  const btnCancel = document.createElement("button");
  btnCancel.textContent = "Cancel";
  btnCancel.type = "button";
  btnCancel.className = "cancel";

  const btnOk = document.createElement("button");
  btnOk.textContent = "OK";
  btnOk.type = "button";
  btnOk.className = "ok";

  actions.appendChild(btnCancel);
  actions.appendChild(btnOk);
  box.appendChild(actions);
  modal.appendChild(box);
  document.body.appendChild(modal);

  return modal;
}

export function confirmAsync(message) {
  return new Promise(resolve => {
    const modal = ensureConfirmModal();
    const msg = modal.querySelector("#confirm-modal-msg");
    msg.textContent = message;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");

    const btns = modal.querySelectorAll("button");
    const btnCancel = btns[0];
    const btnOk = btns[1];

    function cleanup(result) {
      btnCancel.removeEventListener("click", onCancel);
      btnOk.removeEventListener("click", onOk);
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      setTimeout(() => resolve(result), 0);
    }
    function onCancel() { cleanup(false); }
    function onOk() { cleanup(true); }

    btnCancel.addEventListener("click", onCancel);
    btnOk.addEventListener("click", onOk);

    btnOk.focus();
  });
}