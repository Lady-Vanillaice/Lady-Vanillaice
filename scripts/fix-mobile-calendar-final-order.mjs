import { readFileSync, writeFileSync } from "node:fs";

const calendarPath = "src/routes/kalender.tsx";
let calendar = readFileSync(calendarPath, "utf8");

const mobileMarker = "{/* Mobile info boxes after booking card */}";
if (calendar.includes(mobileMarker)) {
  console.log("Mobile calendar info placement already applied.");
  process.exit(0);
}

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
const bookingIndex = calendar.indexOf(bookingMarker);
const firstTitle = 'tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")';
const firstTitleIndex = calendar.indexOf(firstTitle);

if (bookingIndex < 0 || firstTitleIndex < 0) {
  throw new Error("Booking panel or calendar info boxes could not be located.");
}

// Locate the three consecutive info cards wherever previous prebuild steps left them.
const firstBlockStart = calendar.lastIndexOf('<div className="mt-6 border', firstTitleIndex);
if (firstBlockStart < 0) {
  throw new Error("First calendar info card could not be located.");
}

const firstBlockEnd = findMatchingDiv(calendar, firstBlockStart);
const secondBlockStart = calendar.indexOf('<div className="mt-4 border', firstBlockEnd);
const secondBlockEnd = secondBlockStart >= 0 ? findMatchingDiv(calendar, secondBlockStart) : -1;
const thirdBlockStart = secondBlockEnd >= 0 ? calendar.indexOf('<div className="mt-4 border', secondBlockEnd) : -1;
const thirdBlockEnd = thirdBlockStart >= 0 ? findMatchingDiv(calendar, thirdBlockStart) : -1;

if ([firstBlockEnd, secondBlockStart, secondBlockEnd, thirdBlockStart, thirdBlockEnd].some((n) => n < 0)) {
  throw new Error("All three calendar info cards could not be isolated.");
}

const infoBlocks = calendar.slice(firstBlockStart, thirdBlockEnd);

// Keep the existing desktop position, but hide that copy on phones.
const desktopCopy = `<div className="hidden lg:contents">\n${infoBlocks}\n</div>`;
calendar = calendar.slice(0, firstBlockStart) + desktopCopy + calendar.slice(thirdBlockEnd);

// Find the actual booking card (not merely the Booking panel comment) and put a
// dedicated mobile copy directly AFTER that card. This guarantees the requested
// mobile order regardless of Safari flex/grid ordering or earlier build transforms.
const refreshedBookingIndex = calendar.indexOf(bookingMarker);
const bookingCardStart = calendar.indexOf('<div className="bg-card border border-champagne/15 p-6 min-h-[300px]', refreshedBookingIndex);
if (bookingCardStart < 0) {
  throw new Error("Booking card could not be located.");
}
const bookingCardEnd = findMatchingDiv(calendar, bookingCardStart);
if (bookingCardEnd < 0) {
  throw new Error("Booking card end could not be located.");
}

const mobileCopy = `\n\n            ${mobileMarker}\n            <div className="lg:hidden">\n${infoBlocks}\n            </div>`;
calendar = calendar.slice(0, bookingCardEnd) + mobileCopy + calendar.slice(bookingCardEnd);

// Sanity check: on mobile the inserted copy must occur after the booking card.
const markerIndex = calendar.indexOf(mobileMarker);
if (markerIndex < bookingCardEnd) {
  throw new Error("Mobile info cards were not inserted after the booking card.");
}

writeFileSync(calendarPath, calendar);
console.log("Mobile order fixed: calendar -> booking request -> info boxes; desktop unchanged.");
