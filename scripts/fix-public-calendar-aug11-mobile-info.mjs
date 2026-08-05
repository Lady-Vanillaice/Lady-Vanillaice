import { readFileSync, writeFileSync } from "node:fs";

const bookingPath = "src/lib/public-booking.functions.ts";
let bookingText = readFileSync(bookingPath, "utf8");

const helperMarker = "function getBerlinCalendarDayBounds";
if (!bookingText.includes(helperMarker)) {
  bookingText = bookingText.replace(
    "const STEP_MINUTES = 15;\n",
    `const STEP_MINUTES = 15;\n\nfunction getBerlinOffsetMinutes(date: Date) {\n  const parts = new Intl.DateTimeFormat(\"en-CA\", {\n    timeZone: \"Europe/Berlin\",\n    year: \"numeric\",\n    month: \"2-digit\",\n    day: \"2-digit\",\n    hour: \"2-digit\",\n    minute: \"2-digit\",\n    second: \"2-digit\",\n    hourCycle: \"h23\",\n  }).formatToParts(date);\n  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);\n  const asUtc = Date.UTC(value(\"year\"), value(\"month\") - 1, value(\"day\"), value(\"hour\"), value(\"minute\"), value(\"second\"));\n  return (asUtc - date.getTime()) / 60_000;\n}\n\nfunction berlinMidnightToUtc(dateKey: string) {\n  const [year, month, day] = dateKey.split(\"-\").map(Number);\n  const wallMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);\n  const offsetMinutes = getBerlinOffsetMinutes(new Date(wallMidnight));\n  return new Date(wallMidnight - offsetMinutes * 60_000);\n}\n\nfunction getBerlinCalendarDayBounds(value: string | Date) {\n  const dateKey = new Intl.DateTimeFormat(\"sv-SE\", {\n    timeZone: \"Europe/Berlin\",\n    year: \"numeric\",\n    month: \"2-digit\",\n    day: \"2-digit\",\n  }).format(new Date(value));\n  const dayStart = berlinMidnightToUtc(dateKey);\n  const nextWallDate = new Date(Date.UTC(\n    Number(dateKey.slice(0, 4)),\n    Number(dateKey.slice(5, 7)) - 1,\n    Number(dateKey.slice(8, 10)) + 1,\n  ));\n  const nextKey = nextWallDate.toISOString().slice(0, 10);\n  return { dayStart, dayEnd: berlinMidnightToUtc(nextKey) };\n}\n`,
  );
}

bookingText = bookingText.replaceAll(
  `    const dayStart = new Date(slot.starts_at);\n    dayStart.setUTCHours(0, 0, 0, 0);\n    const dayEnd = new Date(dayStart);\n    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);`,
  `    const { dayStart, dayEnd } = getBerlinCalendarDayBounds(slot.starts_at);`,
);

const oldQuery = `    const daySlotIds = slotsForDay.map((s) => s.id);\n\n    const { data: bookings } = await supabaseAdmin\n      .from("bookings")\n      .select("slot_id, requested_start, duration_minutes, status, updated_at")\n      .in("slot_id", daySlotIds)\n      // A plain inquiry is not a reservation. Only a confirmed booking or a\n      // booking explicitly waiting for its deposit blocks the public timeline.\n      .in("status", ["waiting_deposit", "confirmed"])\n      .not("requested_start", "is", null)\n      .not("duration_minutes", "is", null);\n\n    const activeBookings = (bookings ?? []).filter((b) => isActiveBlockingBooking(b));`;

const newQuery = `    // The Terminplan is the source of truth for public occupancy. Read every\n    // confirmed/reserved appointment by its real start and duration instead of\n    // relying on the original availability slot, which may later be merged,\n    // moved or deleted. The lookback also captures appointments crossing midnight.\n    const bookingLookback = new Date(dayStart.getTime() - 48 * 60 * 60_000);\n\n    const { data: bookings } = await supabaseAdmin\n      .from("bookings")\n      .select("slot_id, requested_start, duration_minutes, status, updated_at")\n      .gte("requested_start", bookingLookback.toISOString())\n      .lt("requested_start", dayEnd.toISOString())\n      .in("status", ["waiting_deposit", "confirmed"])\n      .not("requested_start", "is", null)\n      .not("duration_minutes", "is", null);\n\n    const activeBookings = (bookings ?? []).filter((b) => {\n      if (!isActiveBlockingBooking(b) || !b.requested_start || !b.duration_minutes) return false;\n      const appointmentStart = new Date(b.requested_start).getTime();\n      const appointmentEnd = appointmentStart + b.duration_minutes * 60_000;\n      return appointmentStart < dayEnd.getTime() && appointmentEnd > dayStart.getTime();\n    });`;

if (bookingText.includes(oldQuery)) {
  bookingText = bookingText.replace(oldQuery, newQuery);
}

if (!bookingText.includes("const bookingLookback = new Date(dayStart.getTime()")) {
  throw new Error("Public appointment timeline patch could not be applied.");
}
if (!bookingText.includes(helperMarker)) {
  throw new Error("Berlin calendar-day handling could not be applied.");
}
writeFileSync(bookingPath, bookingText);

const calendarPath = "src/routes/kalender.tsx";
let calendarText = readFileSync(calendarPath, "utf8");
calendarText = calendarText.replace(
  '<div className="container-luxe grid lg:grid-cols-12 gap-10">',
  '<div className="container-luxe grid lg:grid-cols-12 gap-10 public-calendar-layout">',
);
calendarText = calendarText.replace(
  '<div className="lg:col-span-5">\n            <div className="bg-card border border-champagne/15 p-6 min-h-[300px]">',
  '<div className="lg:col-span-5 public-booking-stack">\n            <div className="bg-card border border-champagne/15 p-6 min-h-[300px] public-booking-card">',
);

if (!calendarText.includes("public-calendar-layout") || !calendarText.includes("public-booking-stack")) {
  throw new Error("Mobile calendar layout markers could not be applied.");
}
writeFileSync(calendarPath, calendarText);

const stylesPath = "src/styles.css";
let stylesText = readFileSync(stylesPath, "utf8");
const marker = "/* Stable mobile order for public calendar booking and its three information boxes. */";
if (!stylesText.includes(marker)) {
  stylesText += `\n\n${marker}\n@media (max-width: 1023px) {\n  .public-calendar-layout {\n    display: flex;\n    flex-direction: column;\n  }\n\n  .public-booking-stack {\n    display: flex;\n    flex-direction: column;\n  }\n\n  .public-booking-card {\n    order: -1;\n  }\n}\n`;
}
writeFileSync(stylesPath, stylesText);

console.log("All Terminplan appointments now drive the public timeline, including overnight bookings.");
