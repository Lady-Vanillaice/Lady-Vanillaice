import fs from "node:fs";

const backendPath = "src/lib/cashbook.functions.ts";
const uiPath = "src/routes/_authenticated/admin.kassenbuch.tsx";

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Advertising expense patch could not apply ${label}`);
  return source.replace(before, after);
}

let backend = fs.readFileSync(backendPath, "utf8");
backend = replaceOnce(
  backend,
  'const STUDIO_RENT_LABEL = "Studiomiete";',
  'const STUDIO_RENT_LABEL = "Studiomiete";\nconst ADVERTISING_LABEL = "Werbung";',
  "advertising label",
);
backend = replaceOnce(
  backend,
  '      const isStudioRent = e.kunde === STUDIO_RENT_LABEL;',
  '      const isStudioRent = e.kunde === STUDIO_RENT_LABEL;\n      const isAdvertising = e.kunde === ADVERTISING_LABEL || e.studio.trim().toLowerCase() === "ladies.de";\n      const expenseCategory = isAdvertising ? "advertising" : isStudioRent ? "studio_rent" : null;\n      const isExpense = Boolean(expenseCategory);',
  "expense detection",
);
for (const [before, after, label] of [
  ['      const depositDate = !isStudioRent ?', '      const depositDate = !isExpense ?', "deposit date"],
  ['      const onsiteDate = !isStudioRent ?', '      const onsiteDate = !isExpense ?', "onsite date"],
  ['        id: e.id, source: "manual", entry_type: isStudioRent ? "expense" : "income",', '        id: e.id, source: "manual", entry_type: isExpense ? "expense" : "income",', "entry type"],
  ['        expense_category: isStudioRent ? "studio_rent" : null,', '        expense_category: expenseCategory,', "expense category"],
  ['        expense_amount: isStudioRent ? Number(e.bar) : 0,', '        expense_amount: isExpense ? Number(e.bar) : 0,', "expense amount"],
  ['        payment_method: isStudioRent ? e.anzahlung_method ?? null : null,', '        payment_method: isExpense ? e.anzahlung_method ?? null : null,', "expense payment method"],
  ['        art: isStudioRent ? STUDIO_RENT_LABEL : e.studio === "Custom Content" ? "Custom Content" : "Manuell",', '        art: isAdvertising ? ADVERTISING_LABEL : isStudioRent ? STUDIO_RENT_LABEL : e.studio === "Custom Content" ? "Custom Content" : "Manuell",', "expense label"],
  ['        anzahlung: isStudioRent || !depositDate ? 0 : Number(e.anzahlung),', '        anzahlung: isExpense || !depositDate ? 0 : Number(e.anzahlung),', "deposit amount"],
  ['        anzahlung_vorgemerkt: isStudioRent ? 0 : Number(e.anzahlung),', '        anzahlung_vorgemerkt: isExpense ? 0 : Number(e.anzahlung),', "planned deposit"],
  ['        anzahlung_method: isStudioRent ? null : e.anzahlung_method ?? null,', '        anzahlung_method: isExpense ? null : e.anzahlung_method ?? null,', "deposit method"],
  ['        deposit_exemption_reason: isStudioRent ? null : meta.deposit_exemption_reason ?? null,', '        deposit_exemption_reason: isExpense ? null : meta.deposit_exemption_reason ?? null,', "deposit exemption"],
  ['        bar: isStudioRent || !onsiteDate ? 0 : Number(e.bar),', '        bar: isExpense || !onsiteDate ? 0 : Number(e.bar),', "onsite amount"],
  ['        restbetrag_vorgemerkt: isStudioRent ? 0 : Number(e.bar),', '        restbetrag_vorgemerkt: isExpense ? 0 : Number(e.bar),', "planned rest amount"],
  ['        restzahlung_method: isStudioRent ? null : meta.onsite_method ?? (Number(e.bar) > 0 ? "Bar" : null),', '        restzahlung_method: isExpense ? null : meta.onsite_method ?? (Number(e.bar) > 0 ? "Bar" : null),', "rest method"],
  ['        gesamt: isStudioRent ? 0 : (depositDate ? Number(e.anzahlung) : 0) + (onsiteDate ? Number(e.bar) : 0),', '        gesamt: isExpense ? 0 : (depositDate ? Number(e.anzahlung) : 0) + (onsiteDate ? Number(e.bar) : 0),', "income total"],
]) {
  backend = replaceOnce(backend, before, after, label);
}

const advertisingServerFn = `\nexport const createAdvertisingExpense = createServerFn({ method: "POST" })\n  .middleware([requireSupabaseAuth])\n  .inputValidator((data: unknown) => expenseSchema.parse(data))\n  .handler(async ({ data, context }) => {\n    await ensureAdmin(context.supabase, context.userId);\n    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({\n      studio: data.studio.trim(), datum: data.datum, kunde: ADVERTISING_LABEL,\n      anzahlung: 0, anzahlung_method: data.zahlungsart.trim(), bar: data.betrag,\n      notiz: data.notiz?.trim() || null, created_by: context.userId,\n    }).select("id").single();\n    if (error) throw new Error(error.message);\n    return row;\n  });\n`;
if (!backend.includes("export const createAdvertisingExpense")) {
  const marker = "\nexport const deleteCashBookEntry";
  if (!backend.includes(marker)) throw new Error("Advertising expense patch could not find deleteCashBookEntry marker");
  backend = backend.replace(marker, `${advertisingServerFn}${marker}`);
}
fs.writeFileSync(backendPath, backend);

let ui = fs.readFileSync(uiPath, "utf8");
ui = replaceOnce(
  ui,
  'import { createCashBookEntry, createStudioRentExpense, deleteCashBookEntry, listCashBookEntries, updateCashBookEntry, type CashBookEntry, type DepositExemptionReason } from "@/lib/cashbook.functions";',
  'import { createAdvertisingExpense, createCashBookEntry, createStudioRentExpense, deleteCashBookEntry, listCashBookEntries, updateCashBookEntry, type CashBookEntry, type DepositExemptionReason } from "@/lib/cashbook.functions";',
  "UI import",
);
ui = replaceOnce(
  ui,
  '  const createExpense = useServerFn(createStudioRentExpense);',
  '  const createExpense = useServerFn(createStudioRentExpense);\n  const createAdvertising = useServerFn(createAdvertisingExpense);',
  "advertising server function hook",
);
ui = replaceOnce(
  ui,
  '  const [expenseAmount, setExpenseAmount] = useState(""); const [expenseMethod, setExpenseMethod] = useState(""); const [expenseNote, setExpenseNote] = useState("");',
  '  const [expenseAmount, setExpenseAmount] = useState(""); const [expenseMethod, setExpenseMethod] = useState(""); const [expenseNote, setExpenseNote] = useState("");\n  const [advertisingProvider, setAdvertisingProvider] = useState(""); const [advertisingDate, setAdvertisingDate] = useState(today());\n  const [advertisingAmount, setAdvertisingAmount] = useState(""); const [advertisingMethod, setAdvertisingMethod] = useState(""); const [advertisingNote, setAdvertisingNote] = useState("");',
  "advertising state",
);
ui = replaceOnce(
  ui,
  '  const expenseMut = useMutation({ mutationFn: () => createExpense({ data: { studio: expenseStudio, datum: expenseDate, betrag: Number(expenseAmount.replace(",", ".")), zahlungsart: expenseMethod, notiz: expenseNote || null } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook"] }); setExpenseAmount(""); setExpenseMethod(""); setExpenseNote(""); } });',
  '  const expenseMut = useMutation({ mutationFn: () => createExpense({ data: { studio: expenseStudio, datum: expenseDate, betrag: Number(expenseAmount.replace(",", ".")), zahlungsart: expenseMethod, notiz: expenseNote || null } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook"] }); setExpenseAmount(""); setExpenseMethod(""); setExpenseNote(""); } });\n  const advertisingMut = useMutation({ mutationFn: () => createAdvertising({ data: { studio: advertisingProvider, datum: advertisingDate, betrag: Number(advertisingAmount.replace(",", ".")), zahlungsart: advertisingMethod, notiz: advertisingNote || null } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook"] }); setAdvertisingProvider(""); setAdvertisingAmount(""); setAdvertisingMethod(""); setAdvertisingNote(""); } });',
  "advertising mutation",
);

const advertisingForm = `      <form onSubmit={e => { e.preventDefault(); advertisingMut.mutate(); }} className="bg-card border border-bordeaux/50 p-4 space-y-4"><h2 className="eyebrow text-champagne">Ausgabe – Werbung</h2><div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3"><Field label="Datum"><input required type="date" value={advertisingDate} onChange={e => setAdvertisingDate(e.target.value)} className="luxe-input" /></Field><Field label="Anbieter / Kanal"><input required value={advertisingProvider} onChange={e => setAdvertisingProvider(e.target.value)} placeholder="z. B. Instagram, Google, Flyer" className="luxe-input" /></Field><Field label="Betrag (€)"><input required inputMode="decimal" value={advertisingAmount} onChange={e => setAdvertisingAmount(e.target.value)} className="luxe-input" /></Field><Field label="Bezahlt mit"><input required value={advertisingMethod} onChange={e => setAdvertisingMethod(e.target.value)} placeholder="Bar, Karte, Überweisung …" className="luxe-input" /></Field><div className="md:col-span-4"><Field label="Notiz (optional)"><input value={advertisingNote} onChange={e => setAdvertisingNote(e.target.value)} className="luxe-input" /></Field></div></div><button disabled={advertisingMut.isPending} className="btn-gold inline-flex gap-2"><Plus size={15} />{advertisingMut.isPending ? "Speichere…" : "Werbung speichern"}</button>{advertisingMut.error && <p className="text-sm text-bordeaux">{(advertisingMut.error as Error).message}</p>}</form>\n`;
if (!ui.includes("Ausgabe – Werbung")) {
  const marker = "      {expenseEntries.length > 0 &&";
  if (!ui.includes(marker)) throw new Error("Advertising expense patch could not find expense table marker");
  ui = ui.replace(marker, `${advertisingForm}${marker}`);
}
ui = replaceOnce(
  ui,
  '["Datum", "Ausgabe", "Studio", "Zahlungsart", "Betrag", ""]',
  '["Datum", "Ausgabe", "Studio / Anbieter", "Zahlungsart", "Betrag", ""]',
  "expense table heading",
);
ui = replaceOnce(
  ui,
  '<td className="p-3">Studiomiete</td>',
  '<td className="p-3">{e.expense_category === "advertising" ? "Werbung" : e.art}</td>',
  "expense table category",
);
fs.writeFileSync(uiPath, ui);

console.log("Cashbook now supports advertising expenses alongside studio rent.");
