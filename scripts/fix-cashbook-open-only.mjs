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
  if (source.includes(before)) {
    source = source.replace(before, after);
  } else if (!source.includes(after)) {
    throw new Error(`Cashbook patch could not apply ${label}`);
  }
}

fs.writeFileSync(path, source);
console.log("Cashbook pending list shows only open entries; completed and cancelled entries are grouped under past/cancelled appointments.");
