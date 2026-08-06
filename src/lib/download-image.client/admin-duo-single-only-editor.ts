import { supabase } from "@/integrations/supabase/client";

let installed = false;
const TZ = "Europe/Berlin";

type ModeSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  is_duo: boolean;
  duo_partner: string | null;
  is_hidden: boolean | null;
};

function dayKey(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function timeLabel(value: string | number) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function getOffsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - date.getTime()) / 60_000;
}

function wallTimeIso(slotIso: string, hm: string) {
  const match = hm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error("Bitte die Uhrzeit als HH:MM eingeben, zum Beispiel 14:30.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("Diese Uhrzeit ist ungültig.");
  const [year, month, day] = dayKey(slotIso).split("-").map(Number);
  const wallUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset = getOffsetMinutes(new Date(wallUtc));
  return new Date(wallUtc - offset * 60_000).toISOString();
}

function buttonStyle(button: HTMLButtonElement, primary = false) {
  Object.assign(button.style, {
    border: "1px solid rgba(216,182,118,.55)",
    background: primary ? "rgba(67,199,199,.18)" : "rgba(216,182,118,.08)",
    color: primary ? "#79e0df" : "#e5c98f",
    padding: "8px 10px",
    fontSize: "10px",
    letterSpacing: ".12em",
    textTransform: "uppercase",
    cursor: "pointer",
  });
}

async function loadSlots(): Promise<ModeSlot[]> {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, location, is_duo, duo_partner, is_hidden")
    .gt("ends_at", new Date().toISOString())
    .not("duo_partner", "is", null)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ModeSlot[];
}

function findMountPoint() {
  const daySection = Array.from(document.querySelectorAll<HTMLElement>("section")).find((section) =>
    /\d+\s+Zeitfenster\s+an\s+diesem\s+Tag/i.test(section.textContent ?? ""),
  );
  return daySection?.parentElement ?? null;
}

function makeDot(color: string, label: string) {
  const item = document.createElement("span");
  item.style.display = "inline-flex";
  item.style.alignItems = "center";
  item.style.gap = "6px";
  item.style.fontSize = "11px";
  item.style.color = "rgba(244,234,216,.65)";
  const dot = document.createElement("i");
  dot.style.width = "9px";
  dot.style.height = "9px";
  dot.style.borderRadius = "999px";
  dot.style.background = color;
  item.append(dot, document.createTextNode(label));
  return item;
}

async function renderEditor() {
  if (!window.location.pathname.includes("/admin/kalender")) return;
  const mount = findMountPoint();
  if (!mount) return;

  let panel = document.getElementById("duo-single-only-editor");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "duo-single-only-editor";
    mount.insertBefore(panel, mount.firstElementChild);
  }
  panel.innerHTML = "";
  Object.assign(panel.style, {
    border: "1px solid rgba(67,199,199,.35)",
    background: "rgba(18,16,14,.96)",
    padding: "16px",
    marginBottom: "24px",
  });

  const title = document.createElement("h2");
  title.textContent = "Duo-Zeiten & nur Einzel";
  Object.assign(title.style, {
    color: "#f4ead8",
    fontFamily: "Georgia, serif",
    fontSize: "20px",
    margin: "0 0 6px",
  });
  const intro = document.createElement("p");
  intro.textContent = "Du kannst nachträglich einen Teil eines Duo-Zeitfensters als nur Einzel markieren. Der Bereich wird automatisch abgetrennt und kann später wieder auf Duo gestellt werden.";
  Object.assign(intro.style, {
    color: "rgba(244,234,216,.55)",
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0 0 12px",
  });
  const legend = document.createElement("div");
  legend.style.display = "flex";
  legend.style.flexWrap = "wrap";
  legend.style.gap = "14px";
  legend.style.marginBottom = "14px";
  legend.append(makeDot("#d8b676", "Duo & Einzel"), makeDot("#43c7c7", "nur Einzel"));
  panel.append(title, intro, legend);

  try {
    const slots = await loadSlots();
    if (!slots.length) {
      const empty = document.createElement("p");
      empty.textContent = "Aktuell gibt es keine zukünftigen Duo-Zeitfenster.";
      empty.style.color = "rgba(244,234,216,.5)";
      empty.style.fontSize = "12px";
      panel.appendChild(empty);
      return;
    }

    const groups = new Map<string, ModeSlot[]>();
    for (const slot of slots) groups.set(dayKey(slot.starts_at), [...(groups.get(dayKey(slot.starts_at)) ?? []), slot]);

    for (const daySlots of groups.values()) {
      const dayBox = document.createElement("div");
      dayBox.style.borderTop = "1px solid rgba(216,182,118,.16)";
      dayBox.style.paddingTop = "12px";
      dayBox.style.marginTop = "12px";

      const heading = document.createElement("div");
      heading.textContent = dateLabel(daySlots[0].starts_at);
      heading.style.color = "#e5c98f";
      heading.style.fontSize = "12px";
      heading.style.textTransform = "uppercase";
      heading.style.letterSpacing = ".15em";
      heading.style.marginBottom = "8px";
      dayBox.appendChild(heading);

      const min = Math.min(...daySlots.map((slot) => new Date(slot.starts_at).getTime()));
      const max = Math.max(...daySlots.map((slot) => new Date(slot.ends_at).getTime()));
      const bar = document.createElement("div");
      bar.style.height = "14px";
      bar.style.position = "relative";
      bar.style.background = "rgba(244,234,216,.1)";
      bar.style.marginBottom = "10px";
      for (const slot of daySlots) {
        const segment = document.createElement("span");
        const start = new Date(slot.starts_at).getTime();
        const end = new Date(slot.ends_at).getTime();
        segment.style.position = "absolute";
        segment.style.left = `${((start - min) / Math.max(1, max - min)) * 100}%`;
        segment.style.width = `${((end - start) / Math.max(1, max - min)) * 100}%`;
        segment.style.height = "100%";
        segment.style.background = !slot.is_duo && slot.duo_partner ? "#43c7c7" : "#d8b676";
        segment.title = `${timeLabel(slot.starts_at)}–${timeLabel(slot.ends_at)} ${slot.is_duo ? "Duo & Einzel" : "nur Einzel"}`;
        bar.appendChild(segment);
      }
      dayBox.appendChild(bar);

      for (const slot of daySlots) {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.flexWrap = "wrap";
        row.style.alignItems = "center";
        row.style.justifyContent = "space-between";
        row.style.gap = "10px";
        row.style.padding = "9px 0";
        row.style.borderTop = "1px solid rgba(244,234,216,.07)";

        const label = document.createElement("div");
        const mode = !slot.is_duo && slot.duo_partner ? "NUR EINZEL" : "DUO & EINZEL";
        label.innerHTML = `<strong style="color:#f4ead8;font-size:14px">${timeLabel(slot.starts_at)} – ${timeLabel(slot.ends_at)}</strong><br><span style="color:${slot.is_duo ? "#d8b676" : "#43c7c7"};font-size:10px;letter-spacing:.14em">${mode} · ${slot.duo_partner ?? ""}</span>`;

        const action = document.createElement("button");
        action.type = "button";
        if (slot.is_duo) {
          action.textContent = "Teilbereich nur Einzel";
          buttonStyle(action, true);
          action.onclick = async () => {
            const from = window.prompt("Ab welcher Uhrzeit nur Einzel? (HH:MM)", timeLabel(slot.starts_at));
            if (!from) return;
            const to = window.prompt("Bis zu welcher Uhrzeit nur Einzel? (HH:MM)", timeLabel(slot.ends_at));
            if (!to) return;
            try {
              action.disabled = true;
              action.textContent = "Wird gespeichert…";
              const { markDuoRangeSingleOnly } = await import("@/lib/calendar-booking-mode.functions");
              const result = await markDuoRangeSingleOnly({
                data: {
                  slot_id: slot.id,
                  starts_at: wallTimeIso(slot.starts_at, from),
                  ends_at: wallTimeIso(slot.starts_at, to),
                },
              });
              window.alert(result.message);
              window.location.reload();
            } catch (error) {
              window.alert(error instanceof Error ? error.message : "Der Bereich konnte nicht gespeichert werden.");
              action.disabled = false;
              action.textContent = "Teilbereich nur Einzel";
            }
          };
        } else {
          action.textContent = "Wieder Duo anbieten";
          buttonStyle(action, false);
          action.onclick = async () => {
            if (!window.confirm(`${timeLabel(slot.starts_at)}–${timeLabel(slot.ends_at)} wieder als Duo und Einzel anbieten?`)) return;
            try {
              action.disabled = true;
              action.textContent = "Wird gespeichert…";
              const { restoreSlotDuoMode } = await import("@/lib/calendar-booking-mode.functions");
              const result = await restoreSlotDuoMode({ data: { slot_id: slot.id } });
              window.alert(result.message);
              window.location.reload();
            } catch (error) {
              window.alert(error instanceof Error ? error.message : "Der Bereich konnte nicht geändert werden.");
              action.disabled = false;
              action.textContent = "Wieder Duo anbieten";
            }
          };
        }
        row.append(label, action);
        dayBox.appendChild(row);
      }
      panel.appendChild(dayBox);
    }
  } catch (error) {
    const message = document.createElement("p");
    message.textContent = error instanceof Error ? error.message : "Duo-Zeiten konnten nicht geladen werden.";
    message.style.color = "#d8a0a8";
    panel.appendChild(message);
  }
}

export function installAdminDuoSingleOnlyEditor() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const run = () => void renderEditor();
  queueMicrotask(run);
  window.setTimeout(run, 250);
  window.setTimeout(run, 1000);
  window.addEventListener("pageshow", run);
  window.addEventListener("popstate", run);
}
