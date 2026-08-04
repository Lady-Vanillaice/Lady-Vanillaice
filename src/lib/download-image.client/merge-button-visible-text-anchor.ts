let mergeButtonTextAnchorInstalled = false;

function toDayKey(germanDate: string) {
  const match = germanDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function findSummaryElements() {
  return Array.from(document.querySelectorAll<HTMLElement>("p, div, span")).filter((node) => {
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!/\d+\s+Zeitfenster\s+an\s+diesem\s+Tag/i.test(text)) return false;
    return !Array.from(node.children).some((child) =>
      /\d+\s+Zeitfenster\s+an\s+diesem\s+Tag/i.test(child.textContent ?? ""),
    );
  });
}

function findDayKey(summary: HTMLElement) {
  let current: HTMLElement | null = summary;
  for (let depth = 0; current && depth < 8; depth += 1) {
    const dateText = current.textContent?.match(/\d{2}\.\d{2}\.\d{4}/)?.[0];
    if (dateText) return { dayKey: toDayKey(dateText), dateText };
    current = current.parentElement;
  }
  return { dayKey: null, dateText: "" };
}

function makeButton(dayKey: string, dateText: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.visibleMergeDayButton = dayKey;
  button.textContent = "Zeitslots zusammenführen";
  button.setAttribute("aria-label", `Zeitslots vom ${dateText} zusammenführen`);

  const styles: Record<string, string> = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: "42px",
    marginTop: "12px",
    padding: "10px 12px",
    border: "1px solid #d9b978",
    background: "rgba(217, 185, 120, 0.12)",
    color: "#e5c98f",
    fontSize: "10px",
    fontWeight: "600",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    cursor: "pointer",
    whiteSpace: "normal",
    opacity: "1",
    visibility: "visible",
    position: "relative",
    zIndex: "20",
  };
  for (const [name, value] of Object.entries(styles)) {
    button.style.setProperty(name, value, "important");
  }

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

  return button;
}

function ensureVisibleMergeButtons() {
  if (!window.location.pathname.includes("/admin/kalender")) return;

  for (const summary of findSummaryElements()) {
    const { dayKey, dateText } = findDayKey(summary);
    if (!dayKey || !dateText) continue;

    const selector = `[data-visible-merge-day-button="${dayKey}"]`;
    let button = document.querySelector<HTMLButtonElement>(selector);

    if (!button) {
      button = makeButton(dayKey, dateText);
      summary.insertAdjacentElement("afterend", button);
    } else if (!summary.parentElement?.contains(button)) {
      summary.insertAdjacentElement("afterend", button);
    }

    button.style.setProperty("display", "flex", "important");
    button.style.setProperty("visibility", "visible", "important");
    button.style.setProperty("opacity", "1", "important");
  }
}

if (typeof window !== "undefined" && !mergeButtonTextAnchorInstalled) {
  mergeButtonTextAnchorInstalled = true;
  const run = () => ensureVisibleMergeButtons();
  queueMicrotask(run);
  window.setTimeout(run, 50);
  window.setTimeout(run, 250);
  window.setTimeout(run, 1000);
  window.setInterval(run, 250);
  window.addEventListener("pageshow", run);
  window.addEventListener("popstate", run);
}
