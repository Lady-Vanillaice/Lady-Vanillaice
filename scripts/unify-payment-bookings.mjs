import { readFileSync, writeFileSync } from "node:fs";

function replace(text, from, to) { return text.includes(from) ? text.replace(from, to) : text; }

// Booking list / fix dialog
{
  const path = "src/routes/_authenticated/admin.termine.tsx";
  let text = readFileSync(path, "utf8");
  const before = text;
  text = replace(text, 'import { updateBookingRestPaymentMethod } from "@/lib/rest-payment.functions";', 'import { updateBookingOnsitePayment } from "@/lib/rest-payment.functions";');
  text = replace(text, '  const updateRestPaymentFn = useServerFn(updateBookingRestPaymentMethod);', '  const updateOnsitePaymentFn = useServerFn(updateBookingOnsitePayment);');
  text = replace(text, '      restzahlung_method?: string | null;\n      deposit_exemption_reason?:', '      restzahlung_method?: string | null;\n      onsite_paid_at?: string | null;\n      deposit_exemption_reason?:');
  text = replace(text,
    '      const { restzahlung_method, ...bookingData } = v;\n      await updateBookingFn({ data: bookingData });\n      if (restzahlung_method !== undefined) {\n        await updateRestPaymentFn({ data: { id: v.id, restzahlung_method } });\n      }',
    '      const { restzahlung_method, onsite_paid_at, ...bookingData } = v;\n      await updateBookingFn({ data: bookingData });\n      if (bookingData.bar !== undefined || restzahlung_method !== undefined || onsite_paid_at !== undefined) {\n        await updateOnsitePaymentFn({ data: { id: v.id, amount: bookingData.bar ?? 0, method: restzahlung_method ?? null, paid_at: onsite_paid_at ?? null } });\n      }',
  );
  text = replace(text,
    '  onSave: (values: { anzahlung: number; bar: number; anzahlung_method: string | null; anzahlung_paid_at: string | null; restzahlung_method: string | null; deposit_exemption_reason:',
    '  onSave: (values: { anzahlung: number; bar: number; anzahlung_method: string | null; anzahlung_paid_at: string | null; restzahlung_method: string | null; onsite_paid_at: string | null; deposit_exemption_reason:',
  );
  if (!text.includes('const [onsitePaidAt, setOnsitePaidAt]')) {
    text = replace(text, '  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));', '  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));\n  const [onsitePaidAt, setOnsitePaidAt] = useState("");');
  }
  text = replace(text, '      restzahlung_method: rest > 0 ? restMethod.trim() : null,\n      deposit_exemption_reason:', '      restzahlung_method: rest > 0 ? restMethod.trim() : null,\n      onsite_paid_at: onsitePaidAt || null,\n      deposit_exemption_reason:');
  text = text.replaceAll('Anzahlung erhalten (€)', 'Anzahlung Betrag (€)');
  text = text.replaceAll('Zahlungsart Anzahlung', 'Anzahlungsmethode');
  text = text.replaceAll('Anzahlung eingegangen am', 'Anzahlung erhalten am');
  text = text.replaceAll('Restzahlung (€)', 'Vor Ort Betrag (€)');
  text = text.replaceAll('Zahlungsart Rest / vor Ort', 'Vor Ort Zahlungsmethode');
  text = text.replaceAll('Restzahlung</span>', 'Vor Ort</span>');
  if (!text.includes('value={onsitePaidAt}')) {
    text = replace(text,
      '<label className="space-y-1"><span className="eyebrow block">Vor Ort Zahlungsmethode</span><select disabled={rest <= 0} value={restMethod} onChange={(e) => setRestMethod(e.target.value)} className="input-luxe disabled:opacity-40">{PAYMENT_METHODS.map((v) => <option key={v}>{v}</option>)}</select></label>',
      '<label className="space-y-1"><span className="eyebrow block">Vor Ort Zahlungsmethode</span><select disabled={rest <= 0} value={restMethod} onChange={(e) => setRestMethod(e.target.value)} className="input-luxe disabled:opacity-40">{PAYMENT_METHODS.map((v) => <option key={v}>{v}</option>)}</select></label><label className="space-y-1"><span className="eyebrow block">Vor Ort erhalten am</span><input disabled={rest <= 0} type="date" value={onsitePaidAt} onChange={(e) => setOnsitePaidAt(e.target.value)} className="input-luxe disabled:opacity-40" /></label>',
    );
  }
  if (text !== before) writeFileSync(path, text);
  console.log("Web booking fix-dialog payment fields unified.");
}

