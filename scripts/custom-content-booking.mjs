import { readFileSync, writeFileSync } from "node:fs";

function apply(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) {
    console.log(`${path}: already up to date`);
    return;
  }
  writeFileSync(path, after);
}

apply("src/lib/booking.functions.ts", (text) => {
  text = text.replace(
    'booking_type: z.enum(["single", "duo", "content"]),',
    'booking_type: z.enum(["single", "duo", "content", "custom_content"]),',
  );
  text = text.replace(
    '    if (!data.deposit_exemption_reason && !data.deposit_paid_at) {\n      throw new Error("Das Eingangsdatum der Anzahlung fehlt.");\n    }\n    if (!data.deposit_exemption_reason && data.deposit_amount <= 0) {\n      throw new Error("Die erhaltene Anzahlung muss größer als 0 € sein.");\n    }',
    '    if (!data.deposit_exemption_reason && data.deposit_amount > 0 && !data.deposit_paid_at) {\n      throw new Error("Das Eingangsdatum der Zahlung fehlt.");\n    }\n    if (data.booking_type !== "custom_content" && !data.deposit_exemption_reason && data.deposit_amount <= 0) {\n      throw new Error("Die erhaltene Anzahlung muss größer als 0 € sein.");\n    }',
  );
  text = text.replace(
    '      data.preferences ? `Vorlieben & Wünsche:\\n${data.preferences}` : null,',
    '      data.preferences ? `${data.booking_type === "custom_content" ? "Custom-Content-Wunsch" : "Vorlieben & Wünsche"}:\\n${data.preferences}` : null,',
  );
  text = text.replace(
    '    const message = [\n      ...originLines,\n      ...profileSections,\n      "—\\nManuell durch Admin eingetragen.",\n    ].join("\\n\\n");',
    '    const message = data.booking_type === "custom_content"\n      ? "Custom Content – manuell durch Admin eingetragen."\n      : [\n          ...originLines,\n          ...profileSections,\n          "—\\nManuell durch Admin eingetragen.",\n        ].join("\\n\\n").slice(0, 2000);',
  );
  if (!text.includes('const message = data.booking_type === "custom_content"')) {
    throw new Error("Custom-Content-Nachricht konnte nicht sicher gepatcht werden.");
  }
  text = text.replace(
    '  is_content_shoot: data.booking_type === "content",',
    '  is_content_shoot: data.booking_type === "content" || data.booking_type === "custom_content",',
  );
  text = text.replace(
    '    : data.booking_type === "content"\n      ? "Content Dreh"\n      : `${durationMinutes} Minuten`,',
    '    : data.booking_type === "custom_content"\n      ? "Custom Content"\n      : data.booking_type === "content"\n        ? "Content Dreh"\n        : `${durationMinutes} Minuten`,',
  );
  text = text.replace(
    '        anzahlung_paid: data.deposit_exemption_reason ? false : true,\n        anzahlung_paid_at: data.deposit_exemption_reason ? null : `${data.deposit_paid_at}T12:00:00.000Z`,',
    '        anzahlung_paid: !data.deposit_exemption_reason && data.deposit_amount > 0,\n        anzahlung_paid_at: !data.deposit_exemption_reason && data.deposit_amount > 0 && data.deposit_paid_at ? `${data.deposit_paid_at}T12:00:00.000Z` : null,',
  );
  return text;
});

apply("src/components/admin/admin-shared.tsx", (text) =>
  text.replace(
    '  booking_type: "single" | "duo" | "content";',
    '  booking_type: "single" | "duo" | "content" | "custom_content";',
  ),
);

apply("src/routes/_authenticated/admin.terminplan.tsx", (text) => {
  if (!text.includes('CustomContentForm')) {
    text = text.replace(
      'import { ManualBookingForm, type ManualBookingValues } from "@/components/admin/admin-shared";',
      'import { ManualBookingForm, type ManualBookingValues } from "@/components/admin/admin-shared";\nimport { CustomContentForm } from "@/components/admin/custom-content-form";',
    );

    const marker = '          {q.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}';
    const block = `          <details className="mb-8 bg-card border border-champagne/25">
            <summary className="cursor-pointer px-5 py-4 text-sm text-vanilla/80 hover:text-champagne flex items-center gap-2">
              <Crown size={16} className="text-champagne" />
              Custom Content eintragen
            </summary>
            <div className="p-5 border-t border-champagne/15">
              <CustomContentForm
                onCreate={(values) => manualMut.mutateAsync(values)}
                pending={manualMut.isPending}
                studios={studiosQ.data}
              />
            </div>
          </details>

${marker}`;
    if (!text.includes(marker)) throw new Error("Terminplan-Marker fehlt.");
    text = text.replace(marker, block);
  }

  text = text.replace(
    '        : entry.is_content_shoot\n          ? "CONTENT"',
    '        : entry.duration === "Custom Content"\n          ? "CUSTOM CONTENT"\n          : entry.is_content_shoot\n            ? "CONTENT"',
  );
  text = text.replace(
    '              Content\n            </span>',
    '              {e.duration === "Custom Content" ? "Custom Content" : "Content"}\n            </span>',
  );
  return text;
});

console.log("Custom Content booking workflow applied.");
