// search.js
// Debounced search helper

export function attachSearch(inputEl, onChange, delay = 200) {
  if (!inputEl || typeof onChange !== "function") return;
  let timer = null;
  inputEl.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      onChange(String(inputEl.value || "").trim().toLowerCase());
    }, delay);
  });
}