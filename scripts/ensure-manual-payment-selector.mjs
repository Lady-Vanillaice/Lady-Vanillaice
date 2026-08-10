import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/admin/admin-shared.tsx";
let text = readFileSync(path, "utf8");
const before = text;

// This script runs LAST in prebuild. Older patch scripts may rewrite parts of
// ManualBookingForm. Instead of failing production, restore the payment logic
// that must always be present afterwards.

// 1) Required imports.
if (!text.includes('import { useServerFn } from "@tanstack/react-start";')) {
  text = text.replace(
    'import { Link } from "@tanstack/react-router";',
    'import { Link } from "@tanstack/react-router";\nimport { useServerFn } from "@tanstack/react-start";',
  );
}
if (!text.includes('updateBookingRestPaymentMethodBySlot')) {
  const anchor = 'import { DEFAULT_STUDIOS, type StudioOption } from "@/lib/studio.functions";';
  if (text.includes(anchor)) {
    text = text.replace(
      anchor,
      `${anchor}\nimport { updateBookingRestPaymentMethodBySlot } from "@/lib/rest-payment.functions";`,
    );
  }
}

// 2) Server function hook inside ManualBookingForm.
if (!text.includes("updateRestPaymentMethodBySlotFn")) {
  text = text.replace(
    /export function ManualBookingForm\(\{([\s\S]*?)\}\) \{\n/,
    (match) => `${match}  const updateRestPaymentMethodBySlotFn = useServerFn(updateBookingRestPaymentMethodBySlot);\n`,
  );
}

// 3) Always keep the payment method selectable. Naming is deliberately about
//    the actual payment phase, not about the exemption rule.
text = text.replace(
  /<div><label className="eyebrow block mb-1">Zahlungsart<\/label><select disabled=\{Boolean\(depositExemptionReason\)\} value=\{depositMethod\} onChange=\{\(e\) => setDepositMethod\(e\.target\.value\)\} className="input-luxe !py-2 disabled:opacity-40">/g,
  '<div><label className="eyebrow block mb-1">{depositExemptionReason ? "Zahlungsart Zahlung vor Ort" : "Zahlungsart Vorkasse"}</label><select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="input-luxe !py-2">',
);
text = text.replace(
  /\{depositExemptionReason \? "Zahlungsart Restzahlung" : "Zahlungsart Anzahlung"\}/g,
  '{depositExemptionReason ? "Zahlungsart Zahlung vor Ort" : "Zahlungsart Vorkasse"}',
);

// 4) Preserve the selected method in form submission.
text = text.replace(
  /deposit_method: depositExemptionReason \? null : depositMethod\.trim\(\),/g,
  "deposit_method: depositMethod.trim(),",
);

// 5) Capture create result so a no-deposit booking can persist its payment
//    method as the payment-at-appointment method.
text = text.replace(
  /\n\s*await onCreate\(\{/,
  (match) => match.replace("await onCreate({", "const created = await onCreate({"),
);

// 6) If an older prebuild patch removed the persistence block, restore it
//    immediately before the success-state reset.
if (!text.includes("restzahlung_method: depositMethod.trim()")) {
  const successMarker = "      setOk(true);";
  const persistence = `      if (depositExemptionReason && created && typeof created === "object" && "slot_id" in created) {\n        const slotId = (created as { slot_id?: unknown }).slot_id;\n        if (typeof slotId === "string") {\n          await updateRestPaymentMethodBySlotFn({\n            data: {\n              slot_id: slotId,\n              restzahlung_method: depositMethod.trim(),\n            },\n          });\n        }\n      }\n\n`;
  if (text.includes(successMarker)) {
    text = text.replace(successMarker, persistence + successMarker);
  }
}

// Only fail for a truly unrepairable form. These are the minimum guarantees
// needed for a safe production build.
const requiredMarkers = [
  "deposit_method: depositMethod.trim(),",
  "restzahlung_method: depositMethod.trim(),",
  "updateRestPaymentMethodBySlotFn",
];
for (const marker of requiredMarkers) {
  if (!text.includes(marker)) {
    throw new Error(`Manuelles Zahlungsformular konnte nicht repariert werden: ${marker}`);
  }
}

if (text !== before) {
  writeFileSync(path, text);
  console.log("Manual payment form repaired after legacy prebuild patches.");
} else {
  console.log("Manual payment form already stable.");
}

// Keep the cashbook delete option stable as well. This patch only hides a
// booking from the cashbook; it never deletes the appointment or customer.
await import("./add-cashbook-booking-delete.mjs");
