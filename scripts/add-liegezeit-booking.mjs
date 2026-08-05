import { readFileSync, writeFileSync } from "node:fs";

function patch(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) {
    if (!before.includes("LIEGEZEIT_BOOKING_FEATURE")) {
      throw new Error(`Liegezeit-Erweiterung konnte in ${path} nicht eingebaut werden.`);
    }
    return;
  }
  writeFileSync(path, after);
}

const publicFields = `
        {/* LIEGEZEIT_BOOKING_FEATURE */}
        <details className="border border-champagne/20 bg-champagne/[0.03]">
          <summary className="cursor-pointer px-4 py-3 text-sm text-champagne hover:text-vanilla transition">
            {tr("+ Liegezeit hinzufügen (optional)", "+ Add restraint time (optional)")}
          </summary>
          <div className="space-y-4 border-t border-champagne/15 p-4">
            <p className="text-[0.7rem] leading-relaxed text-vanilla/55">
              {tr("Die Liegezeit liegt innerhalb deiner gebuchten Sessiondauer. Ein möglicher Aufpreis wird anschließend individuell bestätigt.", "The restraint time is included within your booked session duration. Any surcharge will be confirmed individually afterwards.")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eyebrow block mb-1.5">{tr("Gewünschte Dauer", "Requested duration")}</label>
                <select name="liegezeit_duration" defaultValue="" className="input-luxe">
                  <option value="">{tr("Keine Liegezeit", "No restraint time")}</option>
                  <option value="30">30 {tr("Minuten", "minutes")}</option>
                  <option value="60">60 {tr("Minuten", "minutes")}</option>
                  <option value="90">90 {tr("Minuten", "minutes")}</option>
                  <option value="120">120 {tr("Minuten", "minutes")}</option>
                  <option value="custom">{tr("Andere Dauer", "Other duration")}</option>
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-1.5">{tr("Art", "Type")}</label>
                <select name="liegezeit_type" defaultValue="unbeaufsichtigt" className="input-luxe">
                  <option value="unbeaufsichtigt">{tr("Unbeaufsichtigt", "Unsupervised")}</option>
                  <option value="beaufsichtigt">{tr("Beaufsichtigt", "Supervised")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">{tr("Dauer-Hinweis (optional)", "Duration note (optional)")}</label>
              <input name="liegezeit_note" maxLength={120} className="input-luxe" placeholder={tr("z. B. 45 Minuten", "e.g. 45 minutes")} />
            </div>
          </div>
        </details>`;

patch("src/routes/kalender.tsx", (text) => {
  if (text.includes("LIEGEZEIT_BOOKING_FEATURE")) return text;
  text = text.replace(
    '    const altNote = String(fd.get("alt_note") ?? "").trim();',
    '    const altNote = String(fd.get("alt_note") ?? "").trim();\n    const liegezeitDuration = String(fd.get("liegezeit_duration") ?? "").trim();\n    const liegezeitType = String(fd.get("liegezeit_type") ?? "").trim();\n    const liegezeitNote = String(fd.get("liegezeit_note") ?? "").trim();',
  );
  text = text.replace(
    '    const baseMessage = [',
    '    const liegezeitText = liegezeitDuration ? `Liegezeit: ${liegezeitDuration === "custom" ? (liegezeitNote || "individuelle Dauer") : `${liegezeitDuration} Minuten`} · ${liegezeitType || "unbeaufsichtigt"}` : null;\n    const baseMessage = [\n      liegezeitText,',
  );
  const marker = '        <label className="flex items-start gap-3 text-xs text-vanilla/45 cursor-pointer">';
  text = text.replace(marker, `${publicFields}\n\n${marker}`);
  return text;
});

patch("src/routes/buchung.tsx", (text) => {
  if (text.includes("LIEGEZEIT_BOOKING_FEATURE")) return text;
  text = text.replace(
    '    const safeword = String(form.get("safeword") ?? "").trim();',
    '    const safeword = String(form.get("safeword") ?? "").trim();\n    const liegezeitDuration = String(form.get("liegezeit_duration") ?? "").trim();\n    const liegezeitType = String(form.get("liegezeit_type") ?? "").trim();\n    const liegezeitNote = String(form.get("liegezeit_note") ?? "").trim();',
  );
  text = text.replace(
    '    const message = [',
    '    const liegezeitText = liegezeitDuration ? `Liegezeit: ${liegezeitDuration === "custom" ? (liegezeitNote || "individuelle Dauer") : `${liegezeitDuration} Minuten`} · ${liegezeitType || "unbeaufsichtigt"}` : null;\n    const message = [\n      liegezeitText,',
  );
  const marker = '              <label className="flex items-start gap-3 text-sm text-vanilla/70 cursor-pointer">';
  text = text.replace(marker, `${publicFields.replaceAll('text-[0.7rem]', 'text-xs')}\n\n${marker}`);
  return text;
});

