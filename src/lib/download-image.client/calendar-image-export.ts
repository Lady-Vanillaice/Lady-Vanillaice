import { supabase } from "@/integrations/supabase/client";
import { getSlotAvailability } from "@/lib/public-booking.functions";
import { saveCanvasAsPng } from "./core";

type SlotRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  is_duo: boolean;
  is_content_shoot: boolean;
  duo_partner: string | null;
};

type AvailabilityRange = {
  start: string;
  end: string;
  kind?: "booked" | "reserved" | "unavailable";
  buffer_minutes?: number;
};

type AvailabilityData = {
  starts_at: string;
  ends_at: string;
  buffer_minutes: number;
  busy: AvailabilityRange[];
};

type BusyRange = {
  start: number;
  end: number;
  kind: "booked" | "reserved" | "unavailable";
};

export type CalendarExportMode =
  | { type: "month"; monthKey: string }
  | { type: "year"; year: string }
  | { type: "all" };

const TZ = "Europe/Berlin";
const COLORS = {
  background: "#0b0b0c",
  card: "#12100e",
  gold: "#d8b676",
  softGold: "#8f7448",
  vanilla: "#f4ead8",
  muted: "#a99d8d",
  available: "rgba(216,182,118,0.50)",
  booked: "rgba(127,36,56,0.60)",
  reserved: "rgba(244,234,216,0.35)",
  unavailable: "rgba(62,59,55,0.80)",
  tick: "rgba(244,234,216,0.10)",
};

function dateParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
  return { dayKey: parts, monthKey: parts.slice(0, 7), year: parts.slice(0, 4) };
}

function dateLabel(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function dayShortLabel(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function monthLabel(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function timeLabel(value: string | Date | number) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function studioDetails(location: string) {
  const normalized = location.trim();
  const lower = normalized.toLocaleLowerCase("de-DE");
  if (lower.startsWith("studio60")) {
    return { studio: "Studio60", address: "Gärtnerstraße 60, 80992 München" };
  }
  if (lower.startsWith("studio elegance")) {
    return { studio: "Studio Elegance", address: "Frankfurter Ring 139, 80807 München" };
  }
  const comma = normalized.indexOf(",");
  return comma > 0
    ? { studio: normalized.slice(0, comma).trim(), address: normalized.slice(comma + 1).trim() }
    : { studio: normalized, address: "" };
}

function mergeBusy(ranges: BusyRange[]) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: BusyRange[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && previous.kind === range.kind && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function drawCrown(ctx: CanvasRenderingContext2D, centerX: number) {
  const crownY = 100;
  ctx.strokeStyle = COLORS.gold;
  // Core's legacy crown adjustment only targets lineWidth 5. Using 4 keeps
  // this new export header exactly where it is drawn.
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(centerX - 48, crownY + 20);
  ctx.lineTo(centerX - 58, crownY - 28);
  ctx.lineTo(centerX - 22, crownY - 2);
  ctx.lineTo(centerX, crownY - 40);
  ctx.lineTo(centerX + 22, crownY - 2);
  ctx.lineTo(centerX + 58, crownY - 28);
  ctx.lineTo(centerX + 48, crownY + 20);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX - 46, crownY + 36);
  ctx.lineTo(centerX + 46, crownY + 36);
  ctx.stroke();
}

function drawLegendItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: string,
) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y - 5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.muted;
  ctx.font = '15px Arial, sans-serif';
  ctx.textAlign = "left";
  ctx.fillText(label, x + 17, y);
}

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  availability: AvailabilityData,
  y: number,
  width: number,
) {
  const left = 180;
  const right = width - 82;
  const barWidth = right - left;
  const start = new Date(availability.starts_at).getTime();
  const end = new Date(availability.ends_at).getTime();
  const span = Math.max(1, end - start);
  const pctX = (time: number) => left + ((time - start) / span) * barWidth;

  // Identisch zum öffentlichen Kalender: Die gesamte freigegebene Tagesbreite
  // ist verfügbar; bestätigte und reservierte Bereiche werden darübergelegt.
  ctx.fillStyle = COLORS.available;
  ctx.fillRect(left, y, barWidth, 38);

  const busy = mergeBusy((availability.busy ?? []).flatMap((range) => {
    const rawStart = new Date(range.start).getTime();
    const rawEnd = new Date(range.end).getTime();
    const buffer = (range.buffer_minutes ?? availability.buffer_minutes ?? 30) * 60_000;
    const kind = range.kind ?? "booked";
    return [{
      start: Math.max(start, rawStart - buffer),
      end: Math.min(end, rawEnd + buffer),
      kind,
    }];
  }).filter((range) => range.end > range.start));

  for (const range of busy) {
    const x = pctX(range.start);
    const rangeEnd = pctX(range.end);
    ctx.fillStyle = range.kind === "booked"
      ? COLORS.booked
      : range.kind === "reserved"
      ? COLORS.reserved
      : COLORS.unavailable;
    ctx.fillRect(x, y, Math.max(3, rangeEnd - x), 38);
  }

  const ticks: number[] = [];
  const firstHour = new Date(start);
  firstHour.setMinutes(0, 0, 0);
  if (firstHour.getTime() < start) firstHour.setHours(firstHour.getHours() + 1);
  for (let tick = firstHour.getTime(); tick <= end; tick += 60 * 60_000) ticks.push(tick);

  for (const tick of ticks) {
    const x = pctX(tick);
    ctx.fillStyle = COLORS.tick;
    ctx.fillRect(x, y, 1, 38);
  }

  const totalHours = span / 3_600_000;
  const labelStep = totalHours > 12 ? 3 : totalHours > 6 ? 2 : 1;
  const labelTicks = ticks.filter((tick) => new Date(tick).getHours() % labelStep === 0);

  ctx.fillStyle = COLORS.muted;
  ctx.font = '13px Arial, sans-serif';
  for (const tick of labelTicks) {
    const x = pctX(tick);
    const nearLeft = x - left < 20;
    const nearRight = right - x < 20;
    ctx.textAlign = nearLeft ? "left" : nearRight ? "right" : "center";
    ctx.fillText(timeLabel(tick), x, y + 62);
  }

  if (!labelTicks.includes(start)) {
    ctx.textAlign = "left";
    ctx.fillText(timeLabel(start), left, y + 62);
  }
  if (!labelTicks.includes(end)) {
    ctx.textAlign = "right";
    ctx.fillText(timeLabel(end), right, y + 62);
  }
}

