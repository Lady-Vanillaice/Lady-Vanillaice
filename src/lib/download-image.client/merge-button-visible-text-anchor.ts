let mergeButtonTextAnchorInstalled = false;

function toDayKey(germanDate: string) {
  const match = germanDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function installVisibleMergeButtons() {
  if (!window.location.pathname.includes("/admin/kalender")) return;

  const summaries = Array.from(document.querySelectorAll("p")).filter((node) =>
    node.textContent?.includes("Zeitfenster an diesem Tag"),
  );

  for (const summary of summaries) {
    const actionArea = summary.parentElement;
    const daySection = summary.closest("section");
    if (!(actionArea instanceof HTMLElement) || !(daySection instanceof HTMLElement)) continue;
    if (actionArea.querySelector("[data-visible-merge-day-button]")) continue;

    const dateText = daySection.textContent?.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] ?? "";
    const dayKey = toDayKey(dateText);
    if (!dayKey) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.visibleMergeDayButton = dayKey;
    button.textContent = "Zeitslots zusammenführen";
    button.setAttribute("aria-label", `Zeitslots vom ${dateText} zusammenführen`);
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.width = "100%";
    button.style.marginTop = "10px";
    button.style.padding = "10px 12px";
    button.style.border = "1px solid rgba(224, 191, 128, 0.65)";
    button.style.background = "rgba(224, 191, 128, 0.08)";
    button.style.color = "rgb(224, 191, 128)";
    button.style.fontSize = "10px";
    button.style.letterSpacing = "0.16em";
    button.style.textTransform = "uppercase";
    button.style.cursor = "pointer";
    button.style.whiteSpace = "normal";

    button.addEventListener("click", async () => {
      const confirmed = window.confirm(
        `Zeitslots am ${dateText} zusammenführen? Bereits gebuchte und reservierte Termine behalten Datum, Uhrzeit und Dauer.`,
      );
      if (!confirmed) return;

      const originalText = button.textContent;
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
        button.textContent = originalText;
      }
    });

    actionArea.appendChild(button);
  }
}

if (typeof window !== "undefined" && !mergeButtonTextAnchorInstalled) {
  mergeButtonTextAnchorInstalled = true;
  const run = () => installVisibleMergeButtons();
  queueMicrotask(run);
  window.setTimeout(run, 100);
  window.setTimeout(run, 500);
  window.setTimeout(run, 1500);
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("pageshow", run);
  window.addEventListener("popstate", run);
}
