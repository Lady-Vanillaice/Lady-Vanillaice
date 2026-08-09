import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

const marker = "{/* Info boxes only after booking request */}";
if (text.includes(marker)) {
  console.log("Calendar info visibility already patched.");
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
  throw new Error("The three calendar info boxes could not be isolated.");
}

const blocks = text.slice(firstStart, thirdEnd);
const wrapped = `{selectedSlot && (<>\n            ${marker}\n${blocks}\n          </>)}`;
text = text.slice(0, firstStart) + wrapped + text.slice(thirdEnd);

const bookingPanelIndex = text.indexOf("<BookingPanel");
const wrappedIndex = text.indexOf(marker);
if (bookingPanelIndex < 0 || wrappedIndex < bookingPanelIndex) {
  throw new Error("Info boxes are not after the booking form.");
}

writeFileSync(path, text);
console.log("Calendar info boxes now appear only after a date is selected, below the booking request.");
