import fs from "node:fs";

const path = "src/routes/_authenticated/admin.kassenbuch.tsx";
let source = fs.readFileSync(path, "utf8");

const replacements = [
  {
    before: '  const activeIncomeEntries = incomeEntries.filter(e => e.status !== "completed");',
    after: '  const activeIncomeEntries = incomeEntries.filter(e => e.status === "open" && e.termin_datum >= today());',
    label: "open pending entries",
  },
  {
    before: '  const activeIncomeEntries = incomeEntries.filter(e => e.status === "open");',
    after: '  const activeIncomeEntries = incomeEntries.filter(e => e.status === "open" && e.termin_datum >= today());',
    label: "past appointments no longer stay open",
  },
  {
    before: '  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed");',
    after: '  const completedIncomeEntries = data.filter(e => e.entry_type === "income" && !(e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) && (e.status === "completed" || e.status === "cancelled" || e.termin_datum < today())).sort((a, b) => (b.termin_start ?? b.termin_datum).localeCompare(a.termin_start ?? a.termin_datum));',
    label: "complete archive",
  },
  {
    before: '  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed" || e.status === "cancelled");',
    after: '  const completedIncomeEntries = data.filter(e => e.entry_type === "income" && !(e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) && (e.status === "completed" || e.status === "cancelled" || e.termin_datum < today())).sort((a, b) => (b.termin_start ?? b.termin_datum).localeCompare(a.termin_start ?? a.termin_datum));',
    label: "all-time past and cancelled entries",
  },
  {
    before: '            Vergangene Termine ({completedIncomeEntries.length})',
    after: '            Alle vergangenen / stornierten Termine ({completedIncomeEntries.length})',
    label: "archive heading",
  },
  {
    before: '            Vergangene / stornierte Termine ({completedIncomeEntries.length})',
    after: '            Alle vergangenen / stornierten Termine ({completedIncomeEntries.length})',
    label: "all-time archive heading",
  },
];

for (const { before, after, label } of replacements) {
  if (source.includes(before)) {
    source = source.replace(before, after);
  } else if (!source.includes(after)) {
    // Some replacements are alternative source shapes. Only fail if neither the old nor final shape exists.
    if (!["past appointments no longer stay open", "all-time past and cancelled entries", "all-time archive heading"].includes(label)) {
      throw new Error(`Cashbook patch could not apply ${label}`);
    }
  }
}

fs.writeFileSync(path, source);

// The cashbook archive must be able to see every historical booking. Previously the server
// query only loaded confirmed/cancelled/rescheduling rows, so older records with another
// lifecycle status disappeared before the UI could classify them.
const libPath = "src/lib/cashbook.functions.ts";
let lib = fs.readFileSync(libPath, "utf8");
const statusFilter = '        .in("status", ["confirmed", "cancelled", "rescheduling"]),';
if (lib.includes(statusFilter)) {
  lib = lib.replace(statusFilter, '        ,');
  fs.writeFileSync(libPath, lib);
}

console.log("Cashbook now loads all booking statuses and shows the complete all-time past/cancelled archive independent of the selected month.");

await import("./automate-booking-communication.mjs");
