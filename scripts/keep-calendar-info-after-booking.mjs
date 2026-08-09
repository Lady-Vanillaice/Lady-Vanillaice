import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

const marker = "{/* Calendar info below calendar */}";
const firstCard = '<div className="mt-6 border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed">';
const bookingMarker = "{/* Booking panel */}";

const bookingIndex = text.indexOf(bookingMarker);
const firstCardIndex = text.indexOf(firstCard, bookingIndex);

if (bookingIndex < 0 || firstCardIndex < 0) {
  throw new Error("Booking panel or first calendar info card could not be found.");
}

if (!text.includes(marker)) {
  text = text.slice(0, firstCardIndex) + `            ${marker}\n            ` + text.slice(firstCardIndex);
}

const markerIndex = text.indexOf(marker);
if (markerIndex < bookingIndex) {
  throw new Error("Calendar info marker was inserted before the booking panel.");
}

writeFileSync(path, text);
console.log("Calendar info remains after the booking request before later prebuild transforms run.");
