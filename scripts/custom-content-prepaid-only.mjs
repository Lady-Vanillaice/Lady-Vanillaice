import fs from "node:fs";

function replaceOrThrow(path, before, after, label) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) {
    console.log(`[custom-prepaid] already applied: ${label}`);
    return;
  }
  if (!source.includes(before)) {
    throw new Error(`[custom-prepaid] target not found: ${label} in ${path}`);
  }
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
  console.log(`[custom-prepaid] applied: ${label}`);
}

function regexReplaceOrThrow(path, pattern, replacement, label, alreadyAppliedNeedle) {
  let source = fs.readFileSync(path, "utf8");
  if (alreadyAppliedNeedle && source.includes(alreadyAppliedNeedle)) {
    console.log(`[custom-prepaid] already applied: ${label}`);
    return;
  }
  if (!pattern.test(source)) {
    throw new Error(`[custom-prepaid] pattern not found: ${label} in ${path}`);
  }
  source = source.replace(pattern, replacement);
  fs.writeFileSync(path, source);
  console.log(`[custom-prepaid] applied: ${label}`);
}

const customForm = "src/components/admin/custom-content-form.tsx";

replaceOrThrow(
  customForm,
  `  const [paymentAmount, setPaymentAmount] = useState("");\n  const [paymentMethod, setPaymentMethod] = useState("Überweisung");\n  const [isPaid, setIsPaid] = useState(true);`,
  `  const [paymentMethod, setPaymentMethod] = useState("Überweisung");`,
  "remove partial/open payment state",
);

replaceOrThrow(
  customForm,
  `    const total = Number(totalAmount.replace(",", "."));\n    const paid = isPaid ? Number((paymentAmount || totalAmount).replace(",", ".")) : 0;`,
  `    const total = Number(totalAmount.replace(",", "."));\n    const paid = total;`,
  "force full prepayment amount",
);

replaceOrThrow(
  customForm,
  `    if (isPaid && (!Number.isFinite(paid) || paid <= 0 || paid > total)) {\n      setError("Bitte den tatsächlich erhaltenen Betrag eintragen. Er darf den Gesamtpreis nicht überschreiten.");\n      return;\n    }`,
  `    if (!Number.isFinite(paid) || paid <= 0) {\n      setError("Custom Content wird nur bei vollständiger Vorauszahlung angelegt.");\n      return;\n    }`,
  "require full prepayment",
);

replaceOrThrow(
  customForm,
  `    if (isPaid && !paymentMethod.trim()) {\n      setError("Bitte angeben, wie das Geld geschickt wurde.");\n      return;\n    }\n    if (isPaid && !paidAt) {\n      setError("Bitte das Zahlungsdatum angeben.");\n      return;\n    }`,
  `    if (!paymentMethod.trim()) {\n      setError("Bitte angeben, wie die Vorauszahlung geschickt wurde.");\n      return;\n    }\n    if (!paidAt) {\n      setError("Bitte das Datum der Vorauszahlung angeben.");\n      return;\n    }`,
  "always require payment method and date",
);

regexReplaceOrThrow(
  customForm,
  /        internal_note: \[\n          note\.trim\(\) \|\| null,\n          isPaid\n            \? `Custom-Content-Zahlung: \$\{paid\.toLocaleString\("de-DE", \{ style: "currency", currency: "EUR" \}\)\} · \$\{paymentMethod\.trim\(\)\} · \$\{paidAt\}`\n            : "Custom-Content-Zahlung: noch offen",\n        \]\.filter\(Boolean\)\.join\("\\n\\n"\) \|\| null,/,
  `        internal_note: [\n          note.trim() || null,\n          \`Custom-Content-Vorauszahlung vollständig: \${paid.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} · \${paymentMethod.trim()} · \${paidAt}\`,\n        ].filter(Boolean).join("\\n\\n") || null,`,
  "store full prepayment note",
  "Custom-Content-Vorauszahlung vollständig:",
);

