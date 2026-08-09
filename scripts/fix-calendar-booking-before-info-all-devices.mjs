import { readFileSync, writeFileSync } from "node:fs";

const calendarPath = "src/routes/kalender.tsx";
let calendar = readFileSync(calendarPath, "utf8");

function findMatchingDiv(source, start) {
  const tokenRe = /<div\b[^>]*>|<\/div>/g;
  tokenRe.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tokenRe.exec(source))) {
    if (match.index === start || depth > 0) {
      if (match[0].startsWith("</div")) depth -= 1;
      else depth += 1;
      if (depth === 0) return tokenRe.lastIndex;
    }
  }
  return -1;
}

const bookingMarker = "          {/* Booking panel */}";
const firstTitle = 'tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")';
const firstTitleIndex = calendar.indexOf(firstTitle);
const bookingIndex = calendar.indexOf(bookingMarker);

if (firstTitleIndex < 0 || bookingIndex < 0) {
  throw new Error("Booking panel or info cards could not be located.");
}

// Locate the three consecutive info cards, regardless of which earlier prebuild
// step moved or wrapped them.
const firstBlockStart = calendar.lastIndexOf('<div className="mt-6 border', firstTitleIndex);
if (firstBlockStart < 0) throw new Error("First info card could not be located.");

const firstBlockEnd = findMatchingDiv(calendar, firstBlockStart);
const secondBlockStart = calendar.indexOf('<div className="mt-4 border', firstBlockEnd);
const secondBlockEnd = secondBlockStart >= 0 ? findMatchingDiv(calendar, secondBlockStart) : -1;
const thirdBlockStart = secondBlockEnd >= 0 ? calendar.indexOf('<div className="mt-4 border', secondBlockEnd) : -1;
const thirdBlockEnd = thirdBlockStart >= 0 ? findMatchingDiv(calendar, thirdBlockStart) : -1;

if ([firstBlockEnd, secondBlockStart, secondBlockEnd, thirdBlockStart, thirdBlockEnd].some((n) => n < 0)) {
  throw new Error("All three info cards could not be isolated.");
}

const infoBlocks = calendar.slice(firstBlockStart, thirdBlockEnd);
calendar = calendar.slice(0, firstBlockStart) + calendar.slice(thirdBlockEnd);

// Remove wrappers/copies introduced by the previous mobile-only workaround.
calendar = calendar
  .replace(/\s*\{\/\* Mobile info boxes after booking card \*\/\}\s*/g, "\n")
  .replace(/<div className="hidden lg:contents">\s*<\/div>/g, "")
  .replace(/<div className="lg:hidden">\s*<\/div>/g, "");

const refreshedBookingIndex = calendar.indexOf(bookingMarker);
const bookingCardStart = calendar.indexOf('<div className="bg-card border border-champagne/15 p-6 min-h-[300px]', refreshedBookingIndex);
if (bookingCardStart < 0) throw new Error("Booking card could not be located.");

const bookingCardEnd = findMatchingDiv(calendar, bookingCardStart);
if (bookingCardEnd < 0) throw new Error("Booking card end could not be located.");

// Same order on ALL devices: calendar -> booking request -> three info cards.
calendar = calendar.slice(0, bookingCardEnd) + `\n${infoBlocks}` + calendar.slice(bookingCardEnd);

const finalBookingCardStart = calendar.indexOf('<div className="bg-card border border-champagne/15 p-6 min-h-[300px]', calendar.indexOf(bookingMarker));
const finalBookingCardEnd = findMatchingDiv(calendar, finalBookingCardStart);
const finalInfoIndex = calendar.indexOf(firstTitle);
if (finalInfoIndex < finalBookingCardEnd) {
  throw new Error("Info cards are still before the booking request.");
}

writeFileSync(calendarPath, calendar);
console.log("Calendar order fixed on all devices: calendar -> booking request -> info boxes.");
