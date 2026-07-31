import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, FileDown, FileSpreadsheet, Plus, Save, Search, Smartphone, Trash2, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader } from "@/components/site/PageHeader";
import { updateBookingAccounting } from "@/lib/accounting.functions";
import { createCashBookEntry, createStudioRentExpense, deleteCashBookEntry, listCashBookEntries, type CashBookEntry, type DepositExemptionReason } from "@/lib/cashbook.functions";

export const Route = createFileRoute("/_authenticated/admin/kassenbuch")({ component: KassenbuchPage });

const eur = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (v: string | null) => v ? format(parseISO(v), "dd.MM.yyyy", { locale: de }) : "—";
const statusLabel: Record<CashBookEntry["status"], string> = { open: "Offen", completed: "Erledigt", cancelled: "Storniert", rescheduling: "Umplanen" };
const exemptionLabel: Record<DepositExemptionReason, string> = {
  regular_customer: "Keine Anzahlung – Stammkunde",
  trust: "Keine Anzahlung – Vertrauensbasis",
  exception: "Keine Anzahlung – Ausnahme",
  colleague_guarantees: "Keine Anzahlung – Kollegin bürgt",
};

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function KassenbuchPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCashBookEntries);
  const create = useServerFn(createCashBookEntry);
  const createExpense = useServerFn(createStudioRentExpense);
  const del = useServerFn(deleteCashBookEntry);
  const saveAccounting = useServerFn(updateBookingAccounting);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["cashbook"], queryFn: () => list() });
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [studioFilter, setStudioFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CashBookEntry | null>(null);
  const [studio, setStudio] = useState(""); const [datum, setDatum] = useState(today()); const [kunde, setKunde] = useState("");
  const [anzahlung, setAnzahlung] = useState("0"); const [anzahlungMethod, setAnzahlungMethod] = useState(""); const [bar, setBar] = useState("0"); const [notiz, setNotiz] = useState("");
  const [expenseStudio, setExpenseStudio] = useState(""); const [expenseDate, setExpenseDate] = useState(today());
  const [expenseAmount, setExpenseAmount] = useState(""); const [expenseMethod, setExpenseMethod] = useState(""); const [expenseNote, setExpenseNote] = useState("");

  const filtered = useMemo(() => data.filter((e) => {
    const monthDate = e.anzahlung_datum || e.bar_datum || e.termin_datum;
    const haystack = `${e.kunde} ${e.studio} ${e.studio_address ?? ""} ${e.art} ${e.dauer ?? ""} ${e.expense_category ?? ""} ${e.payment_method ?? ""}`.toLowerCase();
    const paymentMethod = e.entry_type === "expense" ? e.payment_method : e.anzahlung_method;
    return (!month || monthDate.startsWith(month)) && (!studioFilter || e.studio === studioFilter) && (!methodFilter || paymentMethod === methodFilter) && (!statusFilter || e.status === statusFilter) && (!search || haystack.includes(search.toLowerCase()));
  }).sort((a, b) => a.termin_datum.localeCompare(b.termin_datum)), [data, month, studioFilter, methodFilter, statusFilter, search]);

  const incomeEntries = filtered.filter(e => e.entry_type === "income");
  const expenseEntries = filtered.filter(e => e.entry_type === "expense");
  const totals = incomeEntries.reduce((a, e) => { a.anzahlung += e.anzahlung; a.bar += e.bar; a.gesamt += e.gesamt; if (e.status === "cancelled") a.storno += e.anzahlung; if (e.status === "completed") a.termine += 1; return a; }, { anzahlung: 0, bar: 0, gesamt: 0, storno: 0, termine: 0 });
  const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.expense_amount, 0);
  const balance = totals.gesamt - totalExpenses;
  const totalNet = totals.gesamt / 1.19;
  const totalVat = totals.gesamt - totalNet;
  const studios = [...new Set(data.map(e => e.studio))].sort();
  const methods = [...new Set(data.flatMap(e => [e.anzahlung_method, e.payment_method]).filter(Boolean) as string[])].sort();
  const depositText = (e: CashBookEntry) => e.deposit_exemption_reason ? exemptionLabel[e.deposit_exemption_reason] : e.anzahlung_method ?? "—";
  const studioParts = (e: CashBookEntry) => {
    const rawStudio = e.studio.trim();
    const storedAddress = e.studio_address?.trim() ?? "";
    const commaIndex = rawStudio.indexOf(",");
    const studioName = commaIndex >= 0
      ? rawStudio.slice(0, commaIndex).trim()
      : rawStudio;
    const addressFromStudio = commaIndex >= 0
      ? rawStudio.slice(commaIndex + 1).trim()
      : "";
    return {
      studio: studioName,
      address: storedAddress || addressFromStudio,
    };
  };
  const studioText = (e: CashBookEntry) => {
    const parts = studioParts(e);
    return parts.address ? `${parts.studio}\n${parts.address}` : parts.studio;
  };
  const rows = () => incomeEntries.map(e => [dateLabel(e.termin_datum), e.kunde, e.art, studioText(e), e.dauer ?? "—", dateLabel(e.anzahlung_datum), eur(e.anzahlung), depositText(e), dateLabel(e.bar_datum), eur(e.bar), eur(e.gesamt), statusLabel[e.status]]);

  const createMut = useMutation({ mutationFn: () => create({ data: { studio, datum, kunde, anzahlung: Number(anzahlung.replace(",", ".")) || 0, anzahlung_method: anzahlungMethod || null, bar: Number(bar.replace(",", ".")) || 0, notiz: notiz || null } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook"] }); setKunde(""); setAnzahlung("0"); setBar("0"); setNotiz(""); } });
  const expenseMut = useMutation({ mutationFn: () => createExpense({ data: { studio: expenseStudio, datum: expenseDate, betrag: Number(expenseAmount.replace(",", ".")), zahlungsart: expenseMethod, notiz: expenseNote || null } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook"] }); setExpenseAmount(""); setExpenseMethod(""); setExpenseNote(""); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cashbook"] }) });

  function exportPdf(mobile = false) {
    const doc = new jsPDF({ orientation: mobile ? "portrait" : "landscape", unit: "pt", format: "a4" });
    const monthLabel = format(parseISO(`${month}-01`), "LLLL yyyy", { locale: de });
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("KASSENBUCH", 28, 40); doc.setFontSize(11); doc.text(monthLabel, 28, 58);
    autoTable(doc, mobile ? {
      startY: 92, head: [["Termin / Kunde", "Studio / Adresse", "Zahlung", "Gesamt"]],
      body: incomeEntries.map(e => [`${dateLabel(e.termin_datum)}\n${e.kunde}\n${statusLabel[e.status]}`, `${studioText(e)}\n${e.art}\n${e.dauer ?? ""}`, e.deposit_exemption_reason ? depositText(e) : `Anz.: ${eur(e.anzahlung)} ${e.anzahlung_method ?? ""}\nBar: ${eur(e.bar)}`, eur(e.gesamt)]),
      foot: [["SUMME", "", "", eur(totals.gesamt)]], styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak" }, headStyles: { fillColor: [15, 15, 15] }, footStyles: { fillColor: [239, 229, 207], textColor: 15 },
    } : {
      startY: 92, head: [["Termin", "Kunde", "Art", "Studio / Adresse", "Dauer", "Anzahlung am", "Anzahlung", "Zahlungsart / Ausnahme", "Bar am", "Bar", "Gesamt", "Status"]], body: rows(),
      foot: [["SUMME", "", "", "", "", "", eur(totals.anzahlung), "", "", eur(totals.bar), eur(totals.gesamt), ""]], styles: { fontSize: 5.8, cellPadding: 3, overflow: "linebreak" }, headStyles: { fillColor: [15, 15, 15] }, footStyles: { fillColor: [239, 229, 207], textColor: 15 },
    });
    const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 92;
    let summaryY = tableEndY + 18;
    if (summaryY > doc.internal.pageSize.getHeight() - 24) {
      doc.addPage();
      summaryY = 28;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(
      `Gesamt brutto: ${eur(totals.gesamt)} · enthaltene MwSt. 19 %: ${eur(totalVat)} · Gesamt netto: ${eur(totalNet)}`,
      28,
      summaryY,
    );
    doc.save(`kassenbuch-${month}${mobile ? "-mobil" : ""}.pdf`);
  }

  function exportCsv() {
    const head = ["Termin", "Kunde", "Art", "Studio", "Adresse", "Dauer", "Anzahlung erhalten am", "Anzahlung EUR", "Zahlungsart / Ausnahme", "Bar erhalten am", "Bar EUR", "Gesamt EUR", "Status"];
    const raw = incomeEntries.map(e => [e.termin_datum, e.kunde, e.art, e.studio, e.studio_address ?? "", e.dauer ?? "", e.anzahlung_datum ?? "", e.anzahlung.toFixed(2).replace(".", ","), depositText(e), e.bar_datum ?? "", e.bar.toFixed(2).replace(".", ","), e.gesamt.toFixed(2).replace(".", ","), statusLabel[e.status]]);
    const csv = [head, ...raw].map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
    download(`kassenbuch-${month}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  }

  function exportMonthPackage() {
    exportPdf(false);
    window.setTimeout(() => exportCsv(), 250);
  }

  function exportExcel() {
    const table = [["Termin", "Kunde", "Art", "Studio / Adresse", "Dauer", "Anzahlung erhalten am", "Anzahlung", "Zahlungsart / Ausnahme", "Bar erhalten am", "Bar", "Gesamt", "Status"], ...rows()].map(r => `<tr>${r.map(v => `<td>${String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("\n", "<br>")}</td>`).join("")}</tr>`).join("");
    download(`kassenbuch-${month}.xls`, `\uFEFF<html><head><meta charset="utf-8"></head><body><table>${table}</table></body></html>`, "application/vnd.ms-excel");
  }

  return <>
    <PageHeader eyebrow="Admin" title={<em className="font-script gold-text not-italic">Kassenbuch</em>} />
    <section className="py-8 md:py-12"><div className="container-luxe max-w-[1500px] space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-vanilla/60 hover:text-champagne"><ArrowLeft size={14} /> Zurück zum Admin</Link>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Stat label="Anzahlungen" value={eur(totals.anzahlung)} /><Stat label="Bar erhalten" value={eur(totals.bar)} /><Stat label="Ausgaben" value={eur(totalExpenses)} /><Stat label="Saldo" value={eur(balance)} gold /><Stat label="Erledigte Termine" value={String(totals.termine)} /></div>
      <div className="bg-card border border-champagne/20 p-4 grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        <Field label="Monat"><input type="month" value={month} onChange={e => setMonth(e.target.value)} className="luxe-input" /></Field>
        <Field label="Studio"><select value={studioFilter} onChange={e => setStudioFilter(e.target.value)} className="luxe-input"><option value="">Alle</option>{studios.map(v => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Zahlungsart"><select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="luxe-input"><option value="">Alle</option>{methods.map(v => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Status"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="luxe-input"><option value="">Alle</option><option value="open">Offen</option><option value="completed">Erledigt</option><option value="cancelled">Storniert</option><option value="rescheduling">Umplanen</option></select></Field>
        <Field label="Suchen"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-vanilla/40" /><input value={search} onChange={e => setSearch(e.target.value)} className="luxe-input pl-9" /></div></Field>
        <div className="flex gap-2 flex-wrap"><button onClick={exportMonthPackage} className="export-btn !border-champagne !bg-champagne/10"><FileDown size={14} /> Monatsabschluss</button><button onClick={() => exportPdf(false)} className="export-btn"><FileDown size={14} /> PDF</button><button onClick={() => exportPdf(true)} className="export-btn"><Smartphone size={14} /> PDF Handy</button><button onClick={exportCsv} className="export-btn"><FileSpreadsheet size={14} /> CSV</button><button onClick={exportExcel} className="export-btn"><FileSpreadsheet size={14} /> Excel</button></div>
      </div>
      <form onSubmit={e => { e.preventDefault(); createMut.mutate(); }} className="bg-card border border-champagne/20 p-4 space-y-4"><h2 className="eyebrow">Manueller Eintrag</h2><div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3"><Field label="Datum"><input required type="date" value={datum} onChange={e => setDatum(e.target.value)} className="luxe-input" /></Field><Field label="Kunde"><input required value={kunde} onChange={e => setKunde(e.target.value)} className="luxe-input" /></Field><Field label="Studio"><input required value={studio} onChange={e => setStudio(e.target.value)} className="luxe-input" /></Field><Field label="Zahlungsart"><input value={anzahlungMethod} onChange={e => setAnzahlungMethod(e.target.value)} className="luxe-input" /></Field><Field label="Anzahlung (€)"><input value={anzahlung} onChange={e => setAnzahlung(e.target.value)} className="luxe-input" /></Field><Field label="Bar (€)"><input value={bar} onChange={e => setBar(e.target.value)} className="luxe-input" /></Field><div className="md:col-span-2"><Field label="Notiz"><input value={notiz} onChange={e => setNotiz(e.target.value)} className="luxe-input" /></Field></div></div><button className="btn-gold inline-flex gap-2"><Plus size={15} /> Eintrag speichern</button></form>
      <form onSubmit={e => { e.preventDefault(); expenseMut.mutate(); }} className="bg-card border border-bordeaux/50 p-4 space-y-4"><h2 className="eyebrow text-champagne">Ausgabe – Studiomiete</h2><div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3"><Field label="Datum"><input required type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="luxe-input" /></Field><Field label="Studio"><input required value={expenseStudio} onChange={e => setExpenseStudio(e.target.value)} placeholder="z. B. Studio60" className="luxe-input" /></Field><Field label="Betrag (€)"><input required inputMode="decimal" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="luxe-input" /></Field><Field label="Bezahlt mit"><input required value={expenseMethod} onChange={e => setExpenseMethod(e.target.value)} placeholder="Bar, Karte, Überweisung …" className="luxe-input" /></Field><div className="md:col-span-4"><Field label="Notiz (optional)"><input value={expenseNote} onChange={e => setExpenseNote(e.target.value)} className="luxe-input" /></Field></div></div><button disabled={expenseMut.isPending} className="btn-gold inline-flex gap-2"><Plus size={15} />{expenseMut.isPending ? "Speichere…" : "Studiomiete speichern"}</button>{expenseMut.error && <p className="text-sm text-bordeaux">{(expenseMut.error as Error).message}</p>}</form>
      {expenseEntries.length > 0 && <div className="bg-card border border-bordeaux/40 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase text-vanilla/50">{["Datum", "Ausgabe", "Studio", "Zahlungsart", "Betrag", ""].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{expenseEntries.map(e => <tr key={e.id} className="border-t border-champagne/10"><td className="p-3">{dateLabel(e.termin_datum)}</td><td className="p-3">Studiomiete</td><td className="p-3">{e.studio}</td><td className="p-3">{e.payment_method}</td><td className="p-3 text-bordeaux">− {eur(e.expense_amount)}</td><td className="p-3"><button onClick={() => confirm("Ausgabe löschen?") && deleteMut.mutate(e.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}
      <div className="md:hidden space-y-3">{isLoading ? <div>Lade…</div> : error ? <div className="text-bordeaux">Fehler beim Laden</div> : incomeEntries.map(e => <article key={e.id} className="bg-card border border-champagne/20 p-4 space-y-2"><div className="flex justify-between"><div><strong>{e.kunde}</strong><div className="text-xs text-vanilla/55">{dateLabel(e.termin_datum)} · {e.art}</div></div><span className="text-champagne">{eur(e.gesamt)}</span></div><div className="text-sm">{e.studio}</div>{e.studio_address && <div className="text-xs text-vanilla/55">{e.studio_address}</div>}<div className="text-xs">Anzahlung: {eur(e.anzahlung)} · {depositText(e)}<br />Bar: {eur(e.bar)}</div><div className="flex justify-between"><span className={`status-${e.status}`}>{statusLabel[e.status]}</span>{e.source === "booking" ? <button onClick={() => setEditing(e)} className="text-champagne text-xs uppercase">Bearbeiten</button> : <button onClick={() => confirm("Löschen?") && deleteMut.mutate(e.id)}><Trash2 size={15} /></button>}</div></article>)}</div>
      <div className="hidden md:block bg-card border border-champagne/20 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[1550px]"><thead><tr className="text-[10px] uppercase text-vanilla/50">{["Termin", "Kunde", "Art", "Studio / Adresse", "Dauer", "Anzahlung am", "Anzahlung", "Zahlungsart / Ausnahme", "Bar am", "Bar", "Gesamt", "Status", ""].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{incomeEntries.map(e => <tr key={e.id} className="border-t border-champagne/10"><td className="p-3">{dateLabel(e.termin_datum)}</td><td className="p-3 font-medium">{e.kunde}</td><td className="p-3">{e.art}</td><td className="p-3"><div>{e.studio}</div>{e.studio_address && <div className="text-xs text-vanilla/50 mt-1">{e.studio_address}</div>}</td><td className="p-3">{e.dauer ?? "—"}</td><td className="p-3">{dateLabel(e.anzahlung_datum)}</td><td className="p-3">{eur(e.anzahlung)}</td><td className="p-3">{depositText(e)}</td><td className="p-3">{dateLabel(e.bar_datum)}</td><td className="p-3">{eur(e.bar)}</td><td className="p-3 text-champagne">{eur(e.gesamt)}</td><td className="p-3"><span className={`status-${e.status}`}>{statusLabel[e.status]}</span></td><td className="p-3">{e.source === "booking" ? <button onClick={() => setEditing(e)} className="text-champagne text-xs uppercase">Bearbeiten</button> : <button onClick={() => confirm("Löschen?") && deleteMut.mutate(e.id)}><Trash2 size={15} /></button>}</td></tr>)}</tbody></table></div></div>
      <div className="border border-champagne/30 bg-card p-4">
        <div className="eyebrow text-champagne mb-3">Gesamtsumme</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Stat label="Gesamt brutto" value={eur(totals.gesamt)} gold />
          <Stat label="Ausgaben Studiomiete" value={eur(totalExpenses)} />
          <Stat label="Saldo" value={eur(balance)} gold />
        </div>
      </div>
    </div></section>
    {editing && <AccountingDialog entry={editing} onClose={() => setEditing(null)} onSave={async payload => { await saveAccounting({ data: payload }); await qc.invalidateQueries({ queryKey: ["cashbook"] }); setEditing(null); }} />}
    <style>{`.luxe-input{width:100%;background:color-mix(in oklab,var(--color-anthracite) 60%,transparent);border:1px solid color-mix(in oklab,var(--color-champagne) 25%,transparent);color:var(--color-vanilla);padding:.65rem .75rem;outline:none}.export-btn{display:inline-flex;gap:.35rem;align-items:center;border:1px solid color-mix(in oklab,var(--color-champagne) 45%,transparent);padding:.65rem .75rem;color:var(--color-champagne);font-size:.65rem;text-transform:uppercase}.status-open,.status-completed,.status-cancelled,.status-rescheduling{padding:.25rem .45rem;font-size:.62rem;text-transform:uppercase}.status-open{background:#7c5a102d}.status-completed{background:#16653455}.status-cancelled{background:#7f1d1d55}.status-rescheduling{background:#1d4ed855}`}</style>
  </>;
}

function AccountingDialog({ entry, onClose, onSave }: { entry: CashBookEntry; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [studio, setStudio] = useState(entry.studio === "—" ? "" : entry.studio);
  const [address, setAddress] = useState(entry.studio_address ?? "");
  const [a, setA] = useState(String(entry.anzahlung)); const [method, setMethod] = useState(entry.anzahlung_method ?? ""); const [aDate, setADate] = useState(entry.anzahlung_datum ?? "");
  const [bar, setBar] = useState(String(entry.bar)); const [barDate, setBarDate] = useState(entry.bar_datum ?? ""); const [status, setStatus] = useState<CashBookEntry["status"]>(entry.status); const [full, setFull] = useState(entry.status === "completed");
  const [reason, setReason] = useState<DepositExemptionReason | "">(entry.deposit_exemption_reason ?? ""); const [saving, setSaving] = useState(false);
  const hasExemption = Boolean(reason);
  async function save() {
    setSaving(true);
    try { await onSave({ id: entry.booking_id, studio, studio_address: address || null, anzahlung: hasExemption ? 0 : Number(a.replace(",", ".")) || 0, anzahlung_method: hasExemption ? null : method || null, anzahlung_paid_at: hasExemption ? null : aDate || null, deposit_exemption_reason: reason || null, deposit_guarantor: null, bar: Number(bar.replace(",", ".")) || 0, completed_at: full ? (entry.durchgefuehrt_datum || today()) : null, cash_received_at: barDate || null, fully_paid: full, status, note: entry.notiz }); } finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[100] bg-black/80 grid place-items-center p-3"><div className="bg-card border border-champagne/40 max-w-2xl w-full p-4 md:p-6 max-h-[92vh] overflow-y-auto"><div className="flex justify-between mb-5"><div><div className="eyebrow">Termin, Studio & Zahlung</div><h3 className="font-display text-2xl">{entry.kunde}</h3></div><button onClick={onClose}><X /></button></div><div className="grid md:grid-cols-2 gap-4"><Field label="Studio"><input value={studio} onChange={e => setStudio(e.target.value)} placeholder="z. B. Studio60" className="luxe-input" /></Field><Field label="Studio-Adresse"><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Straße, Hausnummer, PLZ, Ort" className="luxe-input" /></Field><div className="md:col-span-2"><Field label="Anzahlungsregel"><select value={reason} onChange={e => { const value = e.target.value as DepositExemptionReason | ""; setReason(value); if (value) { setA("0"); setADate(""); setMethod(""); } }} className="luxe-input"><option value="">Normale Anzahlung</option><option value="regular_customer">Keine Anzahlung – Stammkunde</option><option value="trust">Keine Anzahlung – Vertrauensbasis</option><option value="exception">Keine Anzahlung – Ausnahme</option><option value="colleague_guarantees">Keine Anzahlung – Kollegin bürgt</option></select></Field></div><Field label="Anzahlung (€)"><input disabled={hasExemption} value={a} onChange={e => setA(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Zahlungsart"><input disabled={hasExemption} value={method} onChange={e => setMethod(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Anzahlung erhalten am"><input disabled={hasExemption} type="date" value={aDate} onChange={e => setADate(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Bar erhalten (€)"><input value={bar} onChange={e => setBar(e.target.value)} className="luxe-input" /></Field><Field label="Bar erhalten am"><input type="date" value={barDate} onChange={e => setBarDate(e.target.value)} className="luxe-input" /></Field><Field label="Status"><select value={status} onChange={e => setStatus(e.target.value as CashBookEntry["status"])} className="luxe-input"><option value="open">Offen</option><option value="completed">Erledigt</option><option value="cancelled">Storniert</option><option value="rescheduling">Umplanen</option></select></Field><label className="md:col-span-2 flex gap-3 items-center border border-champagne/20 p-3"><input type="checkbox" checked={full} onChange={e => { setFull(e.target.checked); if (e.target.checked) { setStatus("completed"); setBarDate(v => v || (Number(bar) > 0 ? today() : "")); } }} /><span>Vollständig bezahlt</span></label></div><div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="export-btn">Abbrechen</button><button onClick={save} disabled={saving || !studio.trim()} className="btn-gold inline-flex gap-2"><Save size={15} />{saving ? "Speichere…" : "Speichern"}</button></div></div></div>;
}

function Stat({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) { return <div className="bg-card border border-champagne/20 p-3 md:p-4"><div className="text-[10px] uppercase tracking-widest text-vanilla/45">{label}</div><div className={`text-lg md:text-xl mt-1 ${gold ? "text-champagne" : "text-vanilla"}`}>{value}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">{label}</span>{children}</label>; }
