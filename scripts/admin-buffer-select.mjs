import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/admin/admin-shared.tsx";
let text = readFileSync(path, "utf8");

text = text.replace('const [buffer, setBuffer] = useState(45);', 'const [buffer, setBuffer] = useState(30);');
text = text.replace(/setBuffer\(45\)/g, 'setBuffer(30)');

const oldField = `      <div>
        <label className="eyebrow block mb-1">Pause zwischen Terminen (Minuten)</label>
        <input
          type="number" min={0} max={240} step={15}
          value={buffer}
          onChange={(e) => setBuffer(Math.max(0, Math.min(240, Number(e.target.value) || 0)))}
          className="input-luxe !py-2"
        />
        <p className="text-[0.65rem] text-vanilla/45 mt-1">Standard 45 Min. Wird auch bei bestehenden Buchungen berücksichtigt.</p>
      </div>`;

const newField = `      <div>
        <label className="eyebrow block mb-1">Pause zwischen Terminen</label>
        <select
          value={buffer}
          onChange={(e) => setBuffer(Number(e.target.value))}
          className="input-luxe !py-2"
        >
          <option value={30}>30 Minuten</option>
          <option value={45}>45 Minuten</option>
          <option value={60}>60 Minuten</option>
        </select>
        <p className="text-[0.65rem] text-vanilla/45 mt-1">Standardmäßig sind 30 Minuten ausgewählt.</p>
      </div>`;

if (!text.includes("Standardmäßig sind 30 Minuten ausgewählt.")) {
  if (!text.includes(oldField)) {
    throw new Error("Das Feld für die Pausenzeit konnte nicht gefunden werden.");
  }
  text = text.replace(oldField, newField);
}

if (!text.includes('<option value={30}>30 Minuten</option>') || !text.includes('<option value={60}>60 Minuten</option>')) {
  throw new Error("Die auswählbaren Pausenzeiten konnten nicht eingebaut werden.");
}

writeFileSync(path, text);
console.log("Admin buffer select applied successfully.");