async function loadData(mode: CalendarExportMode) {
  const nowIso = new Date().toISOString();
  const { data: slotRows, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, location, is_duo, is_content_shoot, duo_partner")
    .eq("status", "open")
    .eq("is_hidden", false)
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: true });
  if (error) throw error;

  const allSlots = (slotRows ?? []) as SlotRow[];
  const slots = allSlots.filter((slot) => {
    const parts = dateParts(slot.starts_at);
    if (mode.type === "month") return parts.monthKey === mode.monthKey;
    if (mode.type === "year") return parts.year === mode.year;
    return true;
  });
  if (slots.length === 0) throw new Error("Für diese Auswahl gibt es keine offenen Termine.");

  const representativeByDay = new Map<string, SlotRow>();
  for (const slot of slots) {
    const key = dateParts(slot.starts_at).dayKey;
    if (!representativeByDay.has(key)) representativeByDay.set(key, slot);
  }

  const availabilityEntries = await Promise.all(
    [...representativeByDay.entries()].map(async ([dayKey, slot]) => {
      const availability = await getSlotAvailability({ data: { slot_id: slot.id } });
      return [dayKey, availability as AvailabilityData | null] as const;
    }),
  );
  const availabilityByDay = new Map(
    availabilityEntries.filter((entry): entry is readonly [string, AvailabilityData] => Boolean(entry[1])),
  );

  return { slots, availabilityByDay };
}

