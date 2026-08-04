let installed = false;

function parseGermanDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

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

function findDayHeaders() {
  return Array.from(document.querySelectorAll("h2"))
    .map((heading) => {
      const dayKey = parseGermanDate(heading.textContent ?? "");
      const header = heading.closest("header");
      return dayKey && header instanceof HTMLElement ? { dayKey, header } : null;
    })
    .filter((entry): entry is { dayKey: string; header: HTMLElement } => Boolean(entry));
}

function enhanceDaySections() {
  for (const { dayKey, header } of findDayHeaders()) {
    const summary = Array.from(header.querySelectorAll("p")).find((node) =>
      node.textContent?.includes("Zeitfenster an diesem Tag"),
    );
    if (!(summary instanceof HTMLElement)) continue;

    const actionArea = summary.parentElement;
    if (!(actionArea instanceof HTMLElement)) continue;

    summary.style.whiteSpace = "normal";
    summary.style.textAlign = "right";

    const dayContainer = header.parentElement;
    const badges = dayContainer
      ? Array.from(dayContainer.querySelectorAll("span")).map((node) => node.textContent?.trim().toLowerCase())
      : [];
    const hasOpenSlot = badges.includes("offen");
    if (hasOpenSlot && !summary.textContent?.includes("freie Zeitfenster vorhanden")) {
      summary.textContent = `${summary.textContent?.trim() ?? ""} · freie Zeitfenster vorhanden`;
    }

    if (actionArea.querySelector(`[data-merge-calendar-day="${dayKey}"]`)) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mergeCalendarDay = dayKey;
    button.className = "btn-outline-gold !py-1.5 !px-3 !text-[0.58rem] mt-2";
    button.textContent = "Zeitslots zusammenführen";
    button.title = "Technische Unterteilungen zusammenführen, ohne gebuchte Termine zu verändern";

    button.addEventListener("click", async () => {
      if (!window.confirm("Diesen Tag wieder zusammenführen? Bereits gebuchte und reservierte Termine bleiben mit Datum, Uhrzeit und Dauer unverändert.")) return;
      button.disabled = true;
      const original = button.textContent;
      button.textContent = "Wird zusammengeführt…";
      try {
        const { mergeCalendarDayPreservingBookings } = await import("@/lib/calendar-admin.functions");
        const result = await mergeCalendarDayPreservingBookings({ data: { day_key: dayKey } });
        window.alert(result.message);
        window.location.reload();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Der Tag konnte nicht zusammengeführt werden.");
        button.disabled = false;
        button.textContent = original;
      }
    });

    actionArea.appendChild(button);
  }
}

function enhance() {
  if (!window.location.pathname.includes("/admin/kalender")) return;
  fixNewSlotFormLabels();
  enhanceDaySections();
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
