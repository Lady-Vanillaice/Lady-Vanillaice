import fs from "node:fs";

const path = "src/routes/_authenticated/admin.buchung.$id.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace(
  /\nconst PREPARATION_ITEMS = \[[\s\S]*?\] as const;\n/,
  "\n",
);

source = source.replace(
  /\n  function preparationDone\(item: string\) \{[\s\S]*?\n  function preparationDoneFrom\(value: string, item: string\) \{[\s\S]*?\n  \}\n/,
  "\n",
);

source = source.replace(
  /\n          \{\/\* INTERNE NOTIZ — editierbar \*\/\}\n\n          <div className="bg-card border border-champagne\/30 p-6 mb-6">[\s\S]*?\n          <\/div>\n(?=\n          \{\/\*)/,
  "\n",
);

if (source.includes("Termin-Vorbereitung") || source.includes("PREPARATION_ITEMS") || source.includes("preparationDone(")) {
  throw new Error("Termin-Vorbereitung konnte nicht vollständig entfernt werden.");
}

fs.writeFileSync(path, source);
console.log("Termin-Vorbereitung checklist removed from Termin & Zahlung.");

await import("./fix-customer-name-persistence.mjs");
