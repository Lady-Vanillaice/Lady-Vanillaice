import { readFileSync } from "node:fs";

const calendarPath = "src/routes/kalender.tsx";
const calendar = readFileSync(calendarPath, "utf8");

const bookingMarker = "{/* Booking panel */}";
const firstTitle = 'tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")';
const bookingIndex = calendar.indexOf(bookingMarker);
const firstInfoIndex = calendar.indexOf(firstTitle);

if (bookingIndex < 0 || firstInfoIndex < 0) {
  throw new Error("Booking panel or calendar information boxes could not be located.");
}

if (firstInfoIndex < bookingIndex) {
  throw new Error("Calendar information boxes are before the booking request. Build aborted instead of silently shipping the wrong order.");
}

console.log("Verified calendar source order: booking request before all information boxes.");
