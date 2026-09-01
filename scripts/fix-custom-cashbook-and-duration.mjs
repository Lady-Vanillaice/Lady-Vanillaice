import fs from "node:fs";

function patch(path, before, after, label) {
  let text = fs.readFileSync(path, "utf8");
  if (text.includes(after)) return;
  if (!text.includes(before)) throw new Error(`[custom-cashbook] target not found: ${label}`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

// Custom form: make the two different durations explicit.
const customForm = "src/components/admin/custom-content-form.tsx";
patch(
  customForm,
  `  const [error, setError] = useState<string | null>(null);\n  const [success, setSuccess] = useState(false);`,
  `  const [error, setError] = useState<string | null>(null);\n  const [success, setSuccess] = useState(false);\n\n  const productionMinutes = useMemo(() => {\n    if (!start || !end) return 0;\n    const [sh, sm] = start.split(":").map(Number);\n    const [eh, em] = end.split(":").map(Number);\n    let minutes = eh * 60 + em - (sh * 60 + sm);\n    if (minutes <= 0) minutes += 24 * 60;\n    return minutes;\n  }, [start, end]);\n  const productionDurationLabel = productionMinutes >= 60\n    ? \`${'${Math.floor(productionMinutes / 60)}'} Std. ${'${productionMinutes % 60 ? `${productionMinutes % 60} Min.` : ""}'}\`.trim()\n    : \`${'${productionMinutes}'} Min.\`;`,
  "production duration calculation",
);
patch(
  customForm,
  `        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">\n          <div>\n            <label className="eyebrow block mb-1">Anzahl Bilder (optional)</label>`,
  `        <div className="mb-2">\n          <div className="eyebrow text-champagne">Umfang des fertigen Contents</div>\n          <p className="mt-1 text-xs text-vanilla/50">Hier geht es um das Ergebnis für den Kunden – nicht darum, wie lange du für die Produktion brauchst.</p>\n        </div>\n        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">\n          <div>\n            <label className="eyebrow block mb-1">Anzahl fertige Bilder (optional)</label>`,
  "content output heading",
);
patch(
  customForm,
  `<label className="eyebrow block mb-1">Video in Minuten (optional)</label>`,
  `<label className="eyebrow block mb-1">Dauer des fertigen Videos (Minuten, optional)</label>`,
  "video duration label",
);
patch(
  customForm,
  `        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">\n          <div>\n            <label className="eyebrow block mb-1">Produktionsdatum</label>`,
  `        <div className="mb-2">\n          <div className="eyebrow text-champagne">Deine Produktionszeit</div>\n          <p className="mt-1 text-xs text-vanilla/50">Diese Dauer ist nur für deinen Terminplan: wie lange du brauchst, um den Content zu produzieren.</p>\n        </div>\n        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">\n          <div>\n            <label className="eyebrow block mb-1">Produktionsdatum</label>`,
  "production time heading",
);
patch(
  customForm,
  `        <div>\n          <label className="eyebrow block mb-1">Ort / Studio</label>`,
  `        <div className="border border-champagne/20 bg-champagne/[0.04] px-3 py-2 text-sm">\n          <span className="text-vanilla/50">Geplante Produktionsdauer:</span> <strong className="text-champagne">${'${productionDurationLabel}'}</strong>\n        </div>\n\n        <div>\n          <label className="eyebrow block mb-1">Ort / Studio</label>`,
  "production duration display",
);

// Cashbook server mapping: Custom is prepaid-only and its visible duration is the delivered content, not production time.
const cashbookLib = "src/lib/cashbook.functions.ts";
patch(
  cashbookLib,
  `function durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {`,
  `function customOutputLabel(note: string | null | undefined) {\n  const raw = note ?? "";\n  const images = raw.match(/Anzahl Bilder:\\s*(\\d+)/i)?.[1] ?? null;\n  const video = raw.match(/Videolänge:\\s*(\\d+)\\s*Minuten?/i)?.[1] ?? null;\n  return [images ? \`${'${images}'} Bilder\` : null, video ? \`Video ${'${video}'} Min.\` : null].filter(Boolean).join(" · ") || "—";\n}\n\nfunction durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {`,
  "custom output parser",
);
patch(
  cashbookLib,
  `      const status: CashBookEntry["status"] = b.status === "cancelled" ? "cancelled" : b.status === "rescheduling" ? "rescheduling" : b.fully_paid || b.completed_at ? "completed" : "open";\n      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`,
  `      const status: CashBookEntry["status"] = b.status === "cancelled" ? "cancelled" : b.status === "rescheduling" ? "rescheduling" : b.fully_paid || b.completed_at ? "completed" : "open";\n      const isCustomContent = b.duration === "Custom Content";\n      const art = isCustomContent ? "Custom" : slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`,
  "custom booking detection",
);
patch(
  cashbookLib,
  `        kunde: b.guest_name, art, dauer: durationLabel(b.duration_minutes, b.duration),\n        anzahlung_vorgemerkt: plannedDeposit,`,
  `        kunde: b.guest_name, art, dauer: isCustomContent ? customOutputLabel(b.admin_note) : durationLabel(b.duration_minutes, b.duration),\n        anzahlung_vorgemerkt: plannedDeposit,`,
  "custom duration output",
);
patch(
  cashbookLib,
  `        restbetrag_vorgemerkt: plannedCash, restzahlung_method: onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),\n        bar_datum: cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),`,
  `        restbetrag_vorgemerkt: isCustomContent ? 0 : plannedCash, restzahlung_method: isCustomContent ? null : onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),\n        bar_datum: isCustomContent ? null : cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),`,
  "custom no onsite balance",
);
patch(
  cashbookLib,
  `      const receivedCash = cashDate ? plannedCash : 0;`,
  `      const receivedCash = isCustomContent ? 0 : cashDate ? plannedCash : 0;`,
  "custom no received cash",
);

// Cashbook UI: label Custom as full prepayment, never as deposit / onsite payment.
const cashbookUi = "src/routes/_authenticated/admin.kassenbuch.tsx";
patch(
  cashbookUi,
  `  const paymentLabel = (e: CashBookEntry) => isFinancialSlave(e) ? "Zahlsklave" : e.source === "booking" ? "Buchung" : "Manuelle Zahlung";`,
  `  const isCustomContent = (e: CashBookEntry) => e.art === "Custom" || e.art === "Custom Content" || e.studio === "Custom Content";\n  const paymentLabel = (e: CashBookEntry) => isFinancialSlave(e) ? "Zahlsklave" : isCustomContent(e) ? "Custom" : e.source === "booking" ? "Buchung" : "Manuelle Zahlung";`,
  "custom payment label helper",
);
patch(
  cashbookUi,
  `  const paymentMethodText = (e: CashBookEntry) => [e.anzahlung > 0 || e.anzahlung_vorgemerkt > 0 ? \`Anz. ${'${depositText(e)}'}\` : e.deposit_exemption_reason ? depositText(e) : null, e.bar > 0 || e.restbetrag_vorgemerkt > 0 ? \`Vor Ort ${'${restMethodFor(e) ?? "—"}'}\` : null].filter(Boolean).join(" · ") || "—";`,
  `  const paymentMethodText = (e: CashBookEntry) => isCustomContent(e)\n    ? (e.anzahlung > 0 || e.anzahlung_vorgemerkt > 0 ? \`Vorauszahlung ${'${e.anzahlung_method ?? "—"}'}\` : "Vorauszahlung offen")\n    : [e.anzahlung > 0 || e.anzahlung_vorgemerkt > 0 ? \`Anz. ${'${depositText(e)}'}\` : e.deposit_exemption_reason ? depositText(e) : null, e.bar > 0 || e.restbetrag_vorgemerkt > 0 ? \`Vor Ort ${'${restMethodFor(e) ?? "—"}'}\` : null].filter(Boolean).join(" · ") || "—";`,
  "custom payment method text",
);
patch(
  cashbookUi,
  `  const paymentDateText = (e: CashBookEntry) => [e.anzahlung_datum ? \`Anz. ${'${dateLabel(e.anzahlung_datum)}'}\` : null, e.bar_datum ? \`Vor Ort ${'${dateLabel(e.bar_datum)}'}\` : null].filter(Boolean).join(" · ") || "—";`,
  `  const paymentDateText = (e: CashBookEntry) => isCustomContent(e)\n    ? (e.anzahlung_datum ? \`Vorauszahlung ${'${dateLabel(e.anzahlung_datum)}'}\` : "—")\n    : [e.anzahlung_datum ? \`Anz. ${'${dateLabel(e.anzahlung_datum)}'}\` : null, e.bar_datum ? \`Vor Ort ${'${dateLabel(e.bar_datum)}'}\` : null].filter(Boolean).join(" · ") || "—";`,
  "custom payment date text",
);
patch(
  cashbookUi,
  `  const bookingAmountText = (e: CashBookEntry) => e.source === "booking" ? [\`Anz. ${'${eur(e.anzahlung)}'}\`, openBalance(e) > 0 ? \`${'${eur(openBalance(e))}'} offen\` : e.bar > 0 ? \`Rest ${'${eur(e.bar)}'}\` : null].filter(Boolean).join(" · ") : eur(e.gesamt);`,
  `  const bookingAmountText = (e: CashBookEntry) => isCustomContent(e)\n    ? \`Vorauszahlung ${'${eur(e.anzahlung || e.anzahlung_vorgemerkt)}'}\`\n    : e.source === "booking" ? [\`Anz. ${'${eur(e.anzahlung)}'}\`, openBalance(e) > 0 ? \`${'${eur(openBalance(e))}'} offen\` : e.bar > 0 ? \`Rest ${'${eur(e.bar)}'}\` : null].filter(Boolean).join(" · ") : eur(e.gesamt);`,
  "custom amount text",
);

console.log("Custom cashbook payment semantics and duration labels fixed.");
