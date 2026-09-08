import fs from "node:fs";

function writeIfChanged(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  if (after !== before) fs.writeFileSync(path, after);
}

// Keep the Terminplan in sync immediately after payment/deposit mutations.
writeIfChanged("src/routes/_authenticated/admin.buchung.$id.tsx", (source) => {
  let text = source;

  text = text.replace(
    `      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n    },\n  });\n\n  const depositPaidMut = useMutation({`,
    `      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n    },\n  });\n\n  const depositPaidMut = useMutation({`,
  );

  text = text.replace(
    `    onSuccess: () => {\n      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n      router.invalidate();\n    },\n  });\nconst depositDateMut = useMutation({`,
    `    onSuccess: () => {\n      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n      router.invalidate();\n    },\n  });\nconst depositDateMut = useMutation({`,
  );

  text = text.replace(
    `  onSuccess: () => {\n    qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n    qc.invalidateQueries({ queryKey: ["cashbook"] });\n    router.invalidate();\n  },\n});`,
    `  onSuccess: () => {\n    qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n    qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n    qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" });\n    qc.invalidateQueries({ queryKey: ["cashbook"] });\n    router.invalidate();\n  },\n});`,
  );

  return text;
});

// Be tolerant of legacy rows where the paid date is present but the old boolean
// was not synchronized. The paid date is authoritative evidence of confirmation.
writeIfChanged("src/routes/_authenticated/admin.terminplan.tsx", (source) => {
  let text = source;

  if (!text.includes("anzahlung_paid_at: string | null;")) {
    text = text.replace(
      `  anzahlung_paid: boolean | null;\n  deposit_exemption_reason: string | null;`,
      `  anzahlung_paid: boolean | null;\n  anzahlung_paid_at: string | null;\n  deposit_exemption_reason: string | null;`,
    );
  }

  text = text.replace(
    `admin_note, anzahlung_paid, deposit_exemption_reason, anzahlung, bar, message`,
    `admin_note, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, anzahlung, bar, message`,
  );

  if (!text.includes("anzahlung_paid_at: b.anzahlung_paid_at")) {
    text = text.replace(
      `          anzahlung_paid: b.anzahlung_paid,\n          deposit_exemption_reason: b.deposit_exemption_reason,`,
      `          anzahlung_paid: b.anzahlung_paid,\n          anzahlung_paid_at: b.anzahlung_paid_at,\n          deposit_exemption_reason: b.deposit_exemption_reason,`,
    );
  }

  if (!text.includes("function isDepositPaid")) {
    const marker = `function hasNoDeposit(entry: Pick<Entry, "deposit_exemption_reason" | "anzahlung" | "bar">) {\n  return Boolean(entry.deposit_exemption_reason) || (Number(entry.anzahlung ?? 0) === 0 && Number(entry.bar ?? 0) > 0);\n}`;
    const helper = `${marker}\n\nfunction isDepositPaid(entry: Pick<Entry, "anzahlung_paid" | "anzahlung_paid_at">) {\n  return entry.anzahlung_paid === true || Boolean(entry.anzahlung_paid_at);\n}`;
    text = text.replace(marker, helper);
  }

  text = text.replaceAll("entry.anzahlung_paid || hasNoDeposit(entry)", "isDepositPaid(entry) || hasNoDeposit(entry)");
  text = text.replaceAll("entry.anzahlung_paid ? \"BEZAHLT\" : \"OFFEN\"", "isDepositPaid(entry) ? \"BEZAHLT\" : \"OFFEN\"");
  text = text.replaceAll("e.anzahlung_paid || hasNoDeposit(e)", "isDepositPaid(e) || hasNoDeposit(e)");
  text = text.replaceAll("e.anzahlung_paid ? \"Vorauszahlung ok\" : \"Vorauszahlung offen\"", "isDepositPaid(e) ? \"Vorauszahlung ok\" : \"Vorauszahlung offen\"");
  text = text.replaceAll("e.anzahlung_paid ? \"Anzahlung ok\" : \"Anzahlung offen\"", "isDepositPaid(e) ? \"Anzahlung ok\" : \"Anzahlung offen\"");

  return text;
});

console.log("Deposit confirmation status and Terminplan cache synchronized.");
