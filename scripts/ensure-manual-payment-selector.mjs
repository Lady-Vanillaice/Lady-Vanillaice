import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/admin/admin-shared.tsx";
let text = readFileSync(path, "utf8");
const before = text;

// Keep the payment method selectable for every manual booking, including
// spontaneous/no-deposit appointments. Older prebuild patches used to render
// this select disabled for deposit exemptions.
text = text.replace(
  /<div><label className="eyebrow block mb-1">Zahlungsart<\/label><select disabled=\{Boolean\(depositExemptionReason\)\} value=\{depositMethod\} onChange=\{\(e\) => setDepositMethod\(e\.target\.value\)\} className="input-luxe !py-2 disabled:opacity-40">/g,
  '<div><label className="eyebrow block mb-1">{depositExemptionReason ? "Zahlungsart Restzahlung" : "Zahlungsart Anzahlung"}</label><select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="input-luxe !py-2">',
);

// A selected method must survive form submission. For no-deposit bookings it
// is subsequently persisted as restzahlung_method.
text = text.replace(
  /deposit_method: depositExemptionReason \? null : depositMethod\.trim\(\),/g,
  "deposit_method: depositMethod.trim(),",
);

const requiredMarkers = [
  'depositExemptionReason ? "Zahlungsart Restzahlung" : "Zahlungsart Anzahlung"',
  "deposit_method: depositMethod.trim(),",
  "updateBookingRestPaymentMethodBySlotFn",
  "restzahlung_method: depositMethod.trim(),",
];

for (const marker of requiredMarkers) {
  if (!text.includes(marker)) {
    throw new Error(`Zahlungslogik im manuellen Terminformular fehlt nach Prebuild: ${marker}`);
  }
}

if (text !== before) {
  writeFileSync(path, text);
  console.log("Manual payment selector restored after prebuild patches.");
} else {
  console.log("Manual payment selector already stable.");
}
