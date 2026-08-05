let installed = false;

function fixNewSlotFormLabels() {
  const labels = Array.from(document.querySelectorAll("label"));
  for (const label of labels) {
    const text = label.textContent?.replace(/\s+/g, " ").trim();
    if (text === "1. Zeitfenster · Von") label.textContent = "Von";
    if (text === "1. Zeitfenster · Bis") label.textContent = "Bis";
    if (text === "2. Zeitfenster · Von") label.textContent = "Von";
    if (text === "2. Zeitfenster · Bis") label.textContent = "Bis";
  }

  const firstFrom = labels.find((label) => label.textContent?.trim() === "Von");
  const grid = firstFrom?.closest(".grid");
  if (grid instanceof HTMLElement && !grid.querySelector("[data-first-window-title]")) {
    const title = document.createElement("div");
    title.dataset.firstWindowTitle = "true";
    title.className = "col-span-3 text-[0.65rem] uppercase tracking-[0.18em] text-champagne";
    title.textContent = "1. Zeitfenster";
    const dateField = grid.firstElementChild;
    if (dateField?.nextSibling) grid.insertBefore(title, dateField.nextSibling);
    else grid.appendChild(title);
  }
}

function enhance() {
  if (!window.location.pathname.includes("/admin/kalender")) return;
  fixNewSlotFormLabels();
}

if (typeof window !== "undefined" && !installed) {
  installed = true;
  queueMicrotask(enhance);
  window.setTimeout(enhance, 250);
  window.setTimeout(enhance, 1000);
  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", enhance);
}
