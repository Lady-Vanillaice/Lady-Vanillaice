import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

function replaceOnce(anchor, replacement, label) {
  if (!text.includes(anchor)) {
    throw new Error(`Calendar form enhancement failed: ${label} anchor not found.`);
  }
  text = text.replace(anchor, replacement);
}

if (!text.includes('name="play_world"')) {
  replaceOnce(
    '    const altNote = String(fd.get("alt_note") ?? "").trim();\n    const experience = String(fd.get("experience") ?? "").trim();',
    '    const altNote = String(fd.get("alt_note") ?? "").trim();\n    const playWorld = String(fd.get("play_world") ?? "").trim();\n    const experience = String(fd.get("experience") ?? "").trim();',
    "play-world form value",
  );

  replaceOnce(
    '    const baseMessage = [\n      experience ? `Erfahrung:\\n${experience}` : null,',
    '    const baseMessage = [\n      playWorld ? `Spielwelt: ${playWorld}` : null,\n      experience ? `Erfahrung:\\n${experience}` : null,',
    "play-world message",
  );

  replaceOnce(
    '          <div>\n            <label className="eyebrow block mb-1.5">{tr("Erfahrung", "Experience")}</label>\n            <select name="experience" required defaultValue="" className="input-luxe">',
    `          <div>
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
          <div>
            <label className="eyebrow block mb-1.5">{tr("Erfahrung", "Experience")}</label>
            <select name="experience" required defaultValue="" className="input-luxe">`,
    "play-world select",
  );
}

if (!text.includes("+ Ausweichtermin hinzufügen (optional)")) {
  const startMarker = '        <div className="border border-champagne/20 bg-champagne/[0.03] p-4 space-y-3">\n          <div>\n            <label className="eyebrow block mb-1.5 text-champagne">{tr("Ausweichtermin (empfohlen)", "Alternative date (recommended)")}</label>';
  const endMarker = '\n\n        <label className="flex items-start gap-2 text-xs text-vanilla/65 cursor-pointer">';
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error("Calendar form enhancement failed: alternative-date block not found.");
  }
  const block = text.slice(start, end);
  const wrapped = `        <details className="border border-champagne/20 bg-champagne/[0.03]">
          <summary className="cursor-pointer px-4 py-3 text-sm text-champagne hover:text-vanilla transition">
            {tr("+ Ausweichtermin hinzufügen (optional)", "+ Add an alternative date (optional)")}
          </summary>
          <div className="border-t border-champagne/15 p-4">
${block.replace(/^        /gm, "            ")}
          </div>
        </details>`;
  text = text.slice(0, start) + wrapped + text.slice(end);
}

writeFileSync(path, text);
console.log("Applied calendar play-world selection and collapsible alternative date.");