export async function exportCalendarImage(mode: CalendarExportMode) {
  const { slots, availabilityByDay } = await loadData(mode);
  const width = 1080;
  const outer = 52;
  const headerHeight = 285;
  const legendHeight = 78;
  const timelineRowHeight = 104;
  const appointmentRowHeight = 150;
  const monthHeaderHeight = 86;
  const footerHeight = 100;

  const dayEntries = [...availabilityByDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  const monthGroups = new Map<string, SlotRow[]>();
  for (const slot of slots) {
    const key = dateParts(slot.starts_at).monthKey;
    monthGroups.set(key, [...(monthGroups.get(key) ?? []), slot]);
  }
  const months = [...monthGroups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const appointmentHeight = months.reduce(
    (total, [, monthSlots]) => total + monthHeaderHeight + monthSlots.length * appointmentRowHeight,
    0,
  );
  const height = headerHeight + legendHeight + dayEntries.length * timelineRowHeight + appointmentHeight + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Das Bild konnte nicht erstellt werden.");

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(outer, outer, width - outer * 2, height - outer * 2);
  ctx.strokeStyle = COLORS.softGold;
  ctx.lineWidth = 1;
  ctx.strokeRect(outer + 13, outer + 13, width - (outer + 13) * 2, height - (outer + 13) * 2);

  drawCrown(ctx, width / 2);
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.gold;
  ctx.font = '44px Georgia, "Times New Roman", serif';
  ctx.fillText("LADY VANILLA ICE", width / 2, 207);
  ctx.fillStyle = COLORS.vanilla;
  ctx.font = '22px Arial, sans-serif';
  ctx.fillText("F R E I E   T E R M I N E", width / 2, 251);

  let y = headerHeight;
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText("BELEGUNG DER TAGE", 82, y + 24);
  drawLegendItem(ctx, 90, y + 58, COLORS.available, "verfügbar");
  drawLegendItem(ctx, 226, y + 58, COLORS.booked, "belegt");
  drawLegendItem(ctx, 330, y + 58, COLORS.reserved, "reserviert");
  y += legendHeight;

  for (const [dayKey, availability] of dayEntries) {
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.vanilla;
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText(dayShortLabel(`${dayKey}T12:00:00`), 82, y + 28);
    drawTimeline(ctx, availability, y + 12, width);
    y += timelineRowHeight;
  }

  for (const [, monthSlots] of months) {
    ctx.fillStyle = "rgba(216,182,118,0.08)";
    ctx.fillRect(outer + 28, y, width - (outer + 28) * 2, monthHeaderHeight - 10);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 38px Georgia, "Times New Roman", serif';
    ctx.fillText(monthLabel(monthSlots[0].starts_at).toLocaleUpperCase("de-DE"), width / 2, y + 53);
    y += monthHeaderHeight;

    for (const slot of monthSlots) {
      const cardX = outer + 28;
      const cardWidth = width - cardX * 2;
      ctx.fillStyle = COLORS.card;
      ctx.fillRect(cardX, y, cardWidth, appointmentRowHeight - 18);
      ctx.strokeStyle = "rgba(216,182,118,0.35)";
      ctx.strokeRect(cardX, y, cardWidth, appointmentRowHeight - 18);

      ctx.textAlign = "left";
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 25px Arial, sans-serif';
      ctx.fillText(dateLabel(slot.starts_at), cardX + 30, y + 42);
      ctx.fillStyle = COLORS.vanilla;
      ctx.font = '34px Georgia, "Times New Roman", serif';
      ctx.fillText(`${timeLabel(slot.starts_at)} – ${timeLabel(slot.ends_at)} Uhr`, cardX + 30, y + 88);

      const details = studioDetails(slot.location);
      ctx.textAlign = "right";
      ctx.fillStyle = COLORS.vanilla;
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText(details.studio, cardX + cardWidth - 30, y + 38);
      if (details.address) {
        ctx.fillStyle = COLORS.muted;
        ctx.font = '17px Arial, sans-serif';
        ctx.fillText(details.address, cardX + cardWidth - 30, y + 66);
      }
      const tag = [
        slot.is_duo ? `DUO${slot.duo_partner ? ` · ${slot.duo_partner}` : ""}` : "",
        slot.is_content_shoot ? "CONTENT" : "",
      ].filter(Boolean).join(" · ");
      if (tag) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillText(tag, cardX + cardWidth - 30, y + 100);
      }
      y += appointmentRowHeight;
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.softGold;
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText("BUCHUNGSANFRAGE · LADY-VANILLAICE.COM", width / 2, height - 66);

  const suffix = mode.type === "month"
    ? mode.monthKey
    : mode.type === "year"
    ? mode.year
    : "alle-offenen-termine";
  await saveCanvasAsPng(canvas, `lady-vanilla-ice-kalender-${suffix}.png`);
}
