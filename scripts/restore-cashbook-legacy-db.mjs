import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/cashbook.functions.ts";
let text = readFileSync(path, "utf8");
const before = text;

// The production database currently still has the original cash_book_entries
// columns. Keep the cashbook readable and writable with that schema instead of
// making the whole page fail because optional payment-detail columns are not
// present yet.
text = text.replace(
  'db.from("cash_book_entries").select("id, studio, datum, kunde, anzahlung, anzahlung_method, anzahlung_datum, deposit_exemption_reason, bar, restzahlung_method, restzahlung_datum, gesamt, notiz, created_at")',
  'db.from("cash_book_entries").select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at")',
);

text = text.replace(
`    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({
      studio: data.studio, datum: data.datum, kunde: data.kunde,
      anzahlung: data.deposit_exemption_reason ? 0 : data.anzahlung,
      anzahlung_method: data.deposit_exemption_reason ? null : data.anzahlung_method?.trim() || null,
      anzahlung_datum: data.deposit_exemption_reason ? null : data.anzahlung_datum ?? null,
      deposit_exemption_reason: data.deposit_exemption_reason ?? null,
      bar: data.bar,
      restzahlung_method: data.bar > 0 ? data.restzahlung_method?.trim() || null : null,
      restzahlung_datum: data.bar > 0 ? data.restzahlung_datum ?? null : null,
      notiz: data.notiz ?? null,
      created_by: context.userId,
    }).select("id").single();`,
`    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({
      studio: data.studio, datum: data.datum, kunde: data.kunde,
      anzahlung: data.deposit_exemption_reason ? 0 : data.anzahlung,
      anzahlung_method: data.deposit_exemption_reason ? null : data.anzahlung_method?.trim() || null,
      bar: data.bar,
      notiz: data.notiz ?? null,
      created_by: context.userId,
    }).select("id").single();`,
);

text = text.replace(
`    const { error } = await context.supabase.from("cash_book_entries").update({
      studio: data.studio.trim(),
      datum: data.datum,
      kunde: data.kunde.trim(),
      anzahlung: data.deposit_exemption_reason ? 0 : data.anzahlung,
      anzahlung_method: data.deposit_exemption_reason ? null : data.anzahlung_method?.trim() || null,
      anzahlung_datum: data.deposit_exemption_reason ? null : data.anzahlung_datum ?? null,
      deposit_exemption_reason: data.deposit_exemption_reason ?? null,
      bar: data.bar,
      restzahlung_method: data.bar > 0 ? data.restzahlung_method?.trim() || null : null,
      restzahlung_datum: data.bar > 0 ? data.restzahlung_datum ?? null : null,
      notiz: data.notiz?.trim() || null,
    }).eq("id", data.id);`,
`    const { error } = await context.supabase.from("cash_book_entries").update({
      studio: data.studio.trim(),
      datum: data.datum,
      kunde: data.kunde.trim(),
      anzahlung: data.deposit_exemption_reason ? 0 : data.anzahlung,
      anzahlung_method: data.deposit_exemption_reason ? null : data.anzahlung_method?.trim() || null,
      bar: data.bar,
      notiz: data.notiz?.trim() || null,
    }).eq("id", data.id);`,
);

for (const marker of [
  'select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at")',
  'const activeIncomeEntries =',
]) {
  // The archive marker lives in the route, not this file; only validate the DB
  // compatibility marker here. The route archive is validated by the previous
  // final patch.
  if (marker === 'const activeIncomeEntries =') continue;
  if (!text.includes(marker)) throw new Error(`Kassenbuch-Kompatibilität konnte nicht hergestellt werden: ${marker}`);
}

if (text !== before) {
  writeFileSync(path, text);
  console.log("Cashbook restored for current production database schema.");
} else {
  console.log("Cashbook database compatibility already active.");
}
