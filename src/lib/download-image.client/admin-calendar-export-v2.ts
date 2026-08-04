import { supabase } from "@/integrations/supabase/client";
import "./calendar-image-export-layout-fix";

function monthLabel(monthKey: string) {
  return new Intl.DateTimeFormat("de-DE", { month: "long" }).format(
    new Date(`${monthKey}-15T12:00:00`),
  );
}

function yearFromMonthKey(monthKey: string) {
  return monthKey.slice(0, 4);
}

function findExportSection() {
  const heading = Array.from(document.querySelectorAll("h2")).find((node) =>
    node.textContent?.includes("Freie Termine als Bild"),
  );
  const section = heading?.closest("section");
  return section instanceof HTMLElement ? section : null;
}

async function installCompactCalendarExport() {
  if (typeof window === "undefined") return;
  if (!window.location.pathname.includes("/admin/kalender")) return;

  const replace = () => {
    const section = findExportSection();
    if (!section || section.dataset.compactCalendarExport === "true") return;

    section.dataset.compactCalendarExport = "true";
    section.dataset.calendarImageControls = "true";
    section.innerHTML = `
      <div class="flex items-center gap-2 text-champagne">
        <span aria-hidden="true" class="text-xl">♕</span>
        <h2 class="font-display text-2xl">Freie Termine als Bild</h2>
      </div>
      <p class="mt-2 text-xs leading-relaxed text-vanilla/55">
        Wähle Monat, Jahr oder alle offenen Termine und lade das Bild direkt herunter.
      </p>
      <div data-calendar-export-controls class="mt-5 grid gap-3">
        <label class="block text-[0.6rem] uppercase tracking-[0.18em] text-vanilla/55">Export auswählen</label>
        <select data-export-type class="input-luxe">
          <option value="month">Einzelner Monat</option>
          <option value="year">Ganzes Jahr</option>
          <option value="all">Alle offenen Termine</option>
        </select>
        <select data-export-year class="input-luxe"></select>
        <select data-export-month class="input-luxe"></select>
        <button data-export-download type="button" class="btn-gold w-full !py-3 !text-[0.65rem]">
          Bild herunterladen
        </button>
      </div>
    `;

    const typeSelect = section.querySelector<HTMLSelectElement>("[data-export-type]");
    const yearSelect = section.querySelector<HTMLSelectElement>("[data-export-year]");
    const monthSelect = section.querySelector<HTMLSelectElement>("[data-export-month]");
    const button = section.querySelector<HTMLButtonElement>("[data-export-download]");
    if (!typeSelect || !yearSelect || !monthSelect || !button) return;

    let monthKeys: string[] = [];

    const refreshMonths = () => {
      const selectedYear = yearSelect.value;
      const options = monthKeys.filter((key) => yearFromMonthKey(key) === selectedYear);
      monthSelect.innerHTML = "";
      for (const key of options) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = `${monthLabel(key)} ${selectedYear}`;
        monthSelect.appendChild(option);
      }
      if (options.length === 0) {
        const option = document.createElement("option");
        option.value = `${selectedYear}-01`;
        option.textContent = `Keine offenen Termine in ${selectedYear}`;
        monthSelect.appendChild(option);
      }
    };

    const refreshVisibility = () => {
      const type = typeSelect.value;
      yearSelect.style.display = type === "all" ? "none" : "block";
      monthSelect.style.display = type === "month" ? "block" : "none";
    };

    typeSelect.addEventListener("change", refreshVisibility);
    yearSelect.addEventListener("change", refreshMonths);
    refreshVisibility();

    button.addEventListener("click", async () => {
      const oldText = button.textContent;
      button.disabled = true;
      button.textContent = "Bild wird erstellt…";
      try {
        const { exportCalendarImage } = await import("./calendar-image-export");
        if (typeSelect.value === "month") {
          await exportCalendarImage({ type: "month", monthKey: monthSelect.value });
        } else if (typeSelect.value === "year") {
          await exportCalendarImage({ type: "year", year: Number(yearSelect.value) });
        } else {
          await exportCalendarImage({ type: "all" });
        }
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Das Bild konnte nicht erstellt werden.");
      } finally {
        button.disabled = false;
        button.textContent = oldText;
      }
    });

    void (async () => {
      const { data } = await supabase
        .from("availability_slots")
        .select("starts_at, ends_at")
        .eq("status", "open")
        .eq("is_hidden", false)
        .gt("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true });

      monthKeys = [...new Set((data ?? []).map((row) => row.starts_at.slice(0, 7)))];
      const fallbackYear = String(new Date().getFullYear());
      const years = [...new Set(monthKeys.map(yearFromMonthKey))].sort();
      yearSelect.innerHTML = "";
      for (const year of years.length ? years : [fallbackYear]) {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
      }
      refreshMonths();
      button.disabled = monthKeys.length === 0;
    })();
  };

  replace();
  const observer = new MutationObserver(replace);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(replace, 1000);
}

if (typeof window !== "undefined") {
  void installCompactCalendarExport();
}
