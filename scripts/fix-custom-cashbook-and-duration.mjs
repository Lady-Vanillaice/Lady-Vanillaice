import fs from "node:fs";

function replaceIfPresent(path, before, after) {
  let text = fs.readFileSync(path, "utf8");
  if (text.includes(after) || !text.includes(before)) return;
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

// Custom form: make the two meanings of "Dauer" explicit without changing booking logic.
const customForm = "src/components/admin/custom-content-form.tsx";
replaceIfPresent(customForm, `Anzahl Bilder (optional)`, `Anzahl fertige Bilder (optional)`);
replaceIfPresent(customForm, `Video in Minuten (optional)`, `Dauer des fertigen Videos (Minuten, optional)`);
replaceIfPresent(
  customForm,
  `        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">\n          <div>\n            <label className="eyebrow block mb-1">Anzahl fertige Bilder (optional)</label>`,
  `        <div className="mb-2">\n          <div className="eyebrow text-champagne">Umfang des fertigen Contents</div>\n          <p className="mt-1 text-xs text-vanilla/50">Hier trägst du ein, wie viele Bilder geliefert werden oder wie lang das fertige Video ist.</p>\n        </div>\n        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">\n          <div>\n            <label className="eyebrow block mb-1">Anzahl fertige Bilder (optional)</label>`,
);
replaceIfPresent(
  customForm,
  `        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">\n          <div>\n            <label className="eyebrow block mb-1">Produktionsdatum</label>`,
  `        <div className="mb-2">\n          <div className="eyebrow text-champagne">Produktionsdauer</div>\n          <p className="mt-1 text-xs text-vanilla/50">Von/Bis ist deine Arbeitszeit für die Produktion und bleibt getrennt von der Länge des fertigen Videos.</p>\n        </div>\n        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">\n          <div>\n            <label className="eyebrow block mb-1">Produktionsdatum</label>`,
);

// Cashbook: Custom is full prepayment only and "Dauer" means delivered output.
const cashbookLib = "src/lib/cashbook.functions.ts";
replaceIfPresent(
  cashbookLib,
  `function durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {`,
  `function customOutputLabel(note: string | null | undefined) {\n  const raw = note ?? "";\n  const images = raw.match(/Anzahl Bilder:\\s*(\\d+)/i)?.[1] ?? null;\n  const video = raw.match(/Videolänge:\\s*(\\d+)\\s*Minuten?/i)?.[1] ?? null;\n  return [images ? images + " Bilder" : null, video ? "Video " + video + " Min." : null].filter(Boolean).join(" · ") || "—";\n}\n\nfunction durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {`,
);
replaceIfPresent(
  cashbookLib,
  `      const art = slot?.is_content_shoot ? "Custom" : slot?.is_duo ? "Duo" : "Single";`,
  `      const isCustomContent = b.duration === "Custom Content" || Boolean(slot?.is_content_shoot);\n      const art = isCustomContent ? "Custom" : slot?.is_duo ? "Duo" : "Single";`,
);
replaceIfPresent(
  cashbookLib,
  `      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`,
  `      const isCustomContent = b.duration === "Custom Content" || Boolean(slot?.is_content_shoot);\n      const art = isCustomContent ? "Custom" : slot?.is_duo ? "Duo" : "Single";`,
);
replaceIfPresent(
  cashbookLib,
  `        kunde: b.guest_name, art, dauer: durationLabel(b.duration_minutes, b.duration),\n        anzahlung_vorgemerkt: plannedDeposit,`,
  `        kunde: b.guest_name, art, dauer: isCustomContent ? customOutputLabel(b.admin_note) : durationLabel(b.duration_minutes, b.duration),\n        anzahlung_vorgemerkt: plannedDeposit,`,
);
replaceIfPresent(
  cashbookLib,
  `        restbetrag_vorgemerkt: plannedCash, restzahlung_method: onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),\n        bar_datum: cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),`,
  `        restbetrag_vorgemerkt: isCustomContent ? 0 : plannedCash, restzahlung_method: isCustomContent ? null : onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),\n        bar_datum: isCustomContent ? null : cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),`,
);
replaceIfPresent(cashbookLib, `      const receivedCash = cashDate ? plannedCash : 0;`, `      const receivedCash = isCustomContent ? 0 : cashDate ? plannedCash : 0;`);

// Existing Custom UI already says Vorauszahlung; make sure manual Custom rows are detected too.
const cashbookUi = "src/routes/_authenticated/admin.kassenbuch.tsx";
replaceIfPresent(
  cashbookUi,
  `  const isCustom = (e: CashBookEntry) => e.art === "Custom" || e.art === "Custom Content";`,
  `  const isCustom = (e: CashBookEntry) => e.art === "Custom" || e.art === "Custom Content" || e.studio === "Custom Content";`,
);

console.log("Custom cashbook and duration wording updated.");
await import("./fix-custom-detail-payment-detection.mjs");
