import fs from "node:fs";

function patch(path, before, after, label) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`${path}: ${label} target not found`);
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
}

patch(
  "src/lib/customers.functions.ts",
  `      if (error) throw new Error(error.message);\n      return { ok: true, id: existing.id };`,
  `      if (error) throw new Error(error.message);\n\n      if (data.pseudonym?.trim() && !emailLower.endsWith("@intern.local")) {\n        const { error: bookingNameError } = await context.supabase\n          .from("bookings")\n          .update({ guest_name: data.pseudonym.trim() })\n          .ilike("guest_email", emailLower);\n        if (bookingNameError) throw new Error(bookingNameError.message);\n      }\n\n      return { ok: true, id: existing.id };`,
  "sync existing customer name",
);

patch(
  "src/lib/customers.functions.ts",
  `    if (error) throw new Error(error.message);\n    return { ok: true, id: inserted.id };\n  });`,
  `    if (error) throw new Error(error.message);\n\n    if (data.pseudonym?.trim() && !emailLower.endsWith("@intern.local")) {\n      const { error: bookingNameError } = await context.supabase\n        .from("bookings")\n        .update({ guest_name: data.pseudonym.trim() })\n        .ilike("guest_email", emailLower);\n      if (bookingNameError) throw new Error(bookingNameError.message);\n    }\n\n    return { ok: true, id: inserted.id };\n  });`,
  "sync new customer name",
);

{
  const path = "src/routes/_authenticated/admin.kunden.tsx";
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes("error={upsertMut.error instanceof Error ? upsertMut.error.message : null}")) {
    source = source.replace(
      `                    <CustomerEditor\n                      customer={c}\n                      pending={upsertMut.isPending}`,
      `                    <CustomerEditor\n                      customer={c}\n                      pending={upsertMut.isPending}\n                      error={upsertMut.error instanceof Error ? upsertMut.error.message : null}`,
    );
  }

  if (!source.includes("  error: string | null;")) {
    source = source.replace(
      `  pending,\n  onSave,`,
      `  pending,\n  error,\n  onSave,`,
    );
    source = source.replace(
      `  pending: boolean;\n  onSave:`,
      `  pending: boolean;\n  error: string | null;\n  onSave:`,
    );
  }

  if (!source.includes("Speichern fehlgeschlagen:")) {
    source = source.replace(
      `      <div className="flex flex-wrap gap-2 pt-1">`,
      `      {error && <p className="text-xs text-bordeaux">Speichern fehlgeschlagen: {error}</p>}\n      <div className="flex flex-wrap gap-2 pt-1">`,
    );
  }

  if (!source.includes("Vollständiger Name / Pseudonym")) {
    source = source.replace("Pseudonym / Name", "Vollständiger Name / Pseudonym");
  }

  fs.writeFileSync(path, source);
}

console.log("Customer names persist to booking records and save errors are visible.");
