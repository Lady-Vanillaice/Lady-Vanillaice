import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.kassenbuch.tsx";
let source = readFileSync(path, "utf8");
const marker = "const allPastIncomeEntries =";

if (!source.includes(marker)) {
  const anchor = "  const receivedIncomeEntries =";
  if (!source.includes(anchor)) throw new Error("Cashbook all-history final patch: received income marker missing");
  const declaration = '  const allPastIncomeEntries = data.filter(e => e.entry_type === "income" && !(e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) && (e.status === "completed" || e.status === "cancelled" || e.termin_datum < today())).sort((a, b) => (b.termin_start ?? b.termin_datum).localeCompare(a.termin_start ?? a.termin_datum));\n';
  source = source.replace(anchor, declaration + anchor);

  const headings = [
    "Vergangene / stornierte Termine ({completedIncomeEntries.length})",
    "Vergangene Termine ({completedIncomeEntries.length})",
  ];
  const heading = headings.find(value => source.includes(value));
  if (!heading) throw new Error("Cashbook all-history final patch: archive heading missing");
  const split = source.indexOf(heading);
  const before = source.slice(0, split);
  let after = source.slice(split).replaceAll("completedIncomeEntries", "allPastIncomeEntries");
  after = after.replace("Vergangene / stornierte Termine ({allPastIncomeEntries.length})", "Alle vergangenen / stornierten Termine ({allPastIncomeEntries.length})");
  after = after.replace("Vergangene Termine ({allPastIncomeEntries.length})", "Alle vergangenen / stornierten Termine ({allPastIncomeEntries.length})");
  source = before + after;
  writeFileSync(path, source);
}

console.log("Cashbook archive now shows all past/cancelled loaded entries across months.");
