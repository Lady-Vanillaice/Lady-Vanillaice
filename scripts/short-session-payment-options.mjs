import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/admin/admin-shared.tsx";
let text = readFileSync(path, "utf8");
const before = text;

// Kurzsession: 60 / 75 / 100 € IST bereits der vollständige Sessionpreis.
// Deshalb kein zusätzlicher Zahlungsplan und kein separates Sessionpreis-Feld.
if (!text.includes('const [onsiteMethod, setOnsiteMethod]')) {
  text = text.replace(
    '  const [shortSessionPrice, setShortSessionPrice] = useState("");',
    '  const [shortSessionPrice, setShortSessionPrice] = useState("");\n  const [onsiteMethod, setOnsiteMethod] = useState("Bar");',
  );
}

// Falls eine ältere Version dieses Patches bereits shortPaymentPlan eingefügt hat,
// räumen wir diese Zustände wieder auf.
text = text.replace(/\n  const \[shortPaymentPlan, setShortPaymentPlan\][^\n]*\n?/g, "\n");

// Preiswahl setzt den Gesamtpreis automatisch. Bei Kurzsession muss der Betrag
// nicht noch einmal separat eingegeben werden.
text = text.replace(
  /<div><label className="eyebrow block mb-1">Kurzsession<\/label><select value=\{shortSessionPrice\} onChange=\{\(e\) => \{ const value = e\.target\.value; setShortSessionPrice\(value\);[^}]*\}\} className="input-luxe !py-2"><option value="">Preis auswählen<\/option><option value="60">60 €<\/option><option value="75">75 €<\/option><option value="100">100 €<\/option><\/select><\/div>/g,
  `<div><label className="eyebrow block mb-1">Kurzsession</label><select value={shortSessionPrice} onChange={(e) => { const value = e.target.value; setShortSessionPrice(value); if (value) setTotalAmount(value); }} className="input-luxe !py-2"><option value="">Preis auswählen</option><option value="60">60 €</option><option value="75">75 €</option><option value="100">100 €</option></select></div>`,
);

// Entferne den alten zusätzlichen Zahlungsplan aus einer früheren Variante.
text = text.replace(
  /<div className=\{shortSessionPrice \? "" : "hidden"\}><label className="eyebrow block mb-1">Zahlungsweise Kurzsession<\/label>[\s\S]*?<\/div>/g,
  "",
);

// Das freie Sessionpreis-Feld wird bei gewählter Kurzsession ausgeblendet.
// Ohne Kurzsession bleibt es für normale Termine erhalten.
text = text.replace(
  '<div><label className="eyebrow block mb-1">Sessionpreis (€)</label><input required inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>',
  '<div className={shortSessionPrice ? "hidden" : ""}><label className="eyebrow block mb-1">Sessionpreis (€)</label><input required={!shortSessionPrice} inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>',
);
text = text.replace(
  '<div><label className="eyebrow block mb-1">Gesamtpreis (€)</label><input required inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>',
  '<div className={shortSessionPrice ? "hidden" : ""}><label className="eyebrow block mb-1">Sessionpreis (€)</label><input required={!shortSessionPrice} inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>',
);

// Bei "Spontaner Termin" ist keine Anzahlung nötig. Dann wird stattdessen die
// Zahlungsart für die komplette Zahlung vor Ort angezeigt.
if (!text.includes('Zahlungsart vor Ort')) {
  const marker = '<div><label className="eyebrow block mb-1">Anzahlung eingegangen am</label>';
  const block = `<div className={shortSessionPrice && depositExemptionReason === "spontaneous" ? "" : "hidden"}><label className="eyebrow block mb-1">Zahlungsart vor Ort</label><select value={onsiteMethod} onChange={(e) => setOnsiteMethod(e.target.value)} className="input-luxe !py-2"><option>Bar</option><option>PayPal</option><option>Überweisung</option><option>Karte</option><option>Sonstige</option></select></div>`;
  text = text.replace(marker, block + marker);
} else {
  // Vorhandenen alten Sichtbarkeitsausdruck korrigieren.
  text = text.replace(
    /className=\{shortSessionPrice && shortPaymentPlan !== "advance" \? "" : "hidden"\}/g,
    'className={shortSessionPrice && depositExemptionReason === "spontaneous" ? "" : "hidden"}',
  );
}

// Für spontane Kurzsessions kommt der komplette Preis vor Ort rein. Für alle
// anderen Kurzsessions gilt die normale Anzahlungslogik unverändert.
text = text.replace(
  /\n    const effectiveDeposit =[^\n]*\n    const effectiveDepositExemptionReason =[^\n]*/g,
  "",
);
text = text.replace(
  /if \(!effectiveDepositExemptionReason && \(!Number\.isFinite\(effectiveDeposit\) \|\| effectiveDeposit <= 0 \|\| effectiveDeposit > total\)\)/g,
  'if (!depositExemptionReason && (!Number.isFinite(deposit) || deposit <= 0 || deposit > total))',
);
text = text.replace(
  /if \(effectiveDeposit > 0 && \(!depositMethod\.trim\(\) \|\| !depositPaidAt\)\)/g,
  'if (!depositExemptionReason && (!depositMethod.trim() || !depositPaidAt))',
);
text = text.replace(/deposit_amount: effectiveDeposit,/g, 'deposit_amount: depositExemptionReason ? 0 : deposit,');
text = text.replace(/deposit_paid_at: effectiveDeposit > 0 \? depositPaidAt : null,/g, 'deposit_paid_at: depositExemptionReason ? null : depositPaidAt,');
text = text.replace(/deposit_exemption_reason: effectiveDepositExemptionReason,/g, 'deposit_exemption_reason: depositExemptionReason,');
text = text.replace(
  /if \(effectiveDeposit < total && created && typeof created === "object" && "slot_id" in created\) \{/g,
  'if (depositExemptionReason && created && typeof created === "object" && "slot_id" in created) {',
);
text = text.replace(
  /restzahlung_method: shortSessionPrice \? onsiteMethod\.trim\(\) : depositMethod\.trim\(\),/g,
  'restzahlung_method: shortSessionPrice && depositExemptionReason === "spontaneous" ? onsiteMethod.trim() : depositMethod.trim(),',
);

// Falls der Basis-Code noch den generischen Restzahlungswert verwendet, setzen
// wir bei einer spontanen Kurzsession ausdrücklich die Vor-Ort-Zahlungsart.
text = text.replace(
  /restzahlung_method: depositMethod\.trim\(\),/g,
  'restzahlung_method: shortSessionPrice && depositExemptionReason === "spontaneous" ? onsiteMethod.trim() : depositMethod.trim(),',
);

// Alte Reset-Logik entfernen und nur die Vor-Ort-Zahlungsart zurücksetzen.
text = text.replace(/\n      setShortPaymentPlan\("onsite"\);/g, "");
if (!text.includes('setOnsiteMethod("Bar")')) {
  text = text.replace('      setShortSessionPrice("");', '      setShortSessionPrice("");\n      setOnsiteMethod("Bar");');
}

if (text !== before) {
  writeFileSync(path, text);
  console.log("Short-session payment form simplified.");
} else {
  console.log("Short-session payment form already simplified.");
}
