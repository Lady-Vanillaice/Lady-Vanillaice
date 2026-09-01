import fs from "node:fs";

const backendPath = "src/lib/cashbook.functions.ts";
let backend = fs.readFileSync(backendPath, "utf8");

if (!backend.includes('const OTHER_EXPENSE_PREFIX = "Sonstige Ausgabe:";')) {
  backend = backend.replace('const ADVERTISING_LABEL = "Werbung";', 'const ADVERTISING_LABEL = "Werbung";\nconst OTHER_EXPENSE_PREFIX = "Sonstige Ausgabe:";');
}
backend = backend.replace(
  '      const isAdvertising = e.kunde === ADVERTISING_LABEL || e.studio.trim().toLowerCase() === "ladies.de";\n      const expenseCategory = isAdvertising ? "advertising" : isStudioRent ? "studio_rent" : null;\n      const isExpense = Boolean(expenseCategory);',
  '      const isAdvertising = e.kunde === ADVERTISING_LABEL || e.studio.trim().toLowerCase() === "ladies.de";\n      const isOtherExpense = typeof e.kunde === "string" && e.kunde.startsWith(OTHER_EXPENSE_PREFIX);\n      const otherExpensePurpose = isOtherExpense ? e.kunde.slice(OTHER_EXPENSE_PREFIX.length).trim() : null;\n      const expenseCategory = isAdvertising ? "advertising" : isStudioRent ? "studio_rent" : isOtherExpense ? "other" : null;\n      const isExpense = Boolean(expenseCategory);'
);
backend = backend.replace(
  '        art: isAdvertising ? ADVERTISING_LABEL : isStudioRent ? STUDIO_RENT_LABEL : e.studio === "Custom Content" ? "Custom Content" : "Manuell",',
  '        art: isAdvertising ? ADVERTISING_LABEL : isStudioRent ? STUDIO_RENT_LABEL : isOtherExpense ? (otherExpensePurpose || "Sonstiges") : e.studio === "Custom Content" ? "Custom Content" : "Manuell",'
);
if (!backend.includes("export const createOtherExpense")) {
  const marker = "\nexport const deleteCashBookEntry";
  if (!backend.includes(marker)) throw new Error("Cashbook organizer: deleteCashBookEntry marker missing");
  const fn = `\nexport const createOtherExpense = createServerFn({ method: "POST" })\n  .middleware([requireSupabaseAuth])\n  .inputValidator((data: unknown) => z.object({ purpose: z.string().trim().min(1).max(160), datum: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/), betrag: z.number().positive().max(1_000_000), zahlungsart: z.string().trim().min(1).max(100), notiz: z.string().max(2000).optional().nullable() }).parse(data))\n  .handler(async ({ data, context }) => {\n    await ensureAdmin(context.supabase, context.userId);\n    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({ studio: "Sonstiges", datum: data.datum, kunde: OTHER_EXPENSE_PREFIX + " " + data.purpose.trim(), anzahlung: 0, anzahlung_method: data.zahlungsart.trim(), bar: data.betrag, notiz: data.notiz?.trim() || null, created_by: context.userId }).select("id").single();\n    if (error) throw new Error(error.message);\n    return row;\n  });\n`;
  backend = backend.replace(marker, fn + marker);
}
fs.writeFileSync(backendPath, backend);

const uiPath = "src/routes/_authenticated/admin.kassenbuch.tsx";
let ui = fs.readFileSync(uiPath, "utf8");
if (!ui.includes('import { CashbookEntryOrganizer } from "@/components/admin/cashbook-entry-organizer";')) {
  ui = ui.replace('import { FinancialSlaveEntryForm } from "@/components/admin/financial-slave-entry-form";', 'import { FinancialSlaveEntryForm } from "@/components/admin/financial-slave-entry-form";\nimport { CashbookEntryOrganizer } from "@/components/admin/cashbook-entry-organizer";');
}
if (!ui.includes("<CashbookEntryOrganizer />")) {
  const start = "      <FinancialSlaveEntryForm />";
  const end = "      {expenseEntries.length > 0 &&";
  if (!ui.includes(start) || !ui.includes(end)) throw new Error("Cashbook organizer: legacy form range missing");
  ui = ui.replace(start, `      <CashbookEntryOrganizer />\n      <div className="hidden" aria-hidden="true">\n${start}`);
  ui = ui.replace(end, `      </div>\n${end}`);
}
fs.writeFileSync(uiPath, ui);
console.log("Cashbook organizer activated.");
