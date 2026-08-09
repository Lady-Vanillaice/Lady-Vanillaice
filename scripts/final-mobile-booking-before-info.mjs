import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

const marker = "{/* FINAL mobile info boxes inside booking card */}";
if (text.includes(marker)) {
  console.log("Final mobile booking/info layout already applied.");
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

const firstTitle = 'tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")';
const firstTitleIndex = text.indexOf(firstTitle);
if (firstTitleIndex < 0) throw new Error("First calendar info box not found.");

const firstStart = text.lastIndexOf('<div className="mt-6 border', firstTitleIndex);
const firstEnd = findMatchingDiv(text, firstStart);
const secondStart = text.indexOf('<div className="mt-4 border', firstEnd);
const secondEnd = findMatchingDiv(text, secondStart);
const thirdStart = text.indexOf('<div className="mt-4 border', secondEnd);
const thirdEnd = findMatchingDiv(text, thirdStart);

if ([firstStart, firstEnd, secondStart, secondEnd, thirdStart, thirdEnd].some((n) => n < 0)) {
  throw new Error("Could not isolate all three calendar info boxes.");
}

const infoBlocks = text.slice(firstStart, thirdEnd);

// Keep the existing copy for desktop, but make it impossible for that copy to
// appear on phone/tablet regardless of any older mobile order CSS.
text = text.slice(0, firstStart) +
  `<div className="hidden lg:block">\n${infoBlocks}\n</div>` +
  text.slice(thirdEnd);

const bookingMarker = "{/* Booking panel */}";
const bookingIndex = text.indexOf(bookingMarker);
const bookingCardStart = text.indexOf('<div className="bg-card border border-champagne/15 p-6 min-h-[300px]', bookingIndex);
if (bookingIndex < 0 || bookingCardStart < 0) throw new Error("Booking card not found.");

const bookingCardEnd = findMatchingDiv(text, bookingCardStart);
if (bookingCardEnd < 0) throw new Error("Booking card end not found.");
const bookingCardCloseStart = text.lastIndexOf("</div>", bookingCardEnd);
if (bookingCardCloseStart < bookingCardStart) throw new Error("Booking card closing tag not found.");

const mobileCopy = `\n              {selectedSlot && (\n                <div className="lg:hidden mt-6">\n                  ${marker}\n${infoBlocks}\n                </div>\n              )}\n            `;

text = text.slice(0, bookingCardCloseStart) + mobileCopy + text.slice(bookingCardCloseStart);

const markerIndex = text.indexOf(marker);
const bookingPanelIndex = text.indexOf("<BookingPanel", bookingIndex);
if (markerIndex < bookingPanelIndex) {
  throw new Error("Final mobile info copy is not after BookingPanel.");
}

writeFileSync(path, text);
console.log("Mobile calendar fixed structurally: booking card first, info boxes inside it afterwards; desktop copy unchanged.");
