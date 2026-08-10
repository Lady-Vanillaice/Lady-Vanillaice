import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.kassenbuch.tsx";
let text = readFileSync(path, "utf8");
const before = text;

const restImport = 'import { listBookingRestPaymentMethods, updateBookingRestPaymentMethod } from "@/lib/rest-payment.functions";';
if (!text.includes('cashbook-visibility.functions')) {
  text = text.replace(restImport, `${restImport}\nimport { hideBookingFromCashbook, listHiddenCashbookBookings } from "@/lib/cashbook-visibility.functions";`);
}
if (!text.includes('const listHiddenBookings = useServerFn(listHiddenCashbookBookings);')) {
  text = text.replace(
    '  const listRestPayments = useServerFn(listBookingRestPaymentMethods);',
    '  const listRestPayments = useServerFn(listBookingRestPaymentMethods);\n  const listHiddenBookings = useServerFn(listHiddenCashbookBookings);\n  const hideBooking = useServerFn(hideBookingFromCashbook);',
  );
}
if (!text.includes('queryKey: ["cashbook-hidden-bookings"]')) {
  text = text.replace(
    '  const { data: restPaymentMethods = {} } = useQuery({ queryKey: ["booking-rest-payment-methods"], queryFn: () => listRestPayments() });',
    '  const { data: restPaymentMethods = {} } = useQuery({ queryKey: ["booking-rest-payment-methods"], queryFn: () => listRestPayments() });\n  const { data: hiddenBookingIds = [] } = useQuery({ queryKey: ["cashbook-hidden-bookings"], queryFn: () => listHiddenBookings() });',
  );
}
if (!text.includes('const hiddenBookingSet = useMemo')) {
  text = text.replace(
    '  const restMethodFor = (e: CashBookEntry) => {',
    '  const hiddenBookingSet = useMemo(() => new Set(hiddenBookingIds), [hiddenBookingIds]);\n\n  const restMethodFor = (e: CashBookEntry) => {',
  );
}
if (!text.includes('hiddenBookingSet.has(e.booking_id)')) {
  text = text.replace(
    '  const filtered = useMemo(() => data.filter((e) => {',
    '  const filtered = useMemo(() => data.filter((e) => {\n    if (e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) return false;',
  );
}
text = text.replace(
  '  }), [data, month, studioFilter, methodFilter, statusFilter, search, restPaymentMethods]);',
  '  }), [data, month, studioFilter, methodFilter, statusFilter, search, restPaymentMethods, hiddenBookingSet]);',
);
if (!text.includes('const hideBookingMut = useMutation')) {
  text = text.replace(
    '  const deleteMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cashbook"] }) });',
    '  const deleteMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cashbook"] }) });\n  const hideBookingMut = useMutation({ mutationFn: (booking_id: string) => hideBooking({ data: { booking_id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook-hidden-bookings"] }); qc.invalidateQueries({ queryKey: ["cashbook"] }); } });',
  );
}
text = text.replace(
  '  const incomeActions = (e: CashBookEntry) => e.source === "booking" ? (\n    <button onClick={() => setEditing(e)} className="text-champagne text-xs uppercase">Bearbeiten</button>\n  ) : (',
  '  const incomeActions = (e: CashBookEntry) => e.source === "booking" ? (\n    <div className="flex items-center gap-3">\n      <button onClick={() => setEditing(e)} className="text-champagne text-xs uppercase">Bearbeiten</button>\n      <button onClick={() => e.booking_id && confirm("Termin und Kassenbucheintrag endgültig löschen? Der Zeitraum wird wieder freigegeben.") && hideBookingMut.mutate(e.booking_id)} aria-label="Termin löschen" title="Termin löschen"><Trash2 size={15} /></button>\n    </div>\n  ) : (',
);

text = text.replaceAll(
  'Diesen Eintrag nur aus dem Kassenbuch entfernen? Termin und Kundendaten bleiben erhalten.',
  'Termin und Kassenbucheintrag endgültig löschen? Der Zeitraum wird wieder freigegeben.',
);
text = text.replaceAll('aria-label="Aus Kassenbuch entfernen" title="Aus Kassenbuch entfernen"', 'aria-label="Termin löschen" title="Termin löschen"');

for (const marker of ['hideBookingFromCashbook', 'cashbook-hidden-bookings', 'hiddenBookingSet.has(e.booking_id)', 'Termin löschen']) {
  if (!text.includes(marker)) throw new Error(`Kassenbuch-Löschen konnte nicht sicher eingebaut werden: ${marker}`);
}

if (text !== before) writeFileSync(path, text);
console.log("Cashbook delete option applied safely.");
