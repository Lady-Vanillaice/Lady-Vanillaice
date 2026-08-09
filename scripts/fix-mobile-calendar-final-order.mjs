import { readFileSync } from "node:fs";

const calendarPath = "src/routes/kalender.tsx";
const calendar = readFileSync(calendarPath, "utf8");

const bookingMarker = "{/* Booking panel */}";
const firstTitle = 'tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")';
const bookingIndex = calendar.indexOf(bookingMarker);
const infoIndex = calendar.indexOf(firstTitle);

if (bookingIndex < 0 || infoIndex < 0) {
  throw new Error("Booking panel or calendar information boxes could not be located.");
}
if (infoIndex < bookingIndex) {
  throw new Error("Calendar information boxes are before the booking request.");
}

// This is intentionally the final layout step of prebuild. It removes the
// two-column desktop/mobile split so the visible order is identical everywhere:
// calendar -> booking request -> information boxes.
await import("./make-calendar-booking-first-all-devices.mjs");

console.log("Final calendar layout verified and forced on all devices.");
