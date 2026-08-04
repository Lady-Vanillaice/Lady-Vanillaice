let mergeButtonTextAnchorInstalled = false;

function toDayKey(germanDate: string) {
  const match = germanDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function findDaySections() {
  return Array.from(document.querySelectorAll<HTMLElement>("section")).filter((section) => {
    const text = section.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return /\d{2}\.\d{2}\.\d{4}/.test(text)
      && /\d+\s+Zeitfenster\s+an\s+diesem\s+Tag/i.test(text);
  });
}

function getDayInfo(section: HTMLElement) {
  const text = section.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const dateText = text.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] ?? "";
  const count = Number(text.match(/(\d+)\s+Zeitfenster\s+an\s+diesem\s+Tag/i)?.[1] ?? 0);
  return { dayKey: toDayKey(dateText), dateText, count };
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
      `Alle passenden Zeitfenster am ${dateText} zu einem durchgehenden Zeitraum verbinden? Lücken zwischen den bisherigen Zeiten werden dadurch ebenfalls buchbar.`,
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

  for (const section of findDaySections()) {
    const { dayKey, dateText, count } = getDayInfo(section);
    if (!dayKey || !dateText || count < 2) continue;

    const header = section.querySelector<HTMLElement>("header") ?? section.firstElementChild as HTMLElement | null;
    if (!header) continue;

    const selector = `[data-visible-merge-day-button="${dayKey}"]`;
    let button = document.querySelector<HTMLButtonElement>(selector);
    if (!button) {
      button = makeButton(dayKey, dateText);
      header.appendChild(button);
    } else if (!header.contains(button)) {
      header.appendChild(button);
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
  window.setInterval(run, 500);
  window.addEventListener("pageshow", run);
  window.addEventListener("popstate", run);
}