// Detailed booking editor
{
  const path = "src/routes/_authenticated/admin.buchung.$id.tsx";
  let text = readFileSync(path, "utf8");
  const before = text;
  if (!text.includes('updateBookingOnsitePayment')) {
    text = replace(text, 'import { DEFAULT_STUDIOS, listStudios } from "@/lib/studio.functions";', 'import { DEFAULT_STUDIOS, listStudios } from "@/lib/studio.functions";\nimport { updateBookingOnsitePayment } from "@/lib/rest-payment.functions";');
  }
  if (!text.includes('const updateOnsitePaymentFn = useServerFn(updateBookingOnsitePayment);')) {
    text = replace(text, '  const savePayment = useServerFn(updateBookingPayment);', '  const savePayment = useServerFn(updateBookingPayment);\n  const updateOnsitePaymentFn = useServerFn(updateBookingOnsitePayment);');
  }
  if (!text.includes('const [restPaymentMethod, setRestPaymentMethod]')) {
    text = replace(text, '  const [barInput, setBarInput] = useState<string>("");', '  const [barInput, setBarInput] = useState<string>("");\n  const [restPaymentMethod, setRestPaymentMethod] = useState<string>("Bar");\n  const [barPaidDate, setBarPaidDate] = useState<string>("");');
  }
  text = replace(text, '  bar: number | string | null;\n  availability_slots?:', '  bar: number | string | null;\n  restzahlung_method: string | null;\n  cash_received_at: string | null;\n  availability_slots?:');
  if (!text.includes('setRestPaymentMethod(b.restzahlung_method')) {
    text = replace(text, '      setBarInput(b.bar != null ? String(b.bar) : "0");', '      setBarInput(b.bar != null ? String(b.bar) : "0");\n      setRestPaymentMethod(b.restzahlung_method ?? "Bar");\n      setBarPaidDate(b.cash_received_at ? String(b.cash_received_at).slice(0, 10) : "");');
  }
  text = replace(text,
    '  const paymentMut = useMutation({\n    mutationFn: () => {\n      const a = Number((anzahlungInput || "0").replace(",", ".")) || 0;\n      const b = Number((barInput || "0").replace(",", ".")) || 0;\n      return savePayment({ data: { id, anzahlung: depositExemptionReason ? 0 : a, bar: b, anzahlung_method: depositExemptionReason ? null : anzahlungMethod.trim() || null, deposit_exemption_reason: depositExemptionReason || null } });\n    },',
    '  const paymentMut = useMutation({\n    mutationFn: async () => {\n      const a = Number((anzahlungInput || "0").replace(",", ".")) || 0;\n      const b = Number((barInput || "0").replace(",", ".")) || 0;\n      await savePayment({ data: { id, anzahlung: depositExemptionReason ? 0 : a, bar: b, anzahlung_method: depositExemptionReason ? null : anzahlungMethod.trim() || null, deposit_exemption_reason: depositExemptionReason || null } });\n      await updateOnsitePaymentFn({ data: { id, amount: b, method: b > 0 ? restPaymentMethod.trim() || null : null, paid_at: b > 0 ? barPaidDate || null : null } });\n    },',
  );
  text = text.replaceAll('Anzahlung (€)', 'Anzahlung Betrag (€)');
  text = text.replaceAll('Zahlungsart der Anzahlung', 'Anzahlungsmethode');
  text = text.replaceAll('Anzahlung eingegangen am', 'Anzahlung erhalten am');
  text = text.replaceAll('Bar vor Ort (€)', 'Vor Ort Betrag (€)');
  text = text.replaceAll('Barzahlung vor Ort', 'Zahlung vor Ort');
  text = text.replaceAll('Restbetrag bar vor Ort:', 'Vor Ort Betrag:');
  text = text.replaceAll('Rest bar', 'Vor Ort');
  if (!text.includes('Vor Ort Zahlungsmethode')) {
    const old = '<div>\n                <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">\n                  Vor Ort Betrag (€)\n                </label>\n                <input\n                  type="text"\n                  inputMode="decimal"\n                  value={barInput}\n                  onChange={(e) => { setBarInput(e.target.value); setShortSessionPrice(""); }}\n                  placeholder="0"\n                  className="input-luxe w-full"\n                />\n              </div>';
    const next = old + '<div><label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">Vor Ort Zahlungsmethode</label><select value={restPaymentMethod} onChange={(e) => setRestPaymentMethod(e.target.value)} className="input-luxe w-full"><option>Bar</option><option>PayPal</option><option>Überweisung</option><option>Karte</option><option>Sonstige</option></select></div><div><label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">Vor Ort erhalten am</label><input type="date" value={barPaidDate} onChange={(e) => setBarPaidDate(e.target.value)} className="input-luxe w-full" /></div>';
    text = replace(text, old, next);
  }
  text = replace(text,
    '      `Vor Ort Betrag: ${cashValue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,',
    '      `Vor Ort Betrag: ${cashValue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €${restPaymentMethod.trim() ? ` per ${restPaymentMethod.trim()}` : ""}`,\n      barPaidDate ? `Vor Ort erhalten am: ${format(new Date(`${barPaidDate}T12:00:00`), "dd.MM.yyyy", { locale: de })}` : null,',
  );
  if (text !== before) writeFileSync(path, text);
  console.log("Detailed booking payment fields unified.");
}
