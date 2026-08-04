import { supabase } from "@/integrations/supabase/client";

let adminCalendarUiInstalled = false;

function parseGermanDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function monthName(monthKey: string) {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" })
    .format(new Date(`${monthKey}-15T12:00:00`));
}

async function enhanceImageExport() {
  const headings = Array.from(document.querySelectorAll("h2"));
  const heading = headings.find((node) => node.textContent?.includes("Freie Termine als Bild"));
  const section = heading?.closest("section");
  if (!(section instanceof HTMLElement) || section.querySelector("[data-calendar-image-controls]")) return;

  const oldButton = Array.from(section.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Als Bild herunterladen"),
  );
  if (oldButton instanceof HTMLElement) oldButton.style.display = "none";

  const { data } = await supabase
    .from("availability_slots")
    .select("starts_at")
    .eq("status", "open")
    .eq("is_hidden", false)
    .gt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const monthKeys = [...new Set((data ?? []).map((row) => row.starts_at.slice(0, 7)))];
  if (monthKeys.length === 0) return;

  const controls = document.createElement("div");
  controls.dataset.calendarImageControls = "true";
  controls.className = "mt-5 border-t border-champagne/20 pt-5 space-y-3";

  const label = document.createElement("label");
  label.className = "block text-[0.6rem] uppercase tracking-[0.18em] text-vanilla/55";
  label.textContent = "Monat auswählen";

  const row = document.createElement("div");
  row.className = "flex flex-col sm:flex-row gap-3";

  const select = document.createElement("select");
  select.className = "input-luxe sm:max-w-xs";
  for (const key of monthKeys) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = monthName(key);
    select.appendChild(option);
  }

  const monthButton = document.createElement("button");
  monthButton.type = "button";
  monthButton.className = "btn-gold !py-2.5 !px-4 !text-[0.65rem]";
  monthButton.textContent = "Ausgewählten Monat speichern";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "btn-outline-gold !py-2.5 !px-4 !text-[0.65rem]";
  allButton.textContent = "Alle offenen Termine speichern";

  const runExport = async (type: "month" | "all") => {
    const activeButton = type === "month" ? monthButton : allButton;
    const originalText = activeButton.textContent;
    monthButton.disabled = true;
    allButton.disabled = true;
    activeButton.textContent = "Bild wird erstellt…";
    try {
      const { exportCalendarImage } = await import("./calendar-image-export");
      await exportCalendarImage(type === "month"
        ? { type: "month", monthKey: select.value }
        : { type: "all" });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Das Kalenderbild konnte nicht erstellt werden.");
    } finally {
      monthButton.disabled = false;
      allButton.disabled = false;
      activeButton.textContent = originalText;
    }
  };

  monthButton.addEventListener("click", () => void runExport("month"));
  allButton.addEventListener("click", () => void runExport("all"));
  row.append(select, monthButton, allButton);
  controls.append(label, row);
  section.appendChild(controls);
}

function installAdminCalendarUi() {
  if (adminCalendarUiInstalled || typeof window === "undefined") return;
  if (!window.location.pathname.includes("/admin/kalender")) return;
  adminCalendarUiInstalled = true;

  const enhance = () => {
    void enhanceImageExport();
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
