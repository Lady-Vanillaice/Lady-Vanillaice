import { readFileSync, writeFileSync } from "node:fs";

// Keep Kassenbuch appointment times in exactly the same source-of-truth logic
// as the Terminplan: requested_start wins, and the end is start + booked
// duration when a duration override exists.
{
  const path = "src/lib/cashbook.functions.ts";
  let text = readFileSync(path, "utf8");
  const before = text;

  const oldTermin = '      const termin = dateOnly(b.requested_start ?? slot?.starts_at) ?? dateOnly(b.created_at)!;';
  const newTermin = `      const appointmentStart = b.requested_start ?? slot?.starts_at ?? null;\n      const appointmentEnd = appointmentStart && Number(b.duration_minutes ?? 0) > 0\n        ? new Date(new Date(appointmentStart).getTime() + Number(b.duration_minutes) * 60_000).toISOString()\n        : slot?.ends_at ?? null;\n      const termin = dateOnly(appointmentStart) ?? dateOnly(b.created_at)!;`;
  if (text.includes(oldTermin)) text = text.replace(oldTermin, newTermin);

  text = text.replace(
    '        termin_start: b.requested_start ?? slot?.starts_at ?? null, termin_ende: slot?.ends_at ?? null,',
    '        termin_start: appointmentStart, termin_ende: appointmentEnd,',
  );

  for (const marker of ["const appointmentStart =", "termin_start: appointmentStart", "termin_ende: appointmentEnd"]) {
    if (!text.includes(marker)) throw new Error(`Kassenbuch-Zeitabgleich konnte nicht eingebaut werden: ${marker}`);
  }

  if (text !== before) writeFileSync(path, text);
}

// Keep finished appointments out of the active cashbook list and expose them
// in one explicit, collapsible "Vergangene Termine" area. Also surface delete
// errors instead of silently leaving the row visible.
{
  const path = "src/routes/_authenticated/admin.kassenbuch.tsx";
  let text = readFileSync(path, "utf8");
  const before = text;

  if (!text.includes("const activeIncomeEntries =")) {
    text = text.replace(
      '  const incomeEntries = filtered.filter(e => e.entry_type === "income");',
      '  const incomeEntries = filtered.filter(e => e.entry_type === "income");\n  const activeIncomeEntries = incomeEntries.filter(e => e.status !== "completed");\n  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed");',
    );
  }

  // The two normal UI lists (mobile + desktop) show active items only.
  text = text.replaceAll("incomeEntries.map(e =>", "activeIncomeEntries.map(e =>");

  const oldMutation = '  const hideBookingMut = useMutation({ mutationFn: (booking_id: string) => hideBooking({ data: { booking_id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook-hidden-bookings"] }); qc.invalidateQueries({ queryKey: ["cashbook"] }); } });';
  const newMutation = `  const hideBookingMut = useMutation({\n    mutationFn: (booking_id: string) => hideBooking({ data: { booking_id } }),\n    onSuccess: async () => {\n      await Promise.all([\n        qc.invalidateQueries({ queryKey: ["cashbook-hidden-bookings"], refetchType: "all" }),\n        qc.invalidateQueries({ queryKey: ["cashbook"], refetchType: "all" }),\n        qc.invalidateQueries({ queryKey: ["admin-bookings"], refetchType: "all" }),\n        qc.invalidateQueries({ queryKey: ["admin-slots"], refetchType: "all" }),\n      ]);\n    },\n    onError: (err) => alert(\`Termin konnte nicht gelöscht werden: \${err instanceof Error ? err.message : String(err)}\`),\n  });`;
  if (text.includes(oldMutation)) text = text.replace(oldMutation, newMutation);

  const totalMarker = '      <div className="border border-champagne/30 bg-card p-4"><div className="eyebrow text-champagne mb-3">Gesamtsumme</div>';
  if (!text.includes("Vergangene Termine ({completedIncomeEntries.length})")) {
    const archive = `      {completedIncomeEntries.length > 0 && (\n        <details className="bg-card border border-champagne/20">\n          <summary className="cursor-pointer px-4 py-4 text-sm uppercase tracking-[0.16em] text-champagne hover:bg-champagne/5">\n            Vergangene Termine ({completedIncomeEntries.length})\n          </summary>\n          <div className="border-t border-champagne/15">\n            <div className="md:hidden space-y-3 p-3">\n              {completedIncomeEntries.map(e => <article key={e.id} className="bg-anthracite/20 border border-champagne/15 p-4 space-y-2"><div className="flex justify-between gap-3"><div><strong>{e.kunde}</strong><div className="text-xs text-champagne">{paymentDateText(e)}</div></div><span className="text-champagne text-right">{bookingAmountText(e)}</span></div><div className="text-xs text-vanilla/55">Session: {dateLabel(e.termin_datum)} · {appointmentTime(e)} · {e.art}</div><div className="text-sm">{studioParts(e).studio}</div>{studioParts(e).address && <div className="text-xs text-vanilla/55">{studioParts(e).address}</div>}<div className="text-xs">Zahlungsart: {paymentMethodText(e)}</div><div className="flex justify-between"><span className={\`status-\${e.status}\`}>{statusLabel[e.status]}</span>{incomeActions(e)}</div></article>)}\n            </div>\n            <div className="hidden md:block overflow-x-auto">\n              <table className="w-full text-sm min-w-[1250px]"><thead><tr className="text-[10px] uppercase text-vanilla/50">{["Zahlungseingang", "Vorgang", "Anzahlung / Restbetrag", "Zahlungsart", "Kunde", "Session am", "Uhrzeit", "Art", "Studio / Adresse", "Dauer", "Status", ""].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{completedIncomeEntries.map(e => <tr key={e.id} className="border-t border-champagne/10"><td className="p-3">{paymentDateText(e)}</td><td className="p-3">{paymentLabel(e)}</td><td className="p-3 text-champagne">{bookingAmountText(e)}</td><td className="p-3">{paymentMethodText(e)}</td><td className="p-3 font-medium">{e.kunde}</td><td className="p-3">{dateLabel(e.termin_datum)}</td><td className="p-3">{appointmentTime(e)}</td><td className="p-3">{e.art}</td><td className="p-3"><div>{studioParts(e).studio}</div>{studioParts(e).address && <div className="text-xs text-vanilla/50 mt-1">{studioParts(e).address}</div>}</td><td className="p-3">{e.dauer ?? "—"}</td><td className="p-3"><span className={\`status-\${e.status}\`}>{statusLabel[e.status]}</span></td><td className="p-3">{incomeActions(e)}</td></tr>)}</tbody></table>\n            </div>\n          </div>\n        </details>\n      )}\n`;
    if (!text.includes(totalMarker)) throw new Error("Kassenbuch-Archivposition nicht gefunden.");
    text = text.replace(totalMarker, archive + totalMarker);
  }

  for (const marker of ["const activeIncomeEntries =", "const completedIncomeEntries =", "Vergangene Termine ({completedIncomeEntries.length})", "onError: (err) => alert"]) {
    if (!text.includes(marker)) throw new Error(`Kassenbuch-UI konnte nicht sicher angepasst werden: ${marker}`);
  }

  if (text !== before) writeFileSync(path, text);
}

console.log("Cashbook times, archive and delete feedback applied safely.");
