import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.terminplan.tsx";
let text = readFileSync(path, "utf8");

if (!text.includes("function depositExemptionLabel")) {
  text = text.replace(
    `function hasNoDeposit(entry: Pick<Entry, "deposit_exemption_reason" | "anzahlung" | "bar">) {\n  return Boolean(entry.deposit_exemption_reason) || (Number(entry.anzahlung ?? 0) === 0 && Number(entry.bar ?? 0) > 0);\n}`,
    `function hasNoDeposit(entry: Pick<Entry, "deposit_exemption_reason" | "anzahlung" | "bar">) {\n  return Boolean(entry.deposit_exemption_reason) || (Number(entry.anzahlung ?? 0) === 0 && Number(entry.bar ?? 0) > 0);\n}\n\nfunction depositExemptionLabel(reason: string | null) {\n  return ({\n    regular_customer: "Stammkunde",\n    trust: "Vertrauensbasis",\n    exception: "Ausnahme",\n    colleague_guarantees: "Kollegin bürgt",\n    spontaneous: "Spontan",\n  } as Record<string, string>)[reason ?? ""] ?? "Ohne Vorauszahlung";\n}`,
  );
}

text = text.replace(
  `    mutationFn: (input: ManualBookingValues) => createManualBookingFn({\n      data: {\n        ...input,\n        deposit_exemption_reason: input.deposit_exemption_reason === "spontaneous" ? "exception" : input.deposit_exemption_reason,\n      },\n    }),`,
  `    mutationFn: (input: ManualBookingValues) => createManualBookingFn({ data: input }),`,
);

text = text.replace(
  `{hasNoDeposit(e) ? "Keine Anzahlung" : e.anzahlung_paid ? "Anzahlung ok" : "Anzahlung offen"}`,
  `{hasNoDeposit(e)\n              ? depositExemptionLabel(e.deposit_exemption_reason)\n              : e.is_content_shoot\n                ? e.anzahlung_paid ? "Vorauszahlung ok" : "Vorauszahlung offen"\n                : e.anzahlung_paid ? "Anzahlung ok" : "Anzahlung offen"}`,
);

text = text.replace(
  `              {e.duration === "Custom Content" ? "Custom Content" : "Content"}\n            </span>`,
  `              {e.is_content_shoot ? "Custom" : "Content"}\n            </span>`,
);

text = text.replace(
  `        : entry.duration === "Custom Content"\n          ? "CUSTOM CONTENT"\n          : entry.is_content_shoot\n            ? "CONTENT"`,
  `        : entry.is_content_shoot\n          ? "CUSTOM"`,
);

writeFileSync(path, text);
console.log("Terminplan custom/prepayment labels applied.");
