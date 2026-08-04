import { supabase } from "@/integrations/supabase/client";

let installed = false;

function monthLabel(monthKey: string) {
  return new Intl.DateTimeFormat("de-DE", { month: "long" }).format(
    new Date(`${monthKey}-15T12:00:00`),
  );
}

function yearFromMonthKey(monthKey: string) {
  return monthKey.slice(0, 4);
}

async function installCompactCalendarExport() {
  if (installed || typeof window === "undefined") return;
  if (!window.location.pathname.includes("/admin/kalender")) return;
  installed = true;

  const apply = async () => {
    const heading = Array.from(document.querySelectorAll("h2")).find((node) =>
      node.textContent?.includes("Freie Termine als Bild"),
    );
    const section = heading?.closest("section");
    if (!(section instanceof HTMLElement)) return;
    if (section.dataset.compactCalendarExport === "true") return;

    const { data, error } = await supabase
      .from("availability_slots")
      .select("starts_at, ends_at")
      .eq("status", "open")
      .eq("is_hidden", false)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    if (error) return;

    const monthKeys = [...new Set((data ?? []).map((row) => row.starts_at.slice(0, 7)))];
    const years = [...new Set(monthKeys.map(yearFromMonthKey))].sort();
    const currentYear = years[0] ?? String(new Date().getFullYear());

    section.dataset.compactCalendarExport = "true";
    section.dataset.calendarImageControls = "true";
    section.innerHTML = "";

    const header = document.createElement("div");
    header.innerHTML = `
      <div class="flex items-center gap-2 text-champagne">
        <span aria-hidden="true" class="text-xl">♕</span>
        <h2 class="font-display text-2xl">Freie Termine als Bild</h2>
      </div>
      <p class="mt-2 text-xs leading-relaxed text-vanilla/55">
        Wähle Monat, Jahr oder alle offenen Termine und lade das Bild direkt herunter.
      </p>
    `;

    const controls = document.createElement("div");
    controls.className = "mt-5 grid gap-3";

    const typeLabel = document.createElement("label");
    typeLabel.className = "block text-[0.6rem] uppercase tracking-[0.18em] text-vanilla/55";
    typeLabel.textContent = "Export auswählen";

    const typeSelect = document.createElement("select");
    typeSelect.className = "input-luxe";
    typeSelect.innerHTML = `
      <option value="month">Einzelner Monat</option>
      <option value="year">Ganzes Jahr</option>
      <option value="all">Alle offenen Termine</option>
    `;

    const yearSelect = document.createElement("select");
    yearSelect.className = "input-luxe";
    for (const year of years.length ? years : [currentYear]) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }

    const monthSelect = document.createElement("select");
    monthSelect.className = "input-luxe";

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
    };

    const refreshVisibility = () => {
      const type = typeSelect.value;
      yearSelect.style.display = type === "all" ? "none" : "block";
      monthSelect.style.display = type === "month" ? "block" : "none";
    };

    yearSelect.value = currentYear;
    refreshMonths();
    refreshVisibility();
    yearSelect.addEventListener("change", refreshMonths);
    typeSelect.addEventListener("change", refreshVisibility);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-gold w-full !py-3 !text-[0.65rem]";
    button.textContent = "Bild herunterladen";
    button.disabled = monthKeys.length === 0;

    button.addEventListener("click", async () => {
      const oldText = button.textContent;
      button.disabled = true;
      button.textContent = "Bild wird erstellt…";
      try {
        const { exportCalendarImage } = await import("./calendar-image-export");
        const type = typeSelect.value;
        if (type === "month") {
          await exportCalendarImage({ type: "month", monthKey: monthSelect.value });
        } else if (type === "year") {
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

    controls.append(typeLabel, typeSelect, yearSelect, monthSelect, button);
    section.append(header, controls);
  };

  await apply();
  const observer = new MutationObserver(() => void apply());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== "undefined") {
  queueMicrotask(() => void installCompactCalendarExport());
}
