import { supabase } from "@/integrations/supabase/client";
import { saveCanvasAsPng } from "./core";

type SlotRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  is_duo: boolean;
  is_content_shoot: boolean;
  duo_partner: string | null;
  buffer_minutes: number | null;
};

type BookingRow = {
  slot_id: string | null;
  requested_start: string | null;
  duration_minutes: number | null;
  status: "confirmed" | "waiting_deposit";
  updated_at: string | null;
};

type BusyRange = { start: number; end: number; kind: "booked" | "reserved" };

type ExportMode =
  | { type: "month"; monthKey: string }
  | { type: "all" };

const TZ = "Europe/Berlin";
const COLORS = {
  background: "#0b0b0c",
  card: "#12100e",
  gold: "#d8b676",
  softGold: "#8f7448",
  vanilla: "#f4ead8",
  muted: "#a99d8d",
  booked: "#7f2438",
  reserved: "rgba(244,234,216,0.38)",
  unavailable: "rgba(80,76,70,0.58)",
};

function dateParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
  return { dayKey: parts, monthKey: parts.slice(0, 7) };
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

function activeReservation(booking: BookingRow) {
  if (booking.status !== "waiting_deposit") return true;
  if (!booking.updated_at) return true;
  return new Date(booking.updated_at).getTime() + 24 * 60 * 60_000 > Date.now();
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
  const crownY = 108;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 5;
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
  ctx.moveTo(centerX - 46, crownY + 38);
  ctx.lineTo(centerX + 46, crownY + 38);
  ctx.stroke();
}

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  slots: SlotRow[],
  bookings: BookingRow[],
  y: number,
  width: number,
) {
  const left = 180;
  const right = width - 82;
  const barWidth = right - left;
  const start = Math.min(
    ...slots.map((slot) => new Date(slot.starts_at).getTime()),
    ...bookings.flatMap((booking) => booking.requested_start ? [new Date(booking.requested_start).getTime()] : []),
  );
  const end = Math.max(
    ...slots.map((slot) => new Date(slot.ends_at).getTime()),
    ...bookings.flatMap((booking) => booking.requested_start && booking.duration_minutes
      ? [new Date(booking.requested_start).getTime() + booking.duration_minutes * 60_000]
      : []),
  );
  const span = Math.max(1, end - start);
  const pctX = (time: number) => left + ((time - start) / span) * barWidth;

  ctx.fillStyle = COLORS.unavailable;
  ctx.fillRect(left, y, barWidth, 38);

  for (const slot of slots) {
    const x = pctX(new Date(slot.starts_at).getTime());
    const slotEnd = pctX(new Date(slot.ends_at).getTime());
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x, y, Math.max(2, slotEnd - x), 38);
  }

  const bufferBySlot = new Map(slots.map((slot) => [slot.id, slot.buffer_minutes ?? 30]));
  const busy = mergeBusy(bookings.flatMap((booking) => {
    if (!booking.requested_start || !booking.duration_minutes || !activeReservation(booking)) return [];
    const bookingStart = new Date(booking.requested_start).getTime();
    const buffer = (booking.slot_id ? bufferBySlot.get(booking.slot_id) ?? 30 : 30) * 60_000;
    return [{
      start: Math.max(start, bookingStart - buffer),
      end: Math.min(end, bookingStart + booking.duration_minutes * 60_000 + buffer),
      kind: booking.status === "confirmed" ? "booked" as const : "reserved" as const,
    }];
  }));

  for (const range of busy) {
    const x = pctX(range.start);
    const rangeEnd = pctX(range.end);
    ctx.fillStyle = range.kind === "booked" ? COLORS.booked : COLORS.reserved;
    ctx.fillRect(x, y, Math.max(3, rangeEnd - x), 38);
  }

  const firstHour = new Date(start);
  firstHour.setMinutes(0, 0, 0);
  if (firstHour.getTime() < start) firstHour.setHours(firstHour.getHours() + 1);
  for (let tick = firstHour.getTime(); tick <= end; tick += 60 * 60_000) {
    const x = pctX(tick);
    ctx.fillStyle = "rgba(244,234,216,0.12)";
    ctx.fillRect(x, y, 1, 38);
  }

  ctx.fillStyle = COLORS.vanilla;
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = "left";
  ctx.fillText(timeLabel(start), left, y + 62);
  ctx.textAlign = "right";
  ctx.fillText(timeLabel(end), right, y + 62);
}

