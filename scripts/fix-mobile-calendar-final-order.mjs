import { readFileSync, writeFileSync } from "node:fs";

const calendarPath = "src/routes/kalender.tsx";
let calendar = readFileSync(calendarPath, "utf8");

const bookingMarker = "          {/* Booking panel */}";
const firstTitle = 'tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")';
const thirdTitle = 'tr("Content-Dreh", "Content shoot")';

const bookingIndex = calendar.indexOf(bookingMarker);
const firstTitleIndex = calendar.indexOf(firstTitle);
const thirdTitleIndex = calendar.indexOf(thirdTitle, firstTitleIndex);

if (bookingIndex < 0 || firstTitleIndex < 0 || thirdTitleIndex < 0) {
  throw new Error("Booking panel or calendar info boxes could not be located.");
}

// Earlier prebuild steps move the three info boxes into the calendar column.
// Undo that transformation after every other calendar patch has run so the
// final DOM order is deterministic on all browsers:
// calendar -> booking request -> three info boxes.
if (firstTitleIndex < bookingIndex) {
  const firstBlockStart = calendar.lastIndexOf('\n            <div className="mt-', firstTitleIndex);
  const calendarColumnEnd = calendar.lastIndexOf("\n          </div>", bookingIndex);

  if (firstBlockStart < 0 || calendarColumnEnd < 0 || firstBlockStart >= calendarColumnEnd) {
    throw new Error("Calendar info source range could not be determined.");
  }

  const infoBlocks = calendar.slice(firstBlockStart, calendarColumnEnd);
  calendar = calendar.slice(0, firstBlockStart) + calendar.slice(calendarColumnEnd);

  const refreshedBookingIndex = calendar.indexOf(bookingMarker);
  const sectionEndMarker = "\n          </div>\n        </div>\n      </section>";
  const bookingColumnEnd = calendar.indexOf(sectionEndMarker, refreshedBookingIndex);

  if (bookingColumnEnd < 0) {
    throw new Error("Booking column end could not be located.");
  }

  calendar = calendar.slice(0, bookingColumnEnd) + infoBlocks + calendar.slice(bookingColumnEnd);
}

const finalBookingIndex = calendar.indexOf(bookingMarker);
const finalFirstTitleIndex = calendar.indexOf(firstTitle);
if (finalFirstTitleIndex < finalBookingIndex) {
  throw new Error("Calendar info boxes are still before the booking request.");
}

writeFileSync(calendarPath, calendar);
console.log("Final calendar DOM order fixed: calendar -> booking -> info boxes.");
