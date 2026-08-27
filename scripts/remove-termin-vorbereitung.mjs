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

const checklistStart = `\n          {/* INTERNE NOTIZ — editierbar */}\n\n          <div className="bg-card border border-champagne/30 p-6 mb-6">`;
const nextCard = `\n\n          <div className="bg-card border border-champagne/15 p-6 mb-6">`;
const startIndex = source.indexOf(checklistStart);

if (startIndex >= 0) {
  const endIndex = source.indexOf(nextCard, startIndex + checklistStart.length);
  if (endIndex < 0) {
    throw new Error("Termin-Vorbereitung konnte nicht sicher abgegrenzt werden.");
  }
  source = source.slice(0, startIndex) + source.slice(endIndex);
}

if (source.includes("Termin-Vorbereitung") || source.includes("PREPARATION_ITEMS") || source.includes("preparationDone(")) {
  throw new Error("Termin-Vorbereitung konnte nicht vollständig entfernt werden.");
}

if (!source.includes("Termin überschreiben") || !source.includes("Termin speichern")) {
  throw new Error("Termin-Vorbereitung-Entfernung hat versehentlich den Termin-Editor entfernt.");
}

fs.writeFileSync(path, source);
console.log("Termin-Vorbereitung checklist removed; Termin-Editor preserved.");

await import("./fix-customer-name-persistence.mjs");
