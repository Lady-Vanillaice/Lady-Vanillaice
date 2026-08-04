let adminCalendarUiInstalled = false;

function parseGermanDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function installAdminCalendarUi() {
  if (adminCalendarUiInstalled || typeof window === "undefined") return;
  if (!window.location.pathname.includes("/admin/kalender")) return;
  adminCalendarUiInstalled = true;

  const enhance = () => {
    const sections = Array.from(document.querySelectorAll("section.border.border-champagne\\/15.bg-card"));
    for (const section of sections) {
      if (section.querySelector("[data-merge-calendar-day]")) continue;
      const dateHeading = section.querySelector("h2");
      const dayKey = dateHeading ? parseGermanDate(dateHeading.textContent ?? "") : null;
      const header = section.querySelector("header");
      if (!dayKey || !header) continue;

      const actionArea = header.lastElementChild;
      if (!(actionArea instanceof HTMLElement)) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mergeCalendarDay = dayKey;
      button.className = "btn-outline-gold !py-1.5 !px-3 !text-[0.58rem]";
      button.textContent = "Tag wieder zusammenführen";
      button.title = "Technische Unterteilungen zusammenführen, ohne gebuchte Termine zu verändern";
      button.addEventListener("click", async () => {
        const confirmed = window.confirm(
          "Diesen Tag wieder zu den ursprünglich eingetragenen Zeitfenstern zusammenführen? Bereits gebuchte und reservierte Termine bleiben mit Datum, Uhrzeit und Dauer unverändert.",
        );
        if (!confirmed) return;
        button.disabled = true;
        button.textContent = "Wird zusammengeführt…";
        try {
          const { mergeCalendarDayPreservingBookings } = await import("@/lib/calendar-admin.functions");
          const result = await mergeCalendarDayPreservingBookings({ data: { day_key: dayKey } });
          window.alert(result.message);
          window.location.reload();
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "Der Tag konnte nicht zusammengeführt werden.");
          button.disabled = false;
          button.textContent = "Tag wieder zusammenführen";
        }
      });
      actionArea.appendChild(button);
    }
  };

  enhance();
  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== "undefined") {
  queueMicrotask(installAdminCalendarUi);
}
