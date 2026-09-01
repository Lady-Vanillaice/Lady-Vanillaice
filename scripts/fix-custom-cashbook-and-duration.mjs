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

// Cashbook: only a pure Custom Content order is prepaid-only.
// A normal Single/Duo session with Custom keeps the normal session payment logic.
// Legacy homepage requests may still have duration="Custom Content" without the dedicated
// Custom payment marker. Those are Session + Custom and must be visible as such even when
// the slot flag was never set in the old data.
const cashbookLib = "src/lib/cashbook.functions.ts";
replaceIfPresent(
  cashbookLib,
  `function durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {`,
  `function customOutputLabel(note: string | null | undefined) {\n  const raw = note ?? "";\n  const images = raw.match(/Anzahl Bilder:\\s*(\\d+)/i)?.[1] ?? null;\n  const video = raw.match(/Videolänge:\\s*(\\d+)\\s*Minuten?/i)?.[1] ?? null;\n  return [images ? images + " Bilder" : null, video ? "Video " + video + " Min." : null].filter(Boolean).join(" · ") || "—";\n}\n\nfunction durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {`,
);
replaceIfPresent(
  cashbookLib,
  `      const isPureCustomContent = b.duration === "Custom Content";\n      const hasCustomAddon = Boolean(slot?.is_content_shoot);\n      const art = isPureCustomContent ? "Custom" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");`,
  `      const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");\n      const hasCustomAddon = Boolean(slot?.is_content_shoot) || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? "") || (b.duration === "Custom Content" && !isPureCustomContent);\n      const art = isPureCustomContent ? "Custom" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");`,
);
replaceIfPresent(
  cashbookLib,
  `      const isCustomContent = b.duration === "Custom Content" || Boolean(slot?.is_content_shoot);\n      const art = isCustomContent ? "Custom" : slot?.is_duo ? "Duo" : "Single";`,
  `      const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");\n      const hasCustomAddon = Boolean(slot?.is_content_shoot) || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? "") || (b.duration === "Custom Content" && !isPureCustomContent);\n      const art = isPureCustomContent ? "Custom" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");`,
);
// Current main may still have the simple Single/Duo/Content art line. Define the
// pure-Custom flag there too before any later replacements reference it.
replaceIfPresent(
  cashbookLib,
  `      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`,
  `      const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");\n      const hasCustomAddon = Boolean(slot?.is_content_shoot) || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? "") || (b.duration === "Custom Content" && !isPureCustomContent);\n      const art = isPureCustomContent ? "Custom" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");`,
);
replaceIfPresent(
  cashbookLib,
  `        kunde: b.guest_name, art, dauer: isCustomContent ? customOutputLabel(b.admin_note) : durationLabel(b.duration_minutes, b.duration),\n        anzahlung_vorgemerkt: plannedDeposit,`,
  `        kunde: b.guest_name, art, dauer: isPureCustomContent ? customOutputLabel(b.admin_note) : durationLabel(b.duration_minutes, b.duration),\n        anzahlung_vorgemerkt: plannedDeposit,`,
);
replaceIfPresent(
  cashbookLib,
  `        restbetrag_vorgemerkt: isCustomContent ? 0 : plannedCash, restzahlung_method: isCustomContent ? null : onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),\n        bar_datum: isCustomContent ? null : cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),`,
  `        restbetrag_vorgemerkt: isPureCustomContent ? 0 : plannedCash, restzahlung_method: isPureCustomContent ? null : onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),\n        bar_datum: isPureCustomContent ? null : cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),`,
);
replaceIfPresent(cashbookLib, `      const receivedCash = isCustomContent ? 0 : cashDate ? plannedCash : 0;`, `      const receivedCash = isPureCustomContent ? 0 : cashDate ? plannedCash : 0;`);

// Existing Custom UI says Vorauszahlung only for pure Custom rows.
const cashbookUi = "src/routes/_authenticated/admin.kassenbuch.tsx";
replaceIfPresent(
  cashbookUi,
  `  const isCustom = (e: CashBookEntry) => e.art === "Custom" || e.art === "Custom Content" || e.studio === "Custom Content";`,
  `  const isCustom = (e: CashBookEntry) => e.art === "Custom" || e.art === "Custom Content" || e.studio === "Custom Content";`,
);

console.log("Pure Custom and Session + Custom are now separated in cashbook/payment logic, including legacy Custom requests.");
await import("./fix-custom-detail-payment-detection.mjs");
await import("./fix-session-custom-reminder.mjs");
