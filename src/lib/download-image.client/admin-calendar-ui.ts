import { supabase } from "@/integrations/supabase/client";

let adminCalendarUiInstalled = false;

function parseGermanDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function monthName(monthKey: string) {
  return new Intl.DateTimeFormat("de-DE", { month: "long" })
    .format(new Date(`${monthKey}-15T12:00:00`));
}

async function enhanceImageExport() {
  const headings = Array.from(document.querySelectorAll("h2"));
  const heading = headings.find((node) => node.textContent?.includes("Freie Termine als Bild"));
  const section = heading?.closest("section");
  if (!(section instanceof HTMLElement) || section.querySelector("[data-calendar-image-controls]")) return;

  const { data, error } = await supabase
    .from("availability_slots")
    .select("starts_at")
    .eq("status", "open")
    .eq("is_hidden", false)
    .gt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;

  const monthKeys = [...new Set((data ?? []).map((row) => row.starts_at.slice(0, 7)))].sort();
  const yearKeys = [...new Set(monthKeys.map((key) => key.slice(0, 4)))].sort();

  section.replaceChildren();
  section.dataset.calendarImageExport = "true";

  const titleRow = document.createElement("div");
  titleRow.className = "flex items-center gap-2 text-champagne";
  const title = document.createElement("h2");
  title.className = "font-display text-2xl";
  title.textContent = "Freie Termine als Bild";
  titleRow.appendChild(title);

  const controls = document.createElement("div");
  controls.dataset.calendarImageControls = "true";
  controls.className = "mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end";

  const createField = (labelText: string, select: HTMLSelectElement) => {
    const wrapper = document.createElement("label");
    wrapper.className = "block";
    const label = document.createElement("span");
    label.className = "mb-1.5 block text-[0.6rem] uppercase tracking-[0.18em] text-vanilla/55";
    label.textContent = labelText;
    select.className = "input-luxe w-full";
    wrapper.append(label, select);
    return wrapper;
  };

  const typeSelect = document.createElement("select");
  [["month", "Einzelner Monat"], ["year", "Ganzes Jahr"], ["all", "Alle offenen Termine"]]
    .forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      typeSelect.appendChild(option);
    });

  const yearSelect = document.createElement("select");
  for (const year of yearKeys) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }

  const monthSelect = document.createElement("select");
  const rebuildMonths = () => {
    const selectedYear = yearSelect.value;
    monthSelect.replaceChildren();
    for (const key of monthKeys.filter((monthKey) => monthKey.startsWith(`${selectedYear}-`))) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = monthName(key);
      monthSelect.appendChild(option);
    }
  };
  rebuildMonths();

  const typeField = createField("Auswahl", typeSelect);
  const yearField = createField("Jahr", yearSelect);
  const monthField = createField("Monat", monthSelect);

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "btn-gold !py-3 !px-5 !text-[0.65rem] whitespace-nowrap";
  downloadButton.textContent = "Bild herunterladen";

  const updateFields = () => {
    const type = typeSelect.value;
    yearField.style.display = type === "all" ? "none" : "block";
    monthField.style.display = type === "month" ? "block" : "none";
    downloadButton.disabled = monthKeys.length === 0 || (type === "month" && !monthSelect.value);
  };

  typeSelect.addEventListener("change", updateFields);
  yearSelect.addEventListener("change", () => {
    rebuildMonths();
    updateFields();
  });

  downloadButton.addEventListener("click", async () => {
    const originalText = downloadButton.textContent;
    downloadButton.disabled = true;
    downloadButton.textContent = "Bild wird erstellt…";
    try {
      const { exportCalendarImage } = await import("./calendar-image-export");
      if (typeSelect.value === "month") {
        await exportCalendarImage({ type: "month", monthKey: monthSelect.value });
      } else if (typeSelect.value === "year") {
        await exportCalendarImage({ type: "year", year: yearSelect.value });
      } else {
        await exportCalendarImage({ type: "all" });
      }
    } catch (exportError) {
      window.alert(exportError instanceof Error ? exportError.message : "Das Kalenderbild konnte nicht erstellt werden.");
    } finally {
      downloadButton.textContent = originalText;
      updateFields();
    }
  });

  controls.append(typeField, yearField, monthField, downloadButton);
  section.append(titleRow, controls);
  updateFields();
}

function enhanceMergeButtons() {
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
      if (!window.confirm("Diesen Tag wieder zu den ursprünglich eingetragenen Zeitfenstern zusammenführen? Bereits gebuchte und reservierte Termine bleiben mit Datum, Uhrzeit und Dauer unverändert.")) return;
      button.disabled = true;
      button.textContent = "Wird zusammengeführt…";
      try {
        const { mergeCalendarDayPreservingBookings } = await import("@/lib/calendar-admin.functions");
        const result = await mergeCalendarDayPreservingBookings({ data: { day_key: dayKey } });
        window.alert(result.message);
        window.location.reload();
      } catch (mergeError) {
        window.alert(mergeError instanceof Error ? mergeError.message : "Der Tag konnte nicht zusammengeführt werden.");
        button.disabled = false;
        button.textContent = "Tag wieder zusammenführen";
      }
    });
    actionArea.appendChild(button);
  }
}

function enhanceCurrentRoute() {
  if (!window.location.pathname.includes("/admin/kalender")) return;
  void enhanceImageExport();
  enhanceMergeButtons();
}

function installAdminCalendarUi() {
  if (adminCalendarUiInstalled || typeof window === "undefined") return;
  adminCalendarUiInstalled = true;
  queueMicrotask(enhanceCurrentRoute);
  const observer = new MutationObserver(enhanceCurrentRoute);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", enhanceCurrentRoute);
}

if (typeof window !== "undefined") installAdminCalendarUi();
