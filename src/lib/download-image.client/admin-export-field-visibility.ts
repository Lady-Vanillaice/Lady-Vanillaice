function findExportSection(): HTMLElement | null {
  const headings = Array.from(document.querySelectorAll("h2"));
  const heading = headings.find((node) =>
    node.textContent?.includes("Freie Termine als Bild"),
  );
  const section = heading?.closest("section");
  return section instanceof HTMLElement ? section : null;
}

function classifySelect(select: HTMLSelectElement) {
  const values = Array.from(select.options).map((option) => option.value);
  const labels = Array.from(select.options).map((option) => option.textContent?.trim() ?? "");

  if (values.includes("month") && values.includes("year") && values.includes("all")) {
    return "choice" as const;
  }
  if (values.length > 0 && values.every((value) => /^\d{4}$/.test(value))) {
    return "year" as const;
  }
  if (
    values.some((value) => /^\d{4}-\d{2}$/.test(value)) ||
    labels.some((label) => /^(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4}$/i.test(label))
  ) {
    return "month" as const;
  }
  return "other" as const;
}

function applyExportFieldVisibility() {
  if (typeof document === "undefined") return;

  const section = findExportSection();
  if (!section) return;

  const selects = Array.from(section.querySelectorAll("select")).filter(
    (node): node is HTMLSelectElement => node instanceof HTMLSelectElement,
  );

  const choiceSelect = selects.find((select) => classifySelect(select) === "choice");
  const yearSelect = selects.find((select) => classifySelect(select) === "year");
  const monthSelect = selects.find((select) => classifySelect(select) === "month");

  if (!choiceSelect) return;

  const choice = choiceSelect.value;
  if (yearSelect) {
    yearSelect.style.setProperty("display", choice === "year" ? "block" : "none", "important");
    yearSelect.style.setProperty("width", "100%", "important");
  }
  if (monthSelect) {
    monthSelect.style.setProperty("display", choice === "month" ? "block" : "none", "important");
    monthSelect.style.setProperty("width", "100%", "important");
  }

  if (choiceSelect.dataset.exportVisibilityBound !== "true") {
    choiceSelect.dataset.exportVisibilityBound = "true";
    choiceSelect.addEventListener("change", () => {
      requestAnimationFrame(applyExportFieldVisibility);
      window.setTimeout(applyExportFieldVisibility, 0);
      window.setTimeout(applyExportFieldVisibility, 100);
    });
  }
}

if (typeof window !== "undefined") {
  const run = () => applyExportFieldVisibility();

  queueMicrotask(run);
  window.addEventListener("DOMContentLoaded", run, { once: true });
  window.addEventListener("load", run, { once: true });

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.setInterval(run, 500);
}
