import { readFileSync, writeFileSync } from "node:fs";

const bookingPath = "src/lib/public-booking.functions.ts";
let bookingText = readFileSync(bookingPath, "utf8");

const oldQuery = `    const daySlotIds = slotsForDay.map((s) => s.id);\n\n    const { data: bookings } = await supabaseAdmin\n      .from("bookings")\n      .select("slot_id, requested_start, duration_minutes, status, updated_at")\n      .in("slot_id", daySlotIds)\n      // A plain inquiry is not a reservation. Only a confirmed booking or a\n      // booking explicitly waiting for its deposit blocks the public timeline.\n      .in("status", ["waiting_deposit", "confirmed"])\n      .not("requested_start", "is", null)\n      .not("duration_minutes", "is", null);\n\n    const activeBookings = (bookings ?? []).filter((b) => isActiveBlockingBooking(b));`;

const newQuery = `    // Read appointments by their actual time instead of only by the original\n    // availability slot. This keeps manually entered or moved appointments\n    // visible after slots have been merged, replaced or deleted.\n    const bookingLookback = new Date(dayStart.getTime() - 24 * 60 * 60_000);\n\n    const { data: bookings } = await supabaseAdmin\n      .from("bookings")\n      .select("slot_id, requested_start, duration_minutes, status, updated_at")\n      .gte("requested_start", bookingLookback.toISOString())\n      .lt("requested_start", dayEnd.toISOString())\n      // A plain inquiry is not a reservation. Only a confirmed booking or a\n      // booking explicitly waiting for its deposit blocks the public timeline.\n      .in("status", ["waiting_deposit", "confirmed"])\n      .not("requested_start", "is", null)\n      .not("duration_minutes", "is", null);\n\n    const activeBookings = (bookings ?? []).filter((b) => {\n      if (!isActiveBlockingBooking(b) || !b.requested_start || !b.duration_minutes) return false;\n      const appointmentStart = new Date(b.requested_start).getTime();\n      const appointmentEnd = appointmentStart + b.duration_minutes * 60_000;\n      return appointmentStart < dayEnd.getTime() && appointmentEnd > dayStart.getTime();\n    });`;

if (bookingText.includes(oldQuery)) {
  bookingText = bookingText.replace(oldQuery, newQuery);
}

if (!bookingText.includes("const bookingLookback = new Date(dayStart.getTime()")) {
  throw new Error("Public appointment timeline patch could not be applied.");
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

console.log("Public appointments and mobile calendar information order fixed.");