async function loadData(mode: ExportMode) {
  const nowIso = new Date().toISOString();
  const { data: slotRows, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, location, is_duo, is_content_shoot, duo_partner, buffer_minutes")
    .eq("status", "open")
    .eq("is_hidden", false)
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: true });
  if (error) throw error;

  const allSlots = (slotRows ?? []) as SlotRow[];
  const slots = mode.type === "month"
    ? allSlots.filter((slot) => dateParts(slot.starts_at).monthKey === mode.monthKey)
    : allSlots;
  if (slots.length === 0) throw new Error("Für diese Auswahl gibt es keine offenen Termine.");

  const dayKeys = new Set(slots.map((slot) => dateParts(slot.starts_at).dayKey));
  const relatedSlots = allSlots.filter((slot) => dayKeys.has(dateParts(slot.starts_at).dayKey));
  const slotIds = relatedSlots.map((slot) => slot.id);
  const { data: bookingRows, error: bookingError } = await supabase
    .from("bookings")
    .select("slot_id, requested_start, duration_minutes, status, updated_at")
    .in("slot_id", slotIds)
    .in("status", ["confirmed", "waiting_deposit"])
    .not("requested_start", "is", null)
    .not("duration_minutes", "is", null);
  if (bookingError) throw bookingError;

  return { slots, timelineSlots: relatedSlots, bookings: (bookingRows ?? []) as BookingRow[] };
}

export async function exportCalendarImage(mode: ExportMode) {
  const { slots, timelineSlots, bookings } = await loadData(mode);
  const width = 1080;
  const outer = 52;
  const headerHeight = 270;
  const legendHeight = 72;
  const timelineRowHeight = 102;
  const appointmentRowHeight = 150;
  const monthHeaderHeight = 80;
  const footerHeight = 100;

  const slotsByDay = new Map<string, SlotRow[]>();
  for (const slot of timelineSlots) {
    const key = dateParts(slot.starts_at).dayKey;
    slotsByDay.set(key, [...(slotsByDay.get(key) ?? []), slot]);
  }
  const dayEntries = [...slotsByDay.entries()].sort(([a], [b]) => a.localeCompare(b));

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
  ctx.fillText("LADY VANILLA ICE", width / 2, 205);
  ctx.fillStyle = COLORS.vanilla;
  ctx.font = '22px Arial, sans-serif';
  ctx.fillText("F R E I E   T E R M I N E", width / 2, 244);

  let y = headerHeight;
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText("BELEGUNG DER TAGE", 82, y + 24);
  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText("● verfügbar", 82, y + 54);
  ctx.fillStyle = COLORS.booked;
  ctx.fillText("● belegt", 218, y + 54);
  ctx.fillStyle = COLORS.vanilla;
  ctx.globalAlpha = 0.52;
  ctx.fillText("● reserviert", 320, y + 54);
  ctx.globalAlpha = 1;
  y += legendHeight;

  for (const [dayKey, daySlots] of dayEntries) {
    const dayBookings = bookings.filter((booking) => booking.requested_start && dateParts(booking.requested_start).dayKey === dayKey);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.vanilla;
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText(dayShortLabel(daySlots[0].starts_at), 82, y + 28);
    drawTimeline(ctx, daySlots, dayBookings, y + 12, width);
    y += timelineRowHeight;
  }

  for (const [, monthSlots] of months) {
    ctx.fillStyle = "rgba(216,182,118,0.08)";
    ctx.fillRect(outer + 28, y, width - (outer + 28) * 2, monthHeaderHeight - 10);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 36px Georgia, "Times New Roman", serif';
    ctx.fillText(monthLabel(monthSlots[0].starts_at).toLocaleUpperCase("de-DE"), width / 2, y + 48);
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

  const suffix = mode.type === "month" ? mode.monthKey : "alle-offenen-termine";
  await saveCanvasAsPng(canvas, `lady-vanilla-ice-kalender-${suffix}.png`);
}