replaceOrThrow(
  customForm,
  `        deposit_amount: paid,\n        deposit_method: isPaid ? paymentMethod.trim() : paymentMethod.trim() || "Überweisung",\n        deposit_paid_at: isPaid ? paidAt : null,`,
  `        deposit_amount: total,\n        deposit_method: paymentMethod.trim(),\n        deposit_paid_at: paidAt,`,
  "persist full prepayment",
);

replaceOrThrow(
  customForm,
  `      setTotalAmount("");\n      setPaymentAmount("");\n      setIsPaid(true);\n      setPaidAt(new Date().toISOString().slice(0, 10));`,
  `      setTotalAmount("");\n      setPaidAt(new Date().toISOString().slice(0, 10));`,
  "reset simplified payment form",
);

regexReplaceOrThrow(
  customForm,
  /      <div className="border border-champagne\/30 bg-anthracite\/35 p-4 space-y-4">\n        <div className="eyebrow flex items-center gap-2"><CreditCard size=\{14\} \/> Zahlung<\/div>[\s\S]*?      <div className="border border-champagne\/30 bg-anthracite\/35 p-4 space-y-4">\n        <div className="eyebrow flex items-center gap-2"><CalendarPlus size=\{14\} \/> Terminplan · Content produzieren<\/div>/,
  `      <div className="border border-champagne/30 bg-anthracite/35 p-4 space-y-4">\n        <div className="eyebrow flex items-center gap-2"><CreditCard size={14} /> Vorauszahlung</div>\n        <p className="text-xs text-vanilla/55 leading-relaxed">\n          Custom Content wird nur nach vollständiger Vorauszahlung angelegt. Trage den gesamten vereinbarten Betrag, Zahlungsweg und das Eingangsdatum ein.\n        </p>\n\n        <div>\n          <label className="eyebrow block mb-1">Gesamtbetrag · vollständig vorausbezahlt (€)</label>\n          <input inputMode="decimal" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="input-luxe !py-2" placeholder="z. B. 250" />\n        </div>\n\n        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">\n          <div>\n            <label className="eyebrow block mb-1">Wie vorausbezahlt?</label>\n            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-luxe !py-2">\n              <option value="Überweisung">Überweisung</option>\n              <option value="PayPal">PayPal</option>\n              <option value="Kreditkarte">Kreditkarte</option>\n              <option value="Sonstiges">Sonstiges</option>\n            </select>\n          </div>\n          <div>\n            <label className="eyebrow block mb-1">Vorauszahlung erhalten am</label>\n            <input type="date" required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="input-luxe !py-2" />\n          </div>\n        </div>\n      </div>\n\n      <div className="border border-champagne/30 bg-anthracite/35 p-4 space-y-4">\n        <div className="eyebrow flex items-center gap-2"><CalendarPlus size={14} /> Terminplan · Content produzieren</div>`,
  "replace Custom Content payment UI",
  "Gesamtbetrag · vollständig vorausbezahlt (€)",
);

replaceOrThrow(
  customForm,
  `        Zahlung und Produktionszeit werden gemeinsam am Custom-Content-Auftrag gespeichert. Der Produktionstermin erscheint direkt im Terminplan; erhaltene Beträge werden im Kassenbuch berücksichtigt.`,
  `        Die vollständige Vorauszahlung und Produktionszeit werden gemeinsam am Custom-Content-Auftrag gespeichert. Es gibt bei Custom Content keine Anzahlung und keinen Restbetrag vor Ort.`,
  "clarify prepaid-only workflow",
);

const detail = "src/routes/_authenticated/admin.buchung.$id.tsx";

