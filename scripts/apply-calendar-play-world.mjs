import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

if (text.includes('name="play_world"')) {
  process.exit(0);
}

const fieldAnchor = `    const altNote = String(fd.get("alt_note") ?? "").trim();
    const experience = String(fd.get("experience") ?? "").trim();`;
const fieldReplacement = `    const altNote = String(fd.get("alt_note") ?? "").trim();
    const playWorld = String(fd.get("play_world") ?? "").trim();
    const experience = String(fd.get("experience") ?? "").trim();`;

const messageAnchor = `    const baseMessage = [
      experience ? \`Erfahrung:\\n\${experience}\` : null,`;
const messageReplacement = `    const baseMessage = [
      playWorld ? \`Spielwelt: \${playWorld}\` : null,
      experience ? \`Erfahrung:\\n\${experience}\` : null,`;

const formAnchor = `          <div>
            <label className="eyebrow block mb-1.5">{tr("Erfahrung", "Experience")}</label>
            <select name="experience" required defaultValue="" className="input-luxe">`;
const formReplacement = `          <div>
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
            <select name="experience" required defaultValue="" className="input-luxe">`;

for (const [anchor, replacement, label] of [
  [fieldAnchor, fieldReplacement, "submit field"],
  [messageAnchor, messageReplacement, "message"],
  [formAnchor, formReplacement, "form"],
]) {
  if (!text.includes(anchor)) {
    throw new Error(`Calendar play-world patch failed: ${label} anchor not found.`);
  }
  text = text.replace(anchor, replacement);
}

writeFileSync(path, text);
console.log("Added optional play-world selection to the public calendar booking form.");
