from pathlib import Path

path = Path('src/routes/_authenticated/admin.kassenbuch.tsx')
text = path.read_text()

old = '  const [travelLogPending, setTravelLogPending] = useState(false);\n  const hiddenBookingSet = useMemo(() => new Set(hiddenBookingIds), [hiddenBookingIds]);'
new = '  const [travelLogPending, setTravelLogPending] = useState(false);\n  const [cashDay, setCashDay] = useState(today());\n  const hiddenBookingSet = useMemo(() => new Set(hiddenBookingIds), [hiddenBookingIds]);'
if old not in text:
    raise SystemExit('cashDay state anchor not found')
text = text.replace(old, new, 1)

old = '  const totalNet = totals.gesamt / 1.19;\n  const totalVat = totals.gesamt - totalNet;'
new = '''  const totalNet = totals.gesamt / 1.19;
  const totalVat = totals.gesamt - totalNet;
  const dailyCash = data.filter(e => e.entry_type === "income")
    .filter(e => !(e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)))
    .reduce((sum, e) => {
      const depositCash = e.anzahlung_datum === cashDay && e.anzahlung > 0 && e.anzahlung_method?.trim().toLowerCase() === "bar" ? e.anzahlung : 0;
      const onsiteCash = e.bar_datum === cashDay && e.bar > 0 && restMethodFor(e)?.trim().toLowerCase() === "bar" ? e.bar : 0;
      return sum + depositCash + onsiteCash;
    }, 0);'''
if old not in text:
    raise SystemExit('daily cash calculation anchor not found')
text = text.replace(old, new, 1)

old = '      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Stat label="Anzahlungen" value={eur(totals.anzahlung)} /><Stat label="Vor Ort" value={eur(totals.bar)} /><Stat label="Ausgaben" value={eur(totalExpenses)} /><Stat label="Saldo" value={eur(balance)} gold /><Stat label="Erledigte Termine" value={String(completedAppointments)} /></div>\n      <div className="bg-card border border-champagne/20 p-4 grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">'
new = '''      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Stat label="Anzahlungen" value={eur(totals.anzahlung)} /><Stat label="Vor Ort" value={eur(totals.bar)} /><Stat label="Ausgaben" value={eur(totalExpenses)} /><Stat label="Saldo" value={eur(balance)} gold /><Stat label="Erledigte Termine" value={String(completedAppointments)} /></div>
      <div className="bg-card border border-champagne/30 p-4 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="sm:w-64"><Field label="Tag für Bareinzahlung"><input type="date" value={cashDay} onChange={e => setCashDay(e.target.value)} className="luxe-input" /></Field></div>
        <div className="flex-1 border border-champagne/20 px-4 py-3 min-h-[54px] flex items-center justify-between gap-4"><span className="eyebrow">Bar erhalten an diesem Tag</span><strong className="text-xl text-champagne whitespace-nowrap">{eur(dailyCash)}</strong></div>
      </div>
      <div className="bg-card border border-champagne/20 p-4 grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">'''
if old not in text:
    raise SystemExit('daily cash UI anchor not found')
text = text.replace(old, new, 1)

path.write_text(text)