patch("src/components/admin/admin-shared.tsx", (text) => {
  if (text.includes("LIEGEZEIT_BOOKING_FEATURE")) return text;

  text = text.replace(
    '  const [shortSessionPrice, setShortSessionPrice] = useState("");',
    '  const [shortSessionPrice, setShortSessionPrice] = useState("");\n  const [hasLiegezeit, setHasLiegezeit] = useState(false);\n  const [liegezeitDuration, setLiegezeitDuration] = useState("60");\n  const [liegezeitType, setLiegezeitType] = useState<"beaufsichtigt" | "unbeaufsichtigt">("unbeaufsichtigt");\n  const [liegezeitSurcharge, setLiegezeitSurcharge] = useState("");',
  );

  text = text.replace(
    '    const total = Number(totalAmount.replace(",", "."));\n    const deposit = Number(depositAmount.replace(",", "."));',
    '    const sessionPrice = Number(totalAmount.replace(",", "."));\n    const surcharge = hasLiegezeit ? Number(liegezeitSurcharge.replace(",", ".")) : 0;\n    const total = sessionPrice + surcharge;\n    const deposit = Number(depositAmount.replace(",", "."));',
  );

  text = text.replace(
    '    if (!Number.isFinite(total) || total <= 0) {\n      setErr("Bitte den Gesamtpreis eintragen.");',
    '    if (!Number.isFinite(sessionPrice) || sessionPrice <= 0) {\n      setErr("Bitte den Sessionpreis eintragen.");',
  );

  text = text.replace(
    '      return;\n    }\n    if (!depositExemptionReason && (!Number.isFinite(deposit)',
    '      return;\n    }\n    if (hasLiegezeit && (!Number.isFinite(surcharge) || surcharge < 0)) {\n      setErr("Bitte einen gültigen Liegezeit-Aufschlag eintragen.");\n      return;\n    }\n    if (!depositExemptionReason && (!Number.isFinite(deposit)',
  );

  text = text.replace(
    '        internal_note: note.trim() || null,',
    '        internal_note: [\n          note.trim() || null,\n          hasLiegezeit ? `Liegezeit: ${liegezeitDuration} Minuten · ${liegezeitType} · Aufschlag ${surcharge.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} · Sessionpreis ${sessionPrice.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} · Gesamt ${total.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}` : null,\n        ].filter(Boolean).join("\\n\\n") || null,',
  );

  text = text.replace(
    '      setShortSessionPrice("");',
    '      setShortSessionPrice("");\n      setHasLiegezeit(false);\n      setLiegezeitDuration("60");\n      setLiegezeitType("unbeaufsichtigt");\n      setLiegezeitSurcharge("");',
  );

  const priceMarker = '<label className="eyebrow block mb-1">Gesamtpreis';
  const priceAt = text.indexOf(priceMarker);
  const depositAt = text.indexOf('<label className="eyebrow block mb-1">Anzahlung', priceAt);
  if (priceAt < 0 || depositAt < 0) throw new Error("Preisbereich im Adminformular nicht gefunden.");
  const insertAt = text.lastIndexOf('      <div>', depositAt);
  const liegezeitAdmin = `      {/* LIEGEZEIT_BOOKING_FEATURE */}
      <div className="border border-champagne/25 bg-champagne/[0.03] p-4 space-y-3">
        <label className="flex items-start gap-3 text-xs text-vanilla/75 cursor-pointer">
          <input type="checkbox" checked={hasLiegezeit} onChange={(e) => setHasLiegezeit(e.target.checked)} className="mt-0.5 accent-[var(--color-champagne)]" />
          <span><strong className="text-champagne">Liegezeit</strong> innerhalb der gebuchten Session hinzufügen</span>
        </label>
        {hasLiegezeit && (
          <div className="space-y-3 border-t border-champagne/15 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eyebrow block mb-1">Dauer</label>
                <input type="number" min={15} step={15} value={liegezeitDuration} onChange={(e) => setLiegezeitDuration(e.target.value)} className="input-luxe !py-2" />
              </div>
              <div>
                <label className="eyebrow block mb-1">Art</label>
                <select value={liegezeitType} onChange={(e) => setLiegezeitType(e.target.value as "beaufsichtigt" | "unbeaufsichtigt")} className="input-luxe !py-2">
                  <option value="unbeaufsichtigt">Unbeaufsichtigt</option>
                  <option value="beaufsichtigt">Beaufsichtigt</option>
                </select>
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-1">Liegezeit-Aufschlag</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[100, 150, 200, 250].map((amount) => (
                  <button key={amount} type="button" onClick={() => setLiegezeitSurcharge(String(amount))} className={liegezeitSurcharge === String(amount) ? "btn-gold !py-2 !px-2 !text-[0.65rem]" : "btn-outline-gold !py-2 !px-2 !text-[0.65rem]"}>{amount} €</button>
                ))}
              </div>
              <input type="number" min={0} step={10} value={liegezeitSurcharge} onChange={(e) => setLiegezeitSurcharge(e.target.value)} className="input-luxe !py-2" placeholder="Eigener Aufschlag" />
            </div>
            <p className="text-xs text-vanilla/65">Gesamtpreis: {(Number(totalAmount.replace(",", ".")) + Number(liegezeitSurcharge.replace(",", ".") || 0)).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</p>
          </div>
        )}
      </div>

`;
  text = text.slice(0, insertAt) + liegezeitAdmin + text.slice(insertAt);
  text = text.replace('>Gesamtpreis', '>Sessionpreis');
  return text;
});

console.log("Liegezeit booking feature applied successfully.");
