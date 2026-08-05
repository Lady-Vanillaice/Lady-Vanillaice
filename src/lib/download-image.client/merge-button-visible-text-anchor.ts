let mergeButtonTextAnchorInstalled = false;

function toDayKey(germanDate: string) {
  const match = germanDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function findDaySummaries() {
  return Array.from(document.querySelectorAll<HTMLElement>("p, div, span")).filter((node) => {
    const ownText = Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const fullText = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const text = ownText || fullText;
    return /^\d+\s+Zeitfenster\s+an\s+diesem\s+Tag$/i.test(text);
  });
}

function findDaySection(summary: HTMLElement) {
  let current: HTMLElement | null = summary;
  for (let depth = 0; current && depth < 8; depth += 1) {
    if (current.tagName === "SECTION") {
      const text = current.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (/\d{2}\.\d{2}\.\d{4}/.test(text)) return current;
    }
    current = current.parentElement;
  }
  return null;
}

function getDayInfo(summary: HTMLElement, section: HTMLElement) {
  const summaryText = summary.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const sectionText = section.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const dateText = sectionText.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] ?? "";
  const count = Number(summaryText.match(/^(\d+)\s+Zeitfenster\s+an\s+diesem\s+Tag$/i)?.[1] ?? 0);
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

  for (const summary of findDaySummaries()) {
    const section = findDaySection(summary);
    if (!section) continue;
    const { dayKey, dateText, count } = getDayInfo(summary, section);
    if (!dayKey || !dateText || count < 2) continue;

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

export function installCalendarMergeButtons() {
  if (typeof window === "undefined") return;

  const run = () => ensureVisibleMergeButtons();
  run();

  if (mergeButtonTextAnchorInstalled) return;
  mergeButtonTextAnchorInstalled = true;
  queueMicrotask(run);
  window.setTimeout(run, 50);
  window.setTimeout(run, 250);
  window.setTimeout(run, 1000);
  window.setInterval(run, 500);
  window.addEventListener("pageshow", run);
  window.addEventListener("popstate", run);
}

installCalendarMergeButtons();
