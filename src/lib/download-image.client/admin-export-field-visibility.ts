function syncExportFields() {
  if (typeof document === "undefined") return;

  const heading = Array.from(document.querySelectorAll("h2")).find((node) =>
    node.textContent?.trim() === "Freie Termine als Bild",
  );
  const section = heading?.closest("section");
  if (!(section instanceof HTMLElement)) return;

  const selects = Array.from(section.querySelectorAll("select"));
  const choiceSelect = selects[0];
  if (!(choiceSelect instanceof HTMLSelectElement)) return;

  const conditionalSelects = selects.slice(1).filter(
    (node): node is HTMLSelectElement => node instanceof HTMLSelectElement,
  );

  const apply = () => {
    const currentSelects = Array.from(section.querySelectorAll("select")).filter(
      (node): node is HTMLSelectElement => node instanceof HTMLSelectElement,
    );
    const currentChoice = currentSelects[0];
    const yearSelect = currentSelects.find((select, index) =>
      index > 0 && Array.from(select.options).every((option) => /^\d{4}$/.test(option.value)),
    );
    const monthSelect = currentSelects.find((select, index) =>
      index > 0 && Array.from(select.options).some((option) => /^\d{4}-\d{2}$/.test(option.value)),
    );

    if (!(currentChoice instanceof HTMLSelectElement)) return;

    if (yearSelect) yearSelect.style.display = currentChoice.value === "year" ? "block" : "none";
    if (monthSelect) monthSelect.style.display = currentChoice.value === "month" ? "block" : "none";
  };

  if (section.dataset.exportFieldVisibilityBound !== "true") {
    section.dataset.exportFieldVisibilityBound = "true";
    choiceSelect.addEventListener("change", () => queueMicrotask(apply));
  }

  for (const select of conditionalSelects) {
    select.style.width = "100%";
  }
  apply();
}

if (typeof window !== "undefined") {
  const run = () => syncExportFields();
  queueMicrotask(run);
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
