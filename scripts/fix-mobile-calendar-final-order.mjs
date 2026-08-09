import { readFileSync, writeFileSync } from "node:fs";

const calendarPath = "src/routes/kalender.tsx";
let calendar = readFileSync(calendarPath, "utf8");

const sourceMarker = "{/* Calendar info below calendar */}";
const mobileMarker = "{/* Mobile calendar info after booking */}";

if (!calendar.includes(mobileMarker)) {
  const markerIndex = calendar.indexOf(sourceMarker);
  const bookingMarker = "          {/* Booking panel */}";
  const bookingIndex = calendar.indexOf(bookingMarker);
  if (markerIndex < 0 || bookingIndex < 0 || markerIndex > bookingIndex) {
    throw new Error("Calendar info block or booking panel could not be located.");
  }

  const sourceStart = calendar.lastIndexOf("            <div", markerIndex);
  const calendarColumnEnd = calendar.lastIndexOf("          </div>", bookingIndex);
  if (sourceStart < 0 || calendarColumnEnd < 0 || sourceStart >= calendarColumnEnd) {
    throw new Error("Calendar info source range could not be determined.");
  }

  const infoBlocks = calendar.slice(sourceStart, calendarColumnEnd);
  const desktopOnly = `            <div className="hidden lg:contents">\n${infoBlocks}\n            </div>\n`;
  calendar = calendar.slice(0, sourceStart) + desktopOnly + calendar.slice(calendarColumnEnd);

  const sectionEndMarker = "          </div>\n        </div>\n      </section>";
  const sectionEnd = calendar.indexOf(sectionEndMarker, bookingIndex);
  if (sectionEnd < 0) {
    throw new Error("Booking column end could not be located.");
  }

  const mobileCopy = `\n\n            ${mobileMarker}\n            <div className="lg:hidden">\n${infoBlocks}\n            </div>`;
  calendar = calendar.slice(0, sectionEnd) + mobileCopy + calendar.slice(sectionEnd);
}

if (!calendar.includes(mobileMarker) || !calendar.includes('className="hidden lg:contents"')) {
  throw new Error("Mobile calendar info duplication could not be applied.");
}

writeFileSync(calendarPath, calendar);
console.log("Mobile calendar info now renders after the booking request; desktop layout stays unchanged.");
