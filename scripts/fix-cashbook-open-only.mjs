import fs from "node:fs";

const path = "src/routes/_authenticated/admin.kassenbuch.tsx";
let source = fs.readFileSync(path, "utf8");

const before = '  const activeIncomeEntries = incomeEntries.filter(e => e.status !== "completed");';
const after = '  const activeIncomeEntries = incomeEntries.filter(e => e.status === "open");';

if (source.includes(before)) {
  source = source.replace(before, after);
} else if (!source.includes(after)) {
  throw new Error("Cashbook open-only patch could not be applied");
}

fs.writeFileSync(path, source);
console.log("Cashbook pending list now shows only open entries.");
