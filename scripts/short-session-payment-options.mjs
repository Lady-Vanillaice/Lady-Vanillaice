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

text = text.replace(/\n  const \[shortPaymentPlan, setShortPaymentPlan\][^\n]*\n?/g, "\n");
text = text.replace(
  /<div><label className="eyebrow block mb-1">Kurzsession<\/label><select value=\{shortSessionPrice\} onChange=\{\(e\) => \{ const value = e\.target\.value; setShortSessionPrice\(value\);[^}]*\}\} className="input-luxe !py-2"><option value="">Preis auswählen<\/option><option value="60">60 €<\/option><option value="75">75 €<\/option><option value="100">100 €<\/option><\/select><\/div>/g,
  `<div><label className="eyebrow block mb-1">Kurzsession</label><select value={shortSessionPrice} onChange={(e) => { const value = e.target.value; setShortSessionPrice(value); if (value) setTotalAmount(value); }} className="input-luxe !py-2"><option value="">Preis auswählen</option><option value="60">60 €</option><option value="75">75 €</option><option value="100">100 €</option></select></div>`,
);
text = text.replace(/<div className=\{shortSessionPrice \? "" : "hidden"\}><label className="eyebrow block mb-1">Zahlungsweise Kurzsession<\/label>[\s\S]*?<\/div>/g, "");
text = text.replace(
  '<div><label className="eyebrow block mb-1">Sessionpreis (€)</label><input required inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>',
  '<div className={shortSessionPrice ? "hidden" : ""}><label className="eyebrow block mb-1">Sessionpreis (€)</label><input required={!shortSessionPrice} inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>',
);
text = text.replace(
  '<div><label className="eyebrow block mb-1">Gesamtpreis (€)</label><input required inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>',
  '<div className={shortSessionPrice ? "hidden" : ""}><label className="eyebrow block mb-1">Sessionpreis (€)</label><input required={!shortSessionPrice} inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>',
);
if (!text.includes('Zahlungsart vor Ort')) {
  const marker = '<div><label className="eyebrow block mb-1">Anzahlung eingegangen am</label>';
  const block = `<div className={shortSessionPrice && depositExemptionReason === "spontaneous" ? "" : "hidden"}><label className="eyebrow block mb-1">Zahlungsart vor Ort</label><select value={onsiteMethod} onChange={(e) => setOnsiteMethod(e.target.value)} className="input-luxe !py-2"><option>Bar</option><option>PayPal</option><option>Überweisung</option><option>Karte</option><option>Sonstige</option></select></div>`;
  text = text.replace(marker, block + marker);
} else {
  text = text.replace(/className=\{shortSessionPrice && shortPaymentPlan !== "advance" \? "" : "hidden"\}/g, 'className={shortSessionPrice && depositExemptionReason === "spontaneous" ? "" : "hidden"}');
}
text = text.replace(/\n    const effectiveDeposit =[^\n]*\n    const effectiveDepositExemptionReason =[^\n]*/g, "");
text = text.replace(/if \(!effectiveDepositExemptionReason && \(!Number\.isFinite\(effectiveDeposit\) \|\| effectiveDeposit <= 0 \|\| effectiveDeposit > total\)\)/g, 'if (!depositExemptionReason && (!Number.isFinite(deposit) || deposit <= 0 || deposit > total))');
text = text.replace(/if \(effectiveDeposit > 0 && \(!depositMethod\.trim\(\) \|\| !depositPaidAt\)\)/g, 'if (!depositExemptionReason && (!depositMethod.trim() || !depositPaidAt))');
text = text.replace(/deposit_amount: effectiveDeposit,/g, 'deposit_amount: depositExemptionReason ? 0 : deposit,');
text = text.replace(/deposit_paid_at: effectiveDeposit > 0 \? depositPaidAt : null,/g, 'deposit_paid_at: depositExemptionReason ? null : depositPaidAt,');
text = text.replace(/deposit_exemption_reason: effectiveDepositExemptionReason,/g, 'deposit_exemption_reason: depositExemptionReason,');
text = text.replace(/if \(effectiveDeposit < total && created && typeof created === "object" && "slot_id" in created\) \{/g, 'if (depositExemptionReason && created && typeof created === "object" && "slot_id" in created) {');
text = text.replace(/restzahlung_method: shortSessionPrice \? onsiteMethod\.trim\(\) : depositMethod\.trim\(\),/g, 'restzahlung_method: shortSessionPrice && depositExemptionReason === "spontaneous" ? onsiteMethod.trim() : depositMethod.trim(),');
text = text.replace(/restzahlung_method: depositMethod\.trim\(\),/g, 'restzahlung_method: shortSessionPrice && depositExemptionReason === "spontaneous" ? onsiteMethod.trim() : depositMethod.trim(),');
text = text.replace(/\n      setShortPaymentPlan\("onsite"\);/g, "");
if (!text.includes('setOnsiteMethod("Bar")')) text = text.replace('      setShortSessionPrice("");', '      setShortSessionPrice("");\n      setOnsiteMethod("Bar");');

if (text !== before) { writeFileSync(path, text); console.log("Short-session payment form simplified."); }
else console.log("Short-session payment form already simplified.");

// Only the safe remove patch runs here. The larger cashbook payment rewrite is
// disabled until it can be moved out of prebuild without generating invalid TSX.
await import("./add-cashbook-remove-only.mjs");
