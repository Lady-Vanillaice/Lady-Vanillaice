import { readFileSync, writeFileSync } from "node:fs";

function patch(path, before, after, label) {
  let text = readFileSync(path, "utf8");
  if (text.includes(after)) return;
  if (!text.includes(before)) throw new Error(`[custom-cashbook] target not found: ${label}`);
  text = text.replace(before, after);
  writeFileSync(path, text);
}

// Buchungsdetails: Terminart bleibt Single/Duo. Custom wird ueber den vorhandenen Haken gesetzt.
const bookingDetail = "src/routes/_authenticated/admin.buchung.$id.tsx";
patch(
  bookingDetail,
  `  Zusätzlich Content\n</label>`,
  `  Custom\n</label>`,
  "rename custom checkbox",
);

// Kassenbuch: Content-/Custom-Buchungen nicht wie normale Single-Termine darstellen.
const cashbookLib = "src/lib/cashbook.functions.ts";
patch(
  cashbookLib,
  `      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`,
  `      const art = slot?.is_content_shoot ? "Custom" : slot?.is_duo ? "Duo" : "Single";`,
  "custom booking type in cashbook",
);

const cashbookUi = "src/routes/_authenticated/admin.kassenbuch.tsx";
patch(
  cashbookUi,
  `  const paymentLabel = (e: CashBookEntry) => isFinancialSlave(e) ? "Zahlsklave" : e.source === "booking" ? "Buchung" : "Manuelle Zahlung";`,
  `  const isCustom = (e: CashBookEntry) => e.art === "Custom" || e.art === "Custom Content";\n  const paymentLabel = (e: CashBookEntry) => isFinancialSlave(e) ? "Zahlsklave" : isCustom(e) ? "Custom" : e.source === "booking" ? "Buchung" : "Manuelle Zahlung";`,
  "custom payment label",
);
patch(
  cashbookUi,
  `  const paymentMethodText = (e: CashBookEntry) => [e.anzahlung > 0 || e.anzahlung_vorgemerkt > 0 ? \`Anz. \${depositText(e)}\` : e.deposit_exemption_reason ? depositText(e) : null, e.bar > 0 || e.restbetrag_vorgemerkt > 0 ? \`Vor Ort \${restMethodFor(e) ?? "—"}\` : null].filter(Boolean).join(" · ") || "—";`,
  `  const paymentMethodText = (e: CashBookEntry) => isCustom(e)\n    ? (e.anzahlung > 0 || e.anzahlung_vorgemerkt > 0 ? \`Vorauszahlung \${e.anzahlung_method ?? "—"}\` : "Vorauszahlung offen")\n    : [e.anzahlung > 0 || e.anzahlung_vorgemerkt > 0 ? \`Anz. \${depositText(e)}\` : e.deposit_exemption_reason ? depositText(e) : null, e.bar > 0 || e.restbetrag_vorgemerkt > 0 ? \`Vor Ort \${restMethodFor(e) ?? "—"}\` : null].filter(Boolean).join(" · ") || "—";`,
  "custom payment method wording",
);
patch(
  cashbookUi,
  `  const paymentDateText = (e: CashBookEntry) => [e.anzahlung_datum ? \`Anz. \${dateLabel(e.anzahlung_datum)}\` : null, e.bar_datum ? \`Vor Ort \${dateLabel(e.bar_datum)}\` : null].filter(Boolean).join(" · ") || "—";`,
  `  const paymentDateText = (e: CashBookEntry) => isCustom(e)\n    ? (e.anzahlung_datum ? \`Vorauszahlung \${dateLabel(e.anzahlung_datum)}\` : "Vorauszahlung offen")\n    : [e.anzahlung_datum ? \`Anz. \${dateLabel(e.anzahlung_datum)}\` : null, e.bar_datum ? \`Vor Ort \${dateLabel(e.bar_datum)}\` : null].filter(Boolean).join(" · ") || "—";`,
  "custom payment date wording",
);
patch(
  cashbookUi,
  `  const bookingAmountText = (e: CashBookEntry) => e.source === "booking" ? [\`Anz. \${eur(e.anzahlung)}\`, openBalance(e) > 0 ? \`\${eur(openBalance(e))} offen\` : e.bar > 0 ? \`Rest \${eur(e.bar)}\` : null].filter(Boolean).join(" · ") : eur(e.gesamt);`,
  `  const bookingAmountText = (e: CashBookEntry) => isCustom(e)\n    ? \`Vorauszahlung \${bookingAmount(e.anzahlung, e.anzahlung_vorgemerkt)}\`\n    : e.source === "booking" ? [\`Anz. \${eur(e.anzahlung)}\`, openBalance(e) > 0 ? \`\${eur(openBalance(e))} offen\` : e.bar > 0 ? \`Rest \${eur(e.bar)}\` : null].filter(Boolean).join(" · ") : eur(e.gesamt);`,
  "custom amount wording",
);

console.log("Custom checkbox and cashbook display patched.");
await import("./fix-custom-detail-payment-detection.mjs");
