import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

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
const secondTitle = 'tr("Duo Sessions", "Duo sessions")';
const thirdTitle = 'tr("Content-Dreh", "Content shoot")';
const bookingMarker = "{/* Booking panel */}";

const firstTitleIndex = text.indexOf(firstTitle);
const secondTitleIndex = text.indexOf(secondTitle);
const thirdTitleIndex = text.indexOf(thirdTitle);
if ([firstTitleIndex, secondTitleIndex, thirdTitleIndex].some((n) => n < 0)) {
  throw new Error("All three calendar info boxes must exist before final relocation.");
}

const firstStart = text.lastIndexOf('<div className="mt-6 border', firstTitleIndex);
const firstEnd = findMatchingDiv(text, firstStart);
const secondStart = text.lastIndexOf('<div className="mt-4 border', secondTitleIndex);
const secondEnd = findMatchingDiv(text, secondStart);
const thirdStart = text.lastIndexOf('<div className="mt-4 border', thirdTitleIndex);
const thirdEnd = findMatchingDiv(text, thirdStart);

if ([firstStart, firstEnd, secondStart, secondEnd, thirdStart, thirdEnd].some((n) => n < 0)) {
  throw new Error("The three calendar info boxes could not be isolated.");
}

// Capture each card separately. This remains safe even if earlier prebuild scripts
// inserted comments or wrappers between the cards.
const cards = [
  text.slice(firstStart, firstEnd),
  text.slice(secondStart, secondEnd),
  text.slice(thirdStart, thirdEnd),
];

// Remove from the end backwards so earlier indexes stay valid.
for (const [start, end] of [
  [thirdStart, thirdEnd],
  [secondStart, secondEnd],
  [firstStart, firstEnd],
].sort((a, b) => b[0] - a[0])) {
  text = text.slice(0, start) + text.slice(end);
}

// Clean obsolete markers/wrappers left by older mobile-order attempts.
text = text
  .replace(/\s*\{\/\* Calendar info below calendar \*\/\}\s*/g, "\n")
  .replace(/\s*\{\/\* Info boxes only after booking request \*\/\}\s*/g, "\n")
  .replace(/\s*\{\/\* Mobile info boxes after booking card \*\/\}\s*/g, "\n");

const bookingMarkerIndex = text.indexOf(bookingMarker);
if (bookingMarkerIndex < 0) throw new Error("Booking panel marker not found.");

const bookingCardStart = text.indexOf(
  '<div className="bg-card border border-champagne/15 p-6 min-h-[300px]',
  bookingMarkerIndex,
);
if (bookingCardStart < 0) throw new Error("Visible booking card not found.");

const bookingCardEnd = findMatchingDiv(text, bookingCardStart);
if (bookingCardEnd < 0) throw new Error("Visible booking card end not found.");

const insertion = `\n\n            {/* FINAL: info boxes after visible booking card */}\n${cards.join("\n\n")}`;
text = text.slice(0, bookingCardEnd) + insertion + text.slice(bookingCardEnd);

const finalBookingStart = text.indexOf(
  '<div className="bg-card border border-champagne/15 p-6 min-h-[300px]',
  text.indexOf(bookingMarker),
);
const finalBookingEnd = findMatchingDiv(text, finalBookingStart);
const finalFirstInfo = text.indexOf(firstTitle);
const finalSecondInfo = text.indexOf(secondTitle);
const finalThirdInfo = text.indexOf(thirdTitle);

if (
  finalBookingStart < 0 ||
  finalBookingEnd < 0 ||
  finalFirstInfo < finalBookingEnd ||
  finalSecondInfo < finalFirstInfo ||
  finalThirdInfo < finalSecondInfo
) {
  throw new Error("Final calendar DOM order is not booking-first.");
}

writeFileSync(path, text);
console.log("FINAL calendar DOM: calendar -> booking card -> longer session -> duo -> content.");
