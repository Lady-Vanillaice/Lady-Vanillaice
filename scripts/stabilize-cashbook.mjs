import { readFileSync, writeFileSync } from "node:fs";

const cashbookPath = "src/lib/cashbook.functions.ts";
const uiPath = "src/routes/_authenticated/admin.kassenbuch.tsx";

let cashbook = readFileSync(cashbookPath, "utf8");

if (!cashbook.includes("function customOutputLabel(")) {
  const marker = "function durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {";
  if (!cashbook.includes(marker)) throw new Error("Cashbook stabilization: durationLabel marker missing");
  cashbook = cashbook.replace(
    marker,
    `function customOutputLabel(note: string | null | undefined) {\n  const raw = note ?? \"\";\n  const images = raw.match(/Anzahl Bilder:\\s*(\\d+)/i)?.[1] ?? null;\n  const video = raw.match(/Videolänge:\\s*(\\d+)\\s*Minuten?/i)?.[1] ?? null;\n  return [images ? images + \" Bilder\" : null, video ? \"Video \" + video + \" Min.\" : null].filter(Boolean).join(\" · \") || \"—\";\n}\n\n${marker}`,
  );
}

const simpleArt = `      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`;
const stableArt = `      const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");\n      const hasCustomAddon = Boolean(slot?.is_content_shoot) || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? "") || (b.duration === "Custom Content" && !isPureCustomContent);\n      const art = isPureCustomContent ? "Custom" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");`;
if (cashbook.includes(simpleArt)) cashbook = cashbook.replace(simpleArt, stableArt);

const bookingsStart = cashbook.indexOf('    const bookings: CashBookEntry[] = (bookingRes.data ?? []).map((b: any) => {');
const bookingsEnd = bookingsStart >= 0 ? cashbook.indexOf('    return [...manual, ...bookings]', bookingsStart) : -1;
if (bookingsStart < 0 || bookingsEnd < 0) throw new Error("Cashbook stabilization: booking mapper missing");
let bookingBlock = cashbook.slice(bookingsStart, bookingsEnd);
const declaration = '      const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");';
if (bookingBlock.includes("isPureCustomContent") && !bookingBlock.includes(declaration)) {
  const statusMarker = '      const status: CashBookEntry["status"] = b.status === "cancelled" ? "cancelled" : b.status === "rescheduling" ? "rescheduling" : b.fully_paid || b.completed_at ? "completed" : "open";';
  if (!cashbook.includes(statusMarker)) throw new Error("Cashbook stabilization: status marker missing");
  cashbook = cashbook.replace(statusMarker, `${statusMarker}\n${declaration}`);
}

bookingBlock = cashbook.slice(bookingsStart, cashbook.indexOf('    return [...manual, ...bookings]', bookingsStart));
if (bookingBlock.includes("isPureCustomContent") && !bookingBlock.includes(declaration)) {
  throw new Error("Cashbook stabilization failed: isPureCustomContent is still undefined");
}

writeFileSync(cashbookPath, cashbook);

let ui = readFileSync(uiPath, "utf8");
const monthLine = '    const matchesMonth = !month || e.termin_datum.startsWith(month) || Boolean(e.anzahlung_datum?.startsWith(month)) || Boolean(e.bar_datum?.startsWith(month));';
if (!ui.includes("const isUnfinishedBooking =")) {
  if (!ui.includes(monthLine)) throw new Error("Cashbook stabilization: month filter marker missing");
  ui = ui.replace(monthLine, `${monthLine}\n    const isUnfinishedBooking = e.source === "booking" && e.entry_type === "income" && e.status !== "completed";`);
}
ui = ui.replace(
  '    return matchesMonth && (!studioFilter || e.studio === studioFilter)',
  '    return (matchesMonth || isUnfinishedBooking) && (!studioFilter || e.studio === studioFilter)',
);
if (!ui.includes('return (matchesMonth || isUnfinishedBooking)')) {
  throw new Error("Cashbook stabilization failed: unfinished bookings still depend on month");
}
writeFileSync(uiPath, ui);

console.log("Cashbook stabilized: runtime guard active and unfinished bookings remain visible across months.");