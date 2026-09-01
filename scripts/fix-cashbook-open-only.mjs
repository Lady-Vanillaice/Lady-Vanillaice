import fs from "node:fs";

const path = "src/routes/_authenticated/admin.kassenbuch.tsx";
let source = fs.readFileSync(path, "utf8");

const replacements = [
  {
    before: '  const activeIncomeEntries = incomeEntries.filter(e => e.status !== "completed");',
    after: '  const activeIncomeEntries = incomeEntries.filter(e => e.status === "open");',
    label: "open pending entries",
  },
  {
    before: '  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed");',
    after: '  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed" || e.status === "cancelled");',
    label: "past and cancelled entries",
  },
  {
    before: '            Vergangene Termine ({completedIncomeEntries.length})',
    after: '            Vergangene / stornierte Termine ({completedIncomeEntries.length})',
    label: "archive heading",
  },
];

for (const { before, after, label } of replacements) {
  if (source.includes(before)) source = source.replace(before, after);
  else if (!source.includes(after)) throw new Error(`Cashbook patch could not apply ${label}`);
}

const completedLine = '  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed" || e.status === "cancelled");';
const allPastLine = '  const allPastIncomeEntries = data.filter(e => e.entry_type === "income" && !(e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) && (e.status === "completed" || e.status === "cancelled" || e.termin_datum < today())).sort((a, b) => (b.termin_start ?? b.termin_datum).localeCompare(a.termin_start ?? a.termin_datum));';
if (!source.includes(allPastLine)) {
  if (!source.includes(completedLine)) throw new Error("Cashbook all-time archive: completed list marker missing");
  source = source.replace(completedLine, `${completedLine}\n${allPastLine}`);
  const splitAt = source.indexOf(allPastLine) + allPastLine.length;
  source = source.slice(0, splitAt) + source.slice(splitAt).replaceAll("completedIncomeEntries", "allPastIncomeEntries");
}
source = source.replace('Vergangene / stornierte Termine ({allPastIncomeEntries.length})', 'Alle vergangenen / stornierten Termine ({allPastIncomeEntries.length})');

fs.writeFileSync(path, source);
console.log("Cashbook pending list shows only open entries; the archive shows all past/cancelled entries across months.");

await import("./automate-booking-communication.mjs");
