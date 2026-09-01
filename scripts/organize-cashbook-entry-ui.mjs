import { readFileSync, writeFileSync } from "node:fs";

const backendPath = "src/lib/cashbook.functions.ts";
let backend = readFileSync(backendPath, "utf8");

if (!backend.includes('const OTHER_EXPENSE_PREFIX = "Sonstige Ausgabe:";')) {
  backend = backend.replace(
    'const ADVERTISING_LABEL = "Werbung";',
    'const ADVERTISING_LABEL = "Werbung";\nconst OTHER_EXPENSE_PREFIX = "Sonstige Ausgabe:";',
  );
}

const expenseDetectionBefore = '      const isAdvertising = e.kunde === ADVERTISING_LABEL || e.studio.trim().toLowerCase() === "ladies.de";\n      const expenseCategory = isAdvertising ? "advertising" : isStudioRent ? "studio_rent" : null;\n      const isExpense = Boolean(expenseCategory);';
const expenseDetectionAfter = '      const isAdvertising = e.kunde === ADVERTISING_LABEL || e.studio.trim().toLowerCase() === "ladies.de";\n      const isOtherExpense = typeof e.kunde === "string" && e.kunde.startsWith(OTHER_EXPENSE_PREFIX);\n      const otherExpensePurpose = isOtherExpense ? e.kunde.slice(OTHER_EXPENSE_PREFIX.length).trim() : null;\n      const expenseCategory = isAdvertising ? "advertising" : isStudioRent ? "studio_rent" : isOtherExpense ? "other" : null;\n      const isExpense = Boolean(expenseCategory);';
if (backend.includes(expenseDetectionBefore)) backend = backend.replace(expenseDetectionBefore, expenseDetectionAfter);

backend = backend.replace(
  '        art: isAdvertising ? ADVERTISING_LABEL : isStudioRent ? STUDIO_RENT_LABEL : e.studio === "Custom Content" ? "Custom Content" : "Manuell",',
  '        art: isAdvertising ? ADVERTISING_LABEL : isStudioRent ? STUDIO_RENT_LABEL : isOtherExpense ? (otherExpensePurpose || "Sonstiges") : e.studio === "Custom Content" ? "Custom Content" : "Manuell",',
);

if (!backend.includes("export const createOtherExpense")) {
  const marker = "\nexport const deleteCashBookEntry";
  const fn = `\nexport const createOtherExpense = createServerFn({ method: "POST" })\n  .middleware([requireSupabaseAuth])\n  .inputValidator((data: unknown) => z.object({\n    purpose: z.string().trim().min(1).max(160),\n    datum: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),\n    betrag: z.number().positive().max(1_000_000),\n    zahlungsart: z.string().trim().min(1).max(100),\n    notiz: z.string().max(2000).optional().nullable(),\n  }).parse(data))\n  .handler(async ({ data, context }) => {\n    await ensureAdmin(context.supabase, context.userId);\n    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({\n      studio: "Sonstiges",\n      datum: data.datum,\n      kunde: OTHER_EXPENSE_PREFIX + " " + data.purpose.trim(),\n      anzahlung: 0,\n      anzahlung_method: data.zahlungsart.trim(),\n      bar: data.betrag,\n      notiz: data.notiz?.trim() || null,\n      created_by: context.userId,\n    }).select("id").single();\n    if (error) throw new Error(error.message);\n    return row;\n  });\n`;
  if (!backend.includes(marker)) throw new Error("Cashbook organizer: deleteCashBookEntry marker missing");
  backend = backend.replace(marker, `${fn}${marker}`);
}
writeFileSync(backendPath, backend);

const uiPath = "src/routes/_authenticated/admin.kassenbuch.tsx";
let ui = readFileSync(uiPath, "utf8");

const oldImport = 'import { FinancialSlaveEntryForm } from "@/components/admin/financial-slave-entry-form";';
const newImport = `${oldImport}\nimport { CashbookEntryOrganizer } from "@/components/admin/cashbook-entry-organizer";`;
if (!ui.includes('import { CashbookEntryOrganizer }')) {
  if (!ui.includes(oldImport)) throw new Error("Cashbook organizer: FinancialSlaveEntryForm import missing");
  ui = ui.replace(oldImport, newImport);
}

if (!ui.includes("<CashbookEntryOrganizer />")) {
  const start = "      <FinancialSlaveEntryForm />";
  const end = "      {expenseEntries.length > 0 &&";
  const startIndex = ui.indexOf(start);
  const endIndex = ui.indexOf(end, startIndex);
  if (startIndex < 0 || endIndex < 0) throw new Error("Cashbook organizer: legacy entry form range missing");
  const legacy = ui.slice(startIndex, endIndex);
  ui = ui.slice(0, startIndex) + `      <CashbookEntryOrganizer />\n      <div className="hidden" aria-hidden="true">\n${legacy}      </div>\n` + ui.slice(endIndex);
}

writeFileSync(uiPath, ui);
console.log("Cashbook entry UI organized into income and expense launchers.");
