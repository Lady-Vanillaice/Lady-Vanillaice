import fs from "node:fs";

const bookingPath = "src/lib/public-booking.functions.ts";
let source = fs.readFileSync(bookingPath, "utf8");

// Load appointments by their real requested time, not only by currently-open
// availability slot ids. This includes bookings whose original slot is hidden,
// held, booked, moved or otherwise no longer part of the open-slot list.
source = source.replace(
  '      .in("slot_id", slotIds)\n      .in("status", ["pending", "waiting_deposit", "confirmed"])',
  '      .gte("requested_start", rangeStart.toISOString())\n      .lt("requested_start", rangeEnd.toISOString())\n      .in("status", ["pending", "waiting_deposit", "confirmed"])',
);

const oldBusy = '    const busy = bookingsBySlot.get(slot.id) ?? [];';
const newBusy = `    const berlinDayKey = (value: string) => new Intl.DateTimeFormat("sv-SE", {\n      timeZone: "Europe/Berlin",\n      year: "numeric",\n      month: "2-digit",\n      day: "2-digit",\n    }).format(new Date(value));\n    const slotDayKey = berlinDayKey(slot.starts_at);\n    // bookingsBySlot now contains every appointment in the requested date range.\n    // Flatten all source-slot buckets and keep only appointments on this Berlin day.\n    const busy = [...bookingsBySlot.values()]\n      .flat()\n      .filter((range) => berlinDayKey(range.starts_at) === slotDayKey);`;
if (source.includes(oldBusy)) {
  source = source.replace(oldBusy, newBusy);
}

if (!source.includes('gte("requested_start", rangeStart.toISOString())')) {
  throw new Error("Day-wide booking query patch could not be applied");
}
if (!source.includes("const busy = [...bookingsBySlot.values()]")) {
  throw new Error("Day-wide booking lookup patch could not be applied");
}
// fix-duo-single-calendar runs before this script and already creates the real
// free_windows plus the day-level windows array used by the public card.
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
