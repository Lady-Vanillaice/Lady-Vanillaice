import fs from "node:fs";

const path = "src/routes/_authenticated/admin.kassenbuch.tsx";
let source = fs.readFileSync(path, "utf8");

const activeFinal = '  const activeIncomeEntries = incomeEntries.filter(e => e.status === "open" && e.termin_datum >= today());';
for (const old of [
  '  const activeIncomeEntries = incomeEntries.filter(e => e.status !== "completed");',
  '  const activeIncomeEntries = incomeEntries.filter(e => e.status === "open");',
]) {
  if (source.includes(old)) source = source.replace(old, activeFinal);
}

const archiveFinal = '  const completedIncomeEntries = data.filter(e => e.entry_type === "income" && !(e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) && (e.status === "completed" || e.status === "cancelled" || e.termin_datum < today())).sort((a, b) => (b.termin_start ?? b.termin_datum).localeCompare(a.termin_start ?? a.termin_datum));';
for (const old of [
  '  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed");',
  '  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed" || e.status === "cancelled");',
]) {
  if (source.includes(old)) source = source.replace(old, archiveFinal);
}

for (const old of [
  '            Vergangene Termine ({completedIncomeEntries.length})',
  '            Vergangene / stornierte Termine ({completedIncomeEntries.length})',
]) {
  if (source.includes(old)) source = source.replace(old, '            Alle vergangenen / stornierten Termine ({completedIncomeEntries.length})');
}

if (!source.includes(activeFinal)) throw new Error("Cashbook all-history patch: open list shape not found");
if (!source.includes(archiveFinal)) throw new Error("Cashbook all-history patch: archive shape not found");

fs.writeFileSync(path, source);
console.log("Cashbook shows the all-time past/cancelled archive independent of the selected month while keeping the stable booking loader.");

await import("./automate-booking-communication.mjs");
