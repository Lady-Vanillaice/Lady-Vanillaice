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
  if (source.includes(old)) {
    source = source.replace(old, '            Alle vergangenen / stornierten Termine ({completedIncomeEntries.length})');
  }
}

if (!source.includes(activeFinal)) throw new Error("Cashbook all-history patch: open list shape not found");
if (!source.includes(archiveFinal)) throw new Error("Cashbook all-history patch: archive shape not found");

fs.writeFileSync(path, source);

// Load every historical booking regardless of lifecycle status. Keeping a harmless query
// condition preserves the existing chain/comma shape and makes this patch safe on repeat runs.
const libPath = "src/lib/cashbook.functions.ts";
let lib = fs.readFileSync(libPath, "utf8");
const oldStatusFilter = '        .in("status", ["confirmed", "cancelled", "rescheduling"]),';
const allStatusFilter = '        .not("id", "is", null),';
if (lib.includes(oldStatusFilter)) {
  lib = lib.replace(oldStatusFilter, allStatusFilter);
  fs.writeFileSync(libPath, lib);
} else if (!lib.includes(allStatusFilter)) {
  throw new Error("Cashbook all-history patch: booking query status filter not found");
}

console.log("Cashbook now loads all booking statuses and shows the complete all-time past/cancelled archive independent of the selected month.");

await import("./automate-booking-communication.mjs");
