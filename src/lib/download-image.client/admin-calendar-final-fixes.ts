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

function enhanceDaySections() {
  const sections = Array.from(document.querySelectorAll("section.border.border-champagne\\/15.bg-card"));

  for (const section of sections) {
    const dateHeading = section.querySelector("h2");
    const dayKey = dateHeading ? parseGermanDate(dateHeading.textContent ?? "") : null;
    const header = section.querySelector("header");
    if (!dayKey || !(header instanceof HTMLElement)) continue;

    const actionArea = header.lastElementChild;
    if (!(actionArea instanceof HTMLElement)) continue;

    const badges = Array.from(section.querySelectorAll("span")).map((node) => node.textContent?.trim().toLowerCase());
    const hasOpenSlot = badges.includes("offen");
    const summary = actionArea.querySelector("p");
    if (summary instanceof HTMLElement) {
      summary.style.whiteSpace = "normal";
      summary.style.textAlign = "right";
      if (hasOpenSlot && !summary.textContent?.includes("freie Zeitfenster vorhanden")) {
        summary.textContent = `${summary.textContent?.trim() ?? ""} · freie Zeitfenster vorhanden`;
      }
    }

    if (section.querySelector("[data-merge-calendar-day]")) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mergeCalendarDay = dayKey;
    button.className = "btn-outline-gold !py-1.5 !px-3 !text-[0.58rem]";
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
  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", enhance);
}