replaceOrThrow(
  detail,
  `  const paymentMut = useMutation({`,
  `  const isCustomContentBooking = detailQ.data?.booking?.duration === "Custom Content";\n\n  const customPaymentMut = useMutation({\n    mutationFn: async () => {\n      const amount = Number((anzahlungInput || "0").replace(",", ".")) || 0;\n      if (amount <= 0) throw new Error("Bitte den vollständig vorausbezahlten Gesamtbetrag eintragen.");\n      if (!anzahlungMethod.trim()) throw new Error("Bitte die Zahlungsart der Vorauszahlung eintragen.");\n      if (!anzahlungPaidDate) throw new Error("Bitte das Datum der Vorauszahlung eintragen.");\n      await savePayment({ data: { id, anzahlung: amount, bar: 0, anzahlung_method: anzahlungMethod.trim(), deposit_exemption_reason: null } });\n      await updateDepositPaidDateFn({ data: { id, anzahlung_paid_at: anzahlungPaidDate } });\n      await updateOnsitePaymentFn({ data: { id, amount: 0, method: null, paid_at: null } });\n    },\n    onSuccess: () => {\n      setBarInput("0");\n      setPaymentSaved(true);\n      setTimeout(() => setPaymentSaved(false), 2500);\n      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n    },\n  });\n\n  const paymentMut = useMutation({`,
  "add Custom Content full-prepayment save mutation",
);

replaceOrThrow(
  detail,
  `          {/* ZAHLUNG — freie Beträge */}\n          <div className="bg-card border border-champagne/15 p-6 mb-6">`,
  `          {/* ZAHLUNG — Custom Content ist immer vollständig vorausbezahlt */}\n          {isCustomContentBooking && (\n            <div className="bg-card border border-champagne/15 p-6 mb-6">\n              <div className="eyebrow mb-3 flex items-center justify-between gap-2">\n                <span className="flex items-center gap-2"><Euro size={12} /> Vorauszahlung · Custom Content</span>\n                {paymentSaved && <span className="text-[0.6rem] text-green-300 normal-case tracking-normal">✓ gespeichert</span>}\n              </div>\n              <p className="text-[0.7rem] text-vanilla/55 mb-4 leading-relaxed">\n                Custom Content wird nur nach vollständiger Vorauszahlung durchgeführt. Deshalb gibt es hier keine Anzahlung und keinen Restbetrag oder Barzahlung vor Ort.\n              </p>\n              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">\n                <div>\n                  <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">Gesamtbetrag · vorausbezahlt (€)</label>\n                  <input type="text" inputMode="decimal" value={anzahlungInput} onChange={(e) => setAnzahlungInput(e.target.value)} className="input-luxe w-full" placeholder="0" />\n                </div>\n                <div>\n                  <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">Zahlungsart</label>\n                  <select value={anzahlungMethod} onChange={(e) => setAnzahlungMethod(e.target.value)} className="input-luxe w-full">\n                    <option value="">Auswählen</option>\n                    <option value="Bank">Bank</option>\n                    <option value="PayPal">PayPal</option>\n                    <option value="Kreditkarte">Kreditkarte</option>\n                    <option value="Sonstige">Sonstige</option>\n                  </select>\n                </div>\n                <div>\n                  <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">Vorauszahlung erhalten am</label>\n                  <input type="date" value={anzahlungPaidDate} onChange={(e) => setAnzahlungPaidDate(e.target.value)} className="input-luxe w-full" />\n                </div>\n              </div>\n              <div className="mt-4 flex justify-end">\n                <button type="button" disabled={customPaymentMut.isPending} onClick={() => customPaymentMut.mutate()} className="text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30">\n                  {customPaymentMut.isPending ? "Speichere…" : "Vorauszahlung speichern"}\n                </button>\n              </div>\n              {customPaymentMut.error && <p className="mt-3 text-xs text-bordeaux">{(customPaymentMut.error as Error).message}</p>}\n            </div>\n          )}\n\n          {/* ZAHLUNG — normale Sessions */}\n          {!isCustomContentBooking && (\n          <div className="bg-card border border-champagne/15 p-6 mb-6">`,
  "insert Custom Content prepaid-only payment card",
);

replaceOrThrow(
  detail,
  `          </div>\n          </>)}\n\n          {activeTab === "history" && (<>`,
  `          </div>\n          )}\n          </>)}\n\n          {activeTab === "history" && (<>`,
  "close normal-payment conditional",
);

console.log("Custom Content is now full-prepayment only in creation and booking details.");
