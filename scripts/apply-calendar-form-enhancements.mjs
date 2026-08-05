import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

if (!text.includes('name="play_world"')) {
  text = text.replace(
    /const altNote = String\(fd\.get\("alt_note"\) \?\? ""\)\.trim\(\);\s*const experience = String\(fd\.get\("experience"\) \?\? ""\)\.trim\(\);/,
    'const altNote = String(fd.get("alt_note") ?? "").trim();\n    const playWorld = String(fd.get("play_world") ?? "").trim();\n    const experience = String(fd.get("experience") ?? "").trim();',
  );

  text = text.replace(
    /const baseMessage = \[\s*experience \? `Erfahrung:\\n\$\{experience\}` : null,/,
    'const baseMessage = [\n      playWorld ? `Spielwelt: ${playWorld}` : null,\n      experience ? `Erfahrung:\\n${experience}` : null,',
  );

  const experienceField = `          <div>
            <label className="eyebrow block mb-1.5">{tr("Erfahrung", "Experience")}</label>
            <select name="experience" required defaultValue="" className="input-luxe">`;
  const playWorldField = `          <div>
            <label className="eyebrow block mb-1.5">{tr("Spielwelt (optional)", "World of play (optional)")}</label>
            <select name="play_world" defaultValue="" className="input-luxe">
              <option value="">{tr("Keine Auswahl", "No selection")}</option>
              <option value={tr("Dein erstes Loslassen", "Your first surrender")}>{tr("Dein erstes Loslassen", "Your first surrender")}</option>
              <option value={tr("Mein Spiel mit deinem Kopf", "My game with your mind")}>{tr("Mein Spiel mit deinem Kopf", "My game with your mind")}</option>
              <option value={tr("Sanfte Macht", "Soft power")}>{tr("Sanfte Macht", "Soft power")}</option>
              <option value={tr("Wenn ich hart werde", "When I turn hard")}>{tr("Wenn ich hart werde", "When I turn hard")}</option>
              <option value={tr("Deine Verwandlung", "Your transformation")}>{tr("Deine Verwandlung", "Your transformation")}</option>
              <option value={tr("Nur für dich inszeniert", "Created only for you")}>{tr("Nur für dich inszeniert", "Created only for you")}</option>
            </select>
          </div>
${experienceField}`;
  text = text.replace(experienceField, playWorldField);
}

if (!text.includes("+ Ausweichtermin hinzufügen (optional)")) {
  const labelPosition = text.indexOf('tr("Ausweichtermin (empfohlen)", "Alternative date (recommended)")');
  const blockStart = text.lastIndexOf(
    '        <div className="border border-champagne/20 bg-champagne/[0.03] p-4 space-y-3">',
    labelPosition,
  );
  const endMarker = '\n\n        <label className="flex items-start gap-2 text-xs text-vanilla/65 cursor-pointer">';
  const blockEnd = text.indexOf(endMarker, labelPosition);

  if (labelPosition >= 0 && blockStart >= 0 && blockEnd >= 0) {
    const block = text.slice(blockStart, blockEnd);
    const wrapped = `        <details className="border border-champagne/20 bg-champagne/[0.03]">
          <summary className="cursor-pointer px-4 py-3 text-sm text-champagne hover:text-vanilla transition">
            {tr("+ Ausweichtermin hinzufügen (optional)", "+ Add an alternative date (optional)")}
          </summary>
          <div className="border-t border-champagne/15 p-4">
${block.replace(/^        /gm, "            ")}
          </div>
        </details>`;
    text = text.slice(0, blockStart) + wrapped + text.slice(blockEnd);
  }
}

if (!text.includes("Calendar info below calendar")) {
  const firstTitle = text.indexOf('tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")');
  const firstStart = text.lastIndexOf('\n            <div className="mt-6 border', firstTitle);
  const thirdTitle = text.indexOf('tr("Content-Dreh", "Content shoot")', firstTitle);
  const infoEndMarker = '\n          </div>\n        </div>\n      </section>';
  const infoEnd = text.indexOf(infoEndMarker, thirdTitle);
  const bookingMarker = '\n          {/* Booking panel */}';
  const bookingPosition = text.indexOf(bookingMarker);
  const calendarClose = text.lastIndexOf('\n          </div>', bookingPosition);

  if (firstTitle >= 0 && firstStart >= 0 && thirdTitle >= 0 && infoEnd >= 0 && bookingPosition >= 0 && calendarClose >= 0) {
    const infoBlocks = text.slice(firstStart + 1, infoEnd);
    text = text.slice(0, firstStart) + text.slice(infoEnd);

    const refreshedBookingPosition = text.indexOf(bookingMarker);
    const refreshedCalendarClose = text.lastIndexOf('\n          </div>', refreshedBookingPosition);
    const insertion = `\n\n            {/* Calendar info below calendar */}\n${infoBlocks}`;
    text = text.slice(0, refreshedCalendarClose) + insertion + text.slice(refreshedCalendarClose);
  }
}

if (!text.includes('name="play_world"')) {
  throw new Error("Spielwelt-Auswahl konnte nicht in den Kalender eingebaut werden.");
}
if (!text.includes("+ Ausweichtermin hinzufügen (optional)")) {
  throw new Error("Ausweichtermin konnte im Kalender nicht einklappbar gemacht werden.");
}
if (!text.includes("Calendar info below calendar")) {
  throw new Error("Die Kalender-Infoboxen konnten nicht unter den Kalender verschoben werden.");
}

writeFileSync(path, text);
console.log("Calendar form enhancements applied successfully.");
