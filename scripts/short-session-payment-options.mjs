import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/admin/admin-shared.tsx";
let text = readFileSync(path, "utf8");
const before = text;

// Give short sessions the same flexible payment flow as full appointments:
// 1) Vorkasse, 2) Zahlung vor Ort, 3) Vorkasse + Zahlung vor Ort.
if (!text.includes('const [shortPaymentPlan, setShortPaymentPlan]')) {
  text = text.replace(
    '  const [shortSessionPrice, setShortSessionPrice] = useState("");',
    '  const [shortSessionPrice, setShortSessionPrice] = useState("");\n  const [shortPaymentPlan, setShortPaymentPlan] = useState<"advance" | "onsite" | "split">("onsite");\n  const [onsiteMethod, setOnsiteMethod] = useState("Bar");',
  );
}

// Short-session selector keeps the selected price, but payment is configured separately.
text = text.replace(
  /<div><label className="eyebrow block mb-1">Kurzsession<\/label><select value=\{shortSessionPrice\} onChange=\{\(e\) => \{ const value = e\.target\.value; setShortSessionPrice\(value\); if \(value\) setTotalAmount\(value\); \}\} className="input-luxe !py-2"><option value="">Preis auswählen<\/option><option value="60">60 €<\/option><option value="75">75 €<\/option><option value="100">100 €<\/option><\/select><\/div>/g,
  `<div><label className="eyebrow block mb-1">Kurzsession</label><select value={shortSessionPrice} onChange={(e) => { const value = e.target.value; setShortSessionPrice(value); if (value) { setTotalAmount(value); if (shortPaymentPlan === "onsite") setDepositAmount("0"); } }} className="input-luxe !py-2"><option value="">Preis auswählen</option><option value="60">60 €</option><option value="75">75 €</option><option value="100">100 €</option></select></div>`,
);

// Add a short-session payment plan next to the short-session price selector.
if (!text.includes('Zahlungsweise Kurzsession')) {
  const marker = '<div><label className="eyebrow block mb-1">Anzahlungsregel</label>';
  const block = `<div className={shortSessionPrice ? "" : "hidden"}><label className="eyebrow block mb-1">Zahlungsweise Kurzsession</label><select value={shortPaymentPlan} onChange={(e) => { const plan = e.target.value as "advance" | "onsite" | "split"; setShortPaymentPlan(plan); if (plan === "onsite") { setDepositAmount("0"); setDepositExemptionReason("spontaneous"); } else { setDepositExemptionReason(null); if (plan === "advance" && totalAmount) setDepositAmount(totalAmount); } }} className="input-luxe !py-2"><option value="onsite">Nur Zahlung vor Ort</option><option value="advance">Nur Vorkasse</option><option value="split">Vorkasse + Zahlung vor Ort</option></select></div>`;
  text = text.replace(marker, block + marker);
}

// Add a separate payment method for the amount due at the appointment.
if (!text.includes('Zahlungsart vor Ort')) {
  const marker = '<div><label className="eyebrow block mb-1">Anzahlung eingegangen am</label>';
  const block = `<div className={shortSessionPrice && shortPaymentPlan !== "advance" ? "" : "hidden"}><label className="eyebrow block mb-1">Zahlungsart vor Ort</label><select value={onsiteMethod} onChange={(e) => setOnsiteMethod(e.target.value)} className="input-luxe !py-2"><option>Bar</option><option>PayPal</option><option>Überweisung</option><option>Karte</option><option>Sonstige</option></select></div>`;
  text = text.replace(marker, block + marker);
}

// Normalize the values before validation/submission. This keeps the existing DB
// model compatible: Vorkasse is deposit_amount, the remainder is total - deposit,
// and restzahlung_method stores how the remainder is paid at the appointment.
if (!text.includes('const effectiveDeposit =')) {
  text = text.replace(
    '    const total = Number(totalAmount.replace(",", "."));\n    const deposit = Number(depositAmount.replace(",", "."));',
    `    const total = Number(totalAmount.replace(",", "."));\n    const deposit = Number(depositAmount.replace(",", "."));\n    const effectiveDeposit = shortSessionPrice && shortPaymentPlan === "onsite" ? 0 : shortSessionPrice && shortPaymentPlan === "advance" ? total : deposit;\n    const effectiveDepositExemptionReason = shortSessionPrice && shortPaymentPlan === "onsite" ? "spontaneous" as const : shortSessionPrice ? null : depositExemptionReason;`,
  );
}

text = text.replace(
  /if \(!depositExemptionReason && \(!Number\.isFinite\(deposit\) \|\| deposit <= 0 \|\| deposit > total\)\)/g,
  'if (!effectiveDepositExemptionReason && (!Number.isFinite(effectiveDeposit) || effectiveDeposit <= 0 || effectiveDeposit > total))',
);
text = text.replace(
  /if \(!depositExemptionReason && \(!depositMethod\.trim\(\) \|\| !depositPaidAt\)\)/g,
  'if (effectiveDeposit > 0 && (!depositMethod.trim() || !depositPaidAt))',
);

text = text.replace(
  /deposit_amount: depositExemptionReason \? 0 : deposit,/g,
  'deposit_amount: effectiveDeposit,',
);
text = text.replace(
  /deposit_paid_at: depositExemptionReason \? null : depositPaidAt,/g,
  'deposit_paid_at: effectiveDeposit > 0 ? depositPaidAt : null,',
);
text = text.replace(
  /deposit_exemption_reason: depositExemptionReason,/g,
  'deposit_exemption_reason: effectiveDepositExemptionReason,',
);

// Persist the onsite method whenever any amount remains due at the appointment,
// including split-payment short sessions.
text = text.replace(
  /if \(depositExemptionReason && created && typeof created === "object" && "slot_id" in created\) \{/g,
  'if (effectiveDeposit < total && created && typeof created === "object" && "slot_id" in created) {',
);
text = text.replace(
  /restzahlung_method: depositMethod\.trim\(\),/g,
  'restzahlung_method: shortSessionPrice ? onsiteMethod.trim() : depositMethod.trim(),',
);

// Reset the extra controls after creating a manual appointment.
if (!text.includes('setShortPaymentPlan("onsite")')) {
  text = text.replace(
    '      setShortSessionPrice("");',
    '      setShortSessionPrice("");\n      setShortPaymentPlan("onsite");\n      setOnsiteMethod("Bar");',
  );
}

if (text !== before) {
  writeFileSync(path, text);
  console.log("Short-session payment options applied.");
} else {
  console.log("Short-session payment options already present.");
}
