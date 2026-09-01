import fs from "node:fs";

function patch(path, before, after, label) {
  let text = fs.readFileSync(path, "utf8");
  if (text.includes(after)) return;
  if (!text.includes(before)) throw new Error(`[custom-cashbook] target not found: ${label}`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

function optionalPatch(path, before, after) {
  let text = fs.readFileSync(path, "utf8");
  if (text.includes(after) || !text.includes(before)) return;
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

// CUSTOM FORM: clearly separate production time from delivered video/image scope.
const customForm = "src/components/admin/custom-content-form.tsx";
patch(
  customForm,
  `  const [error, setError] = useState<string | null>(null);\n  const [success, setSuccess] = useState(false);`,
  `  const [error, setError] = useState<string | null>(null);\n  const [success, setSuccess] = useState(false);\n\n  const productionMinutes = useMemo(() => {\n    if (!start || !end) return 0;\n    const [sh, sm] = start.split(":").map(Number);\n    const [eh, em] = end.split(":").map(Number);\n    let minutes = eh * 60 + em - (sh * 60 + sm);\n    if (minutes <= 0) minutes += 24 * 60;\n    return minutes;\n  }, [start, end]);\n  const productionDurationLabel = productionMinutes >= 60\n    ? \`${'${Math.floor(productionMinutes / 60)}'} Std. ${'${productionMinutes % 60 ? `${productionMinutes % 60} Min.` : ""}'}\`.trim()\n    : \`${'${productionMinutes}'} Min.\`;`,
  "production duration calculation",
);
optionalPatch(
  customForm,
  `<label className="eyebrow block mb-1">Anzahl Bilder (optional)</label>`,
  `<label className="eyebrow block mb-1">Anzahl fertige Bilder (optional)</label>`,
);
optionalPatch(
  customForm,
  `<label className="eyebrow block mb-1">Video in Minuten (optional)</label>`,
  `<label className="eyebrow block mb-1">Dauer des fertigen Videos (Minuten, optional)</label>`,
);
optionalPatch(
  customForm,
  `        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">\n          <div>\n            <label className="eyebrow block mb-1">Anzahl fertige Bilder (optional)</label>`,
  `        <div className="mb-2">\n          <div className="eyebrow text-champagne">Umfang des fertigen Contents</div>\n          <p className="mt-1 text-xs text-vanilla/50">Das ist das Ergebnis für den Kunden: Anzahl Bilder und/oder Länge des fertigen Videos.</p>\n        </div>\n        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">\n          <div>\n            <label className="eyebrow block mb-1">Anzahl fertige Bilder (optional)</label>`,
);
optionalPatch(
  customForm,
  `        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">\n          <div>\n            <label className="eyebrow block mb-1">Produktionsdatum</label>`,
  `        <div className="mb-2">\n          <div className="eyebrow text-champagne">Deine Produktionszeit</div>\n          <p className="mt-1 text-xs text-vanilla/50">Diese Zeit ist nur für deinen Terminplan und sagt, wie lange du für die Produktion brauchst.</p>\n        </div>\n        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">\n          <div>\n            <label className="eyebrow block mb-1">Produktionsdatum</label>`,
);
optionalPatch(
  customForm,
  `        <div>\n          <label className="eyebrow block mb-1">Ort / Studio</label>`,
  `        <div className="border border-champagne/20 bg-champagne/[0.04] px-3 py-2 text-sm">\n          <span className="text-vanilla/50">Geplante Produktionsdauer:</span> <strong className="text-champagne">${'${productionDurationLabel}'}</strong>\n        </div>\n\n        <div>\n          <label className="eyebrow block mb-1">Ort / Studio</label>`,
);

// CASHBOOK DATA: Custom is full prepayment only. The displayed "Dauer" is the output,
// not the internal production duration.
const cashbookLib = "src/lib/cashbook.functions.ts";
patch(
  cashbookLib,
  `function durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {`,
  `function customOutputLabel(note: string | null | undefined) {\n  const raw = note ?? "";\n  const images = raw.match(/Anzahl Bilder:\\s*(\\d+)/i)?.[1] ?? null;\n  const video = raw.match(/Videolänge:\\s*(\\d+)\\s*Minuten?/i)?.[1] ?? null;\n  return [images ? \`${'${images}'} Bilder\` : null, video ? \`Video ${'${video}'} Min.\` : null].filter(Boolean).join(" · ") || "—";\n}\n\nfunction durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {`,
  "custom output parser",
);

// Existing legacy patch may already have simplified art to Custom based on is_content_shoot.
const artLegacy = `      const art = slot?.is_content_shoot ? "Custom" : slot?.is_duo ? "Duo" : "Single";`;
const artOriginal = `      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`;
const artReplacement = `      const isCustomContent = b.duration === "Custom Content" || Boolean(slot?.is_content_shoot);\n      const art = isCustomContent ? "Custom" : slot?.is_duo ? "Duo" : "Single";`;
optionalPatch(cashbookLib, artLegacy, artReplacement);
optionalPatch(cashbookLib, artOriginal, artReplacement);

patch(
  cashbookLib,
  `        kunde: b.guest_name, art, dauer: durationLabel(b.duration_minutes, b.duration),\n        anzahlung_vorgemerkt: plannedDeposit,`,
  `        kunde: b.guest_name, art, dauer: isCustomContent ? customOutputLabel(b.admin_note) : durationLabel(b.duration_minutes, b.duration),\n        anzahlung_vorgemerkt: plannedDeposit,`,
  "custom output in cashbook",
);
patch(
  cashbookLib,
  `        restbetrag_vorgemerkt: plannedCash, restzahlung_method: onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),\n        bar_datum: cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),`,
  `        restbetrag_vorgemerkt: isCustomContent ? 0 : plannedCash, restzahlung_method: isCustomContent ? null : onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),\n        bar_datum: isCustomContent ? null : cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),`,
  "no onsite payment for custom",
);
patch(
  cashbookLib,
  `      const receivedCash = cashDate ? plannedCash : 0;`,
  `      const receivedCash = isCustomContent ? 0 : cashDate ? plannedCash : 0;`,
  "no custom cash/rest payment",
);

// CASHBOOK UI: legacy custom patch already changes the wording. Extend its detector so manual
// Custom Content rows are covered too; no "Bar vor Ort" can leak through.
const cashbookUi = "src/routes/_authenticated/admin.kassenbuch.tsx";
optionalPatch(
  cashbookUi,
  `  const isCustom = (e: CashBookEntry) => e.art === "Custom" || e.art === "Custom Content";`,
  `  const isCustom = (e: CashBookEntry) => e.art === "Custom" || e.art === "Custom Content" || e.studio === "Custom Content";`,
);

console.log("Custom cashbook semantics and duration split fixed.");
