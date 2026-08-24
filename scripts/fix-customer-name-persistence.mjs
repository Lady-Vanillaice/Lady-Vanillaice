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
  `    if (existing?.id) {\n      let { error } = await context.supabase\n        .from("customer_notes")\n        .update(payload)\n        .eq("id", existing.id);\n      if (error?.message?.includes("does not exist")) {\n        const retry = await context.supabase.from("customer_notes").update(legacyPayload).eq("id", existing.id);\n        error = retry.error;\n      }\n      if (error) throw new Error(error.message);\n      return { ok: true, id: existing.id };\n    }`,
  `    if (existing?.id) {\n      let { error } = await context.supabase\n        .from("customer_notes")\n        .update(payload)\n        .eq("id", existing.id);\n      if (error?.message?.includes("does not exist")) {\n        const retry = await context.supabase.from("customer_notes").update(legacyPayload).eq("id", existing.id);\n        error = retry.error;\n      }\n      if (error) throw new Error(error.message);\n\n      // The name in the customer card must be the actual stored customer name,\n      // not only an auxiliary note. Synchronize it to all bookings for this\n      // email so reopening the customer, booking details and the cashbook all\n      // show the newly entered full name.\n      if (data.pseudonym?.trim() && !emailLower.endsWith("@intern.local")) {\n        const { error: bookingNameError } = await context.supabase\n          .from("bookings")\n          .update({ guest_name: data.pseudonym.trim() })\n          .ilike("guest_email", emailLower);\n        if (bookingNameError) throw new Error(bookingNameError.message);\n      }\n\n      return { ok: true, id: existing.id };\n    }`,
  "sync existing customer name",
);

patch(
  "src/lib/customers.functions.ts",
  `    if (error) throw new Error(error.message);\n    return { ok: true, id: inserted.id };\n  });`,
  `    if (error) throw new Error(error.message);\n\n    if (data.pseudonym?.trim() && !emailLower.endsWith("@intern.local")) {\n      const { error: bookingNameError } = await context.supabase\n        .from("bookings")\n        .update({ guest_name: data.pseudonym.trim() })\n        .ilike("guest_email", emailLower);\n      if (bookingNameError) throw new Error(bookingNameError.message);\n    }\n\n    return { ok: true, id: inserted.id };\n  });`,
  "sync newly created customer name",
);

patch(
  "src/routes/_authenticated/admin.kunden.tsx",
  `          <Save size={12} /> Speichern\n        </button>`,
  `          <Save size={12} /> Speichern\n        </button>\n        {upsertMutErrorPlaceholder}`, 
  "placeholder"
);

// Remove temporary placeholder again; UI error handling is injected below with a direct replacement.
{
  const path = "src/routes/_authenticated/admin.kunden.tsx";
  let source = fs.readFileSync(path, "utf8");
  source = source.replace("\\n        {upsertMutErrorPlaceholder}", "");
  source = source.replace(
    `                    <CustomerEditor\n                      customer={c}\n                      pending={upsertMut.isPending}`,
    `                    <CustomerEditor\n                      customer={c}\n                      pending={upsertMut.isPending}\n                      error={upsertMut.error instanceof Error ? upsertMut.error.message : null}`,
  );
  source = source.replace(
    `  pending,\n  onSave,`,
    `  pending,\n  error,\n  onSave,`,
  );
  source = source.replace(
    `  pending: boolean;\n  onSave:`,
    `  pending: boolean;\n  error: string | null;\n  onSave:`,
  );
  source = source.replace(
    `      <div className="flex flex-wrap gap-2 pt-1">`,
    `      {error && <p className="text-xs text-bordeaux">Speichern fehlgeschlagen: {error}</p>}\n      <div className="flex flex-wrap gap-2 pt-1">`,
  );
  fs.writeFileSync(path, source);
}

console.log("Customer name updates now persist to booking records and save errors are visible.");
