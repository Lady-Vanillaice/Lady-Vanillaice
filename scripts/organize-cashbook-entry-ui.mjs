import fs from "node:fs";

function replaceOnce(path, before, after, label) {
  let text = fs.readFileSync(path, "utf8");
  if (text.includes(after)) return;
  if (!text.includes(before)) throw new Error(`Cashbook organizer could not apply ${label}`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

const backend = "src/lib/cashbook.functions.ts";
replaceOnce(backend,
  'const ADVERTISING_LABEL = "Werbung";',
  'const ADVERTISING_LABEL = "Werbung";\nconst OTHER_EXPENSE_PREFIX = "Sonstige Ausgabe:";',
  "other expense label",
);
replaceOnce(backend,
  '      const isAdvertising = e.kunde === ADVERTISING_LABEL || e.studio.trim().toLowerCase() === "ladies.de";\n      const expenseCategory = isAdvertising ? "advertising" : isStudioRent ? "studio_rent" : null;\n      const isExpense = Boolean(expenseCategory);',
  '      const isAdvertising = e.kunde === ADVERTISING_LABEL || e.studio.trim().toLowerCase() === "ladies.de";\n      const isOtherExpense = typeof e.kunde === "string" && e.kunde.startsWith(OTHER_EXPENSE_PREFIX);\n      const otherExpensePurpose = isOtherExpense ? e.kunde.slice(OTHER_EXPENSE_PREFIX.length).trim() : null;\n      const expenseCategory = isAdvertising ? "advertising" : isStudioRent ? "studio_rent" : isOtherExpense ? "other" : null;\n      const isExpense = Boolean(expenseCategory);',
  "other expense detection",
);
replaceOnce(backend,
  '        art: isAdvertising ? ADVERTISING_LABEL : isStudioRent ? STUDIO_RENT_LABEL : e.studio === "Custom Content" ? "Custom Content" : "Manuell",',
  '        art: isAdvertising ? ADVERTISING_LABEL : isStudioRent ? STUDIO_RENT_LABEL : isOtherExpense ? (otherExpensePurpose || "Sonstiges") : e.studio === "Custom Content" ? "Custom Content" : "Manuell",',
  "other expense display label",
);

let backendText = fs.readFileSync(backend, "utf8");
if (!backendText.includes("export const createOtherExpense")) {
  const marker = "\nexport const deleteCashBookEntry";
  if (!backendText.includes(marker)) throw new Error("Cashbook organizer could not find deleteCashBookEntry marker");
  const fn = `\nexport const createOtherExpense = createServerFn({ method: "POST" })\n  .middleware([requireSupabaseAuth])\n  .inputValidator((data: unknown) => z.object({\n    purpose: z.string().trim().min(1).max(160),\n    datum: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),\n    betrag: z.number().positive().max(1_000_000),\n    zahlungsart: z.string().trim().min(1).max(100),\n    notiz: z.string().max(2000).optional().nullable(),\n  }).parse(data))\n  .handler(async ({ data, context }) => {\n    await ensureAdmin(context.supabase, context.userId);\n    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({\n      studio: "Sonstiges", datum: data.datum, kunde: OTHER_EXPENSE_PREFIX + " " + data.purpose.trim(),\n      anzahlung: 0, anzahlung_method: data.zahlungsart.trim(), bar: data.betrag,\n      notiz: data.notiz?.trim() || null, created_by: context.userId,\n    }).select("id").single();\n    if (error) throw new Error(error.message);\n    return row;\n  });\n`;
  backendText = backendText.replace(marker, `${fn}${marker}`);
  fs.writeFileSync(backend, backendText);
}

const ui = "src/routes/_authenticated/admin.kassenbuch.tsx";
replaceOnce(ui,
  'import { FinancialSlaveEntryForm } from "@/components/admin/financial-slave-entry-form";',
  'import { FinancialSlaveEntryForm } from "@/components/admin/financial-slave-entry-form";\nimport { CashbookEntryOrganizer } from "@/components/admin/cashbook-entry-organizer";',
  "organizer import",
);

let uiText = fs.readFileSync(ui, "utf8");
if (!uiText.includes("<CashbookEntryOrganizer />")) {
  const start = "      <FinancialSlaveEntryForm />";
  const end = "      {expenseEntries.length > 0 &&";
  if (!uiText.includes(start) || !uiText.includes(end)) throw new Error("Cashbook organizer could not find legacy form range");
  uiText = uiText.replace(start, `      <CashbookEntryOrganizer />\n      <div className="hidden" aria-hidden="true">\n${start}`);
  uiText = uiText.replace(end, `      </div>\n${end}`);
  fs.writeFileSync(ui, uiText);
}

console.log("Cashbook entry forms are organized under income/expense launchers with external appointment, financial slave, custom, studio rent, advertising and other expense choices.");
