import { readFileSync, writeFileSync } from "node:fs";

function replace(text, from, to) { return text.includes(from) ? text.replace(from, to) : text; }

const path = "src/components/admin/admin-shared.tsx";
let text = readFileSync(path, "utf8");
const before = text;

text = replace(text,
  'import { updateBookingRestPaymentMethodBySlot } from "@/lib/rest-payment.functions";',
  'import { updateBookingOnsitePaymentBySlot } from "@/lib/rest-payment.functions";',
);
text = replace(text,
  '  const updateRestPaymentMethodBySlotFn = useServerFn(updateBookingRestPaymentMethodBySlot);',
  '  const updateOnsitePaymentBySlotFn = useServerFn(updateBookingOnsitePaymentBySlot);',
);
if (!text.includes('const [onsitePaidAt, setOnsitePaidAt]')) {
  text = replace(text,
    '  const [depositPaidAt, setDepositPaidAt] = useState(() => new Date().toISOString().slice(0, 10));',
    '  const [depositPaidAt, setDepositPaidAt] = useState(() => new Date().toISOString().slice(0, 10));\n  const [onsitePaidAt, setOnsitePaidAt] = useState("");',
  );
}

text = text.replace(
  /if \(depositExemptionReason && created && typeof created === "object" && "slot_id" in created\) \{[\s\S]*?\n      \}/,
  `if (created && typeof created === "object" && "slot_id" in created) {\n        const slotId = (created as { slot_id?: unknown }).slot_id;\n        if (typeof slotId === "string") {\n          await updateOnsitePaymentBySlotFn({ data: { slot_id: slotId, amount: Math.max(0, total - (depositExemptionReason ? 0 : deposit)), method: onsiteMethod.trim() || null, paid_at: onsitePaidAt || null } });\n        }\n      }`,
);
if (!text.includes('setOnsitePaidAt("");')) {
  text = replace(text, '      setDepositMethod("Überweisung");', '      setDepositMethod("Überweisung");\n      setOnsiteMethod("Bar");\n      setOnsitePaidAt("");');
}

text = text.replaceAll('Anzahlung erhalten (€)', 'Anzahlung Betrag (€)');
text = text.replaceAll('Anzahlung eingegangen am', 'Anzahlung erhalten am');
text = text.replaceAll('Zahlungsart Anzahlung', 'Anzahlungsmethode');
text = replace(text,
  '<div><label className="eyebrow block mb-1">{depositExemptionReason ? "Zahlungsart Restzahlung" : "Anzahlungsmethode"}</label><select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="input-luxe !py-2"><option>Überweisung</option><option>PayPal</option><option>Bar</option><option>Sonstige</option></select></div>',
  '<div><label className="eyebrow block mb-1">Anzahlungsmethode</label><select disabled={Boolean(depositExemptionReason)} value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="input-luxe !py-2 disabled:opacity-40"><option>Überweisung</option><option>PayPal</option><option>Bar</option><option>Karte</option><option>Sonstige</option></select></div>',
);

// Remove old/legacy onsite selectors before adding the single canonical one.
text = text.replace(
  /<div><label className="eyebrow block mb-1">\{depositExemptionReason \? "Zahlungsart Zahlung vor Ort" : "Zahlungsart Vorkasse"\}<\/label><select[^>]*>[\s\S]*?<\/select><\/div>/g,
  '',
);
text = text.replace(
  /<div[^>]*><label className="eyebrow block mb-1">Zahlungsart Zahlung vor Ort<\/label><select[^>]*>[\s\S]*?<\/select><\/div>/g,
  '',
);

const shortOnly = '<div className={shortSessionPrice && depositExemptionReason === "spontaneous" ? "" : "hidden"}><label className="eyebrow block mb-1">Zahlungsart vor Ort</label><select value={onsiteMethod} onChange={(e) => setOnsiteMethod(e.target.value)} className="input-luxe !py-2"><option>Bar</option><option>PayPal</option><option>Überweisung</option><option>Karte</option><option>Sonstige</option></select></div>';
const onsite = '<div><label className="eyebrow block mb-1">Vor Ort Betrag (€)</label><div className="input-luxe !py-2 opacity-80">{Math.max(0, (Number(totalAmount.replace(",", ".")) || 0) - (depositExemptionReason ? 0 : (Number(depositAmount.replace(",", ".")) || 0))).toLocaleString("de-DE")} €</div></div><div><label className="eyebrow block mb-1">Vor Ort Zahlungsmethode</label><select value={onsiteMethod} onChange={(e) => setOnsiteMethod(e.target.value)} className="input-luxe !py-2"><option>Bar</option><option>PayPal</option><option>Überweisung</option><option>Karte</option><option>Sonstige</option></select></div><div><label className="eyebrow block mb-1">Vor Ort erhalten am</label><input type="date" value={onsitePaidAt} onChange={(e) => setOnsitePaidAt(e.target.value)} className="input-luxe !py-2" /></div>';
text = replace(text, shortOnly, onsite);
text = text.replaceAll('Noch bar beim Termin', 'Vor Ort Betrag');

if (text !== before) writeFileSync(path, text);
console.log("External payment fields unified.");

// Production DBs that have not yet received the spontaneous constraint migration
// must still be able to create spontaneous appointments. Keep the UI label
// "Spontaner Termin", but store it using the already-supported exception value.
const terminplan = "src/routes/_authenticated/admin.terminplan.tsx";
let plan = readFileSync(terminplan, "utf8");
const planBefore = plan;
if (plan.includes('      data: input,')) {
  plan = replace(plan,
    '      data: input,',
    '      data: {\n        ...input,\n        deposit_exemption_reason: input.deposit_exemption_reason === "spontaneous" ? "exception" : input.deposit_exemption_reason,\n      },',
  );
}
if (plan !== planBefore) writeFileSync(terminplan, plan);
console.log("Spontaneous external appointments use DB-compatible exemption storage.");
