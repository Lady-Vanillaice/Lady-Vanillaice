import fs from "node:fs";

const bookingPath = "src/lib/public-booking.functions.ts";
let source = fs.readFileSync(bookingPath, "utf8");

// listUpcomingSlots originally loads bookings only for currently-open slot ids.
// Manual/hidden/previously-booked source slots can therefore disappear from the
// public free-time calculation even though the real appointment still exists.
source = source.replace(
  '  const bookingsBySlot = new Map<string, BusyRange[]>();',
  '  const bookingsBySlot = new Map<string, BusyRange[]>();\n  const dayWideBookings: Array<{ dayKey: string; range: BusyRange }> = [];',
);

source = source.replace(
  '      .in("slot_id", slotIds)\n      .in("status", ["pending", "waiting_deposit", "confirmed"])',
  '      .gte("requested_start", rangeStart.toISOString())\n      .lt("requested_start", rangeEnd.toISOString())\n      .in("status", ["pending", "waiting_deposit", "confirmed"])',
);

const oldMapInsert = `      const list = bookingsBySlot.get(b.slot_id) ?? [];\n      list.push(range);\n      bookingsBySlot.set(b.slot_id, list);`;
const newMapInsert = `      const list = bookingsBySlot.get(b.slot_id) ?? [];\n      list.push(range);\n      bookingsBySlot.set(b.slot_id, list);\n      const bookingDayKey = new Intl.DateTimeFormat("sv-SE", {\n        timeZone: "Europe/Berlin",\n        year: "numeric",\n        month: "2-digit",\n        day: "2-digit",\n      }).format(new Date(b.requested_start));\n      dayWideBookings.push({ dayKey: bookingDayKey, range });`;
if (!source.includes("dayWideBookings.push") && source.includes(oldMapInsert)) {
  source = source.replace(oldMapInsert, newMapInsert);
}

const oldBusy = '    const busy = bookingsBySlot.get(slot.id) ?? [];';
const newBusy = `    const berlinDayKey = (value: string) => new Intl.DateTimeFormat("sv-SE", {\n      timeZone: "Europe/Berlin",\n      year: "numeric",\n      month: "2-digit",\n      day: "2-digit",\n    }).format(new Date(value));\n    const slotDayKey = berlinDayKey(slot.starts_at);\n    // Use every real appointment on this Berlin calendar day, regardless of\n    // which availability-slot row it was originally attached to.\n    const busy = dayWideBookings\n      .filter((entry) => entry.dayKey === slotDayKey)\n      .map((entry) => entry.range);`;
if (source.includes(oldBusy)) {
  source = source.replace(oldBusy, newBusy);
}

if (!source.includes("dayWideBookings.push")) {
  throw new Error("Day-wide booking collection patch could not be applied");
}
if (!source.includes("const busy = dayWideBookings")) {
  throw new Error("Day-wide booking lookup patch could not be applied");
}
// The preceding fix-duo-single-calendar script already derives free_windows and
// day-level windows. Assert that those generated structures are present rather
// than trying to duplicate them here.
if (!source.includes("free_windows: freeWindows")) {
  throw new Error("Real free-window calculation from duo patch is missing");
}
if (!source.includes("const freeDayWindows = daySlots.flatMap")) {
  throw new Error("Day free-window aggregation from duo patch is missing");
}

fs.writeFileSync(bookingPath, source);

const calendarPath = "src/routes/kalender.tsx";
let calendar = fs.readFileSync(calendarPath, "utf8");
const oldWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}`;
const newWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}{" — "}{window.is_duo ? tr("Duo verfügbar", "Duo available") : tr("Nur Einzel verfügbar", "Single only available")}`;
if (!calendar.includes("window.is_duo ? tr(\"Duo verfügbar\"")) {
  calendar = calendar.replace(oldWindowLine, newWindowLine);
}
if (!calendar.includes("window.is_duo ? tr(\"Duo verfügbar\"")) {
  throw new Error("Public free-window label patch could not be applied");
}
fs.writeFileSync(calendarPath, calendar);
