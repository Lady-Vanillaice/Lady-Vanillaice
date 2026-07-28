import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/site/PageHeader";
import { listCashBookEntries, createCashBookEntry, deleteCashBookEntry, type CashBookEntry } from "@/lib/cashbook.functions";
import { updateBookingAccounting } from "@/lib/accounting.functions";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Plus, Trash2, FileDown, FileSpreadsheet, Search, Save, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/admin/kassenbuch")({
  head: () => ({ meta: [{ title: "Kassenbuch — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: KassenbuchPage,
});

const eur = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (v: string | null) => v ? format(parseISO(v), "dd.MM.yyyy", { locale: de }) : "—";
const statusLabel: Record<CashBookEntry["status"], string> = {
  open: "Offen",
  completed: "Erledigt",
  cancelled: "Storniert",
  rescheduling: "Umplanen",
};

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function drawPdfBrand(doc: jsPDF, monthLabel: string) {
  const gold: [number, number, number] = [194, 153, 82];
  doc.setDrawColor(...gold);
  doc.setLineWidth(2);
  doc.line(48, 54, 58, 39);
  doc.line(58, 39, 69, 53);
  doc.line(69, 53, 80, 37);
  doc.line(80, 37, 91, 53);
  doc.line(91, 53, 101, 39);
  doc.line(101, 39, 98, 67);
  doc.line(52, 67, 98, 67);
  doc.line(57, 74, 94, 74);
  doc.setTextColor(...gold);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("LADY VANILLA ICE", 75, 91, { align: "center" });
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.7);
  doc.line(118, 36, 118, 96);
  doc.setTextColor(10, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("KASSENBUCH", 132, 58);
  doc.setFontSize(12);
  doc.text(monthLabel, 132, 80);
}

function KassenbuchPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCashBookEntries);
  const create = useServerFn(createCashBookEntry);
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

  const filtered = useMemo(() => data.filter((e) => {
    const monthDate = e.anzahlung_datum || e.bar_datum || e.termin_datum;
    return (!month || monthDate.startsWith(month))
      && (!studioFilter || e.studio === studioFilter)
      && (!methodFilter || e.anzahlung_method === methodFilter)
      && (!statusFilter || e.status === statusFilter)
      && (!search || `${e.kunde} ${e.studio} ${e.art} ${e.dauer ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  }).sort((a, b) => a.termin_datum.localeCompare(b.termin_datum)), [data, month, studioFilter, methodFilter, statusFilter, search]);

  const totals = filtered.reduce((a, e) => {
    a.anzahlung += e.anzahlung;
    a.bar += e.bar;
    a.gesamt += e.gesamt;
    if (e.status === "cancelled") a.storno += e.anzahlung;
    if (e.status === "completed") a.termine += 1;
    return a;
  }, { anzahlung: 0, bar: 0, gesamt: 0, storno: 0, termine: 0 });

  const studios = [...new Set(data.map((e) => e.studio))].sort();
  const methods = [...new Set(data.map((e) => e.anzahlung_method).filter(Boolean) as string[])].sort();

  const [studio, setStudio] = useState("");
  const [datum, setDatum] = useState(today());
  const [kunde, setKunde] = useState("");
  const [anzahlung, setAnzahlung] = useState("0");
  const [anzahlungMethod, setAnzahlungMethod] = useState("");
  const [bar, setBar] = useState("0");
  const [notiz, setNotiz] = useState("");

  const createMut = useMutation({
    mutationFn: () => create({ data: { studio, datum, kunde, anzahlung: Number(anzahlung.replace(",", ".")) || 0, anzahlung_method: anzahlungMethod || null, bar: Number(bar.replace(",", ".")) || 0, notiz: notiz || null } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook"] }); setKunde(""); setAnzahlung("0"); setBar("0"); setNotiz(""); },
  });
  const deleteMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cashbook"] }) });

  const rows = () => filtered.map((e) => [
    dateLabel(e.termin_datum), e.kunde, e.art, e.studio, e.dauer ?? "—", dateLabel(e.anzahlung_datum), eur(e.anzahlung), e.anzahlung_method ?? "—", dateLabel(e.bar_datum), eur(e.bar), eur(e.gesamt), statusLabel[e.status],
  ]);

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const monthLabel = format(parseISO(`${month}-01`), "LLLL yyyy", { locale: de });
    drawPdfBrand(doc, monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text(`Erstellt: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`, 806, 49, { align: "right" });

    autoTable(doc, {
      startY: 116,
      margin: { left: 18, right: 18, top: 116, bottom: 48 },
      head: [["Termin", "Kunde", "Art", "Studio", "Dauer", "Anzahlung am", "Anzahlung", "Zahlungsart", "Bar am", "Bar", "Gesamt", "Status"]],
      body: rows(),
      foot: [[`SUMME ${monthLabel.toUpperCase()}`, "", "", "", "", "", eur(totals.anzahlung), "", "", eur(totals.bar), eur(totals.gesamt), ""]],
      styles: { fontSize: 6.2, cellPadding: 3.2, overflow: "linebreak", valign: "middle", lineColor: [225, 225, 225], lineWidth: 0.25 },
      headStyles: { fillColor: [15, 15, 15], textColor: 255, fontStyle: "bold", fontSize: 5.8, minCellHeight: 25, overflow: "hidden" },
      footStyles: { fillColor: [239, 229, 207], textColor: 15, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 48 }, 1: { cellWidth: 65 }, 2: { cellWidth: 60 }, 3: { cellWidth: 142 }, 4: { cellWidth: 58 }, 5: { cellWidth: 63 }, 6: { cellWidth: 56, halign: "right" }, 7: { cellWidth: 62 }, 8: { cellWidth: 53 }, 9: { cellWidth: 50, halign: "right" }, 10: { cellWidth: 53, halign: "right" }, 11: { cellWidth: 47 },
      },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setDrawColor(194, 153, 82);
        doc.line(20, pageHeight - 35, pageWidth - 20, pageHeight - 35);
        doc.setFontSize(7);
        doc.setTextColor(20, 20, 20);
        doc.text("LADY VANILLA ICE", 22, pageHeight - 18);
        doc.text(`Seite ${doc.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 18, { align: "center" });
        doc.text(`KASSENBUCH – ${monthLabel.toUpperCase()}`, pageWidth - 22, pageHeight - 18, { align: "right" });
      },
    });
    doc.save(`kassenbuch-${month}.pdf`);
  }

  function exportCsv() {
    const head = ["Termin", "Kunde", "Art", "Studio", "Dauer", "Anzahlung erhalten am", "Anzahlung EUR", "Zahlungsart", "Bar erhalten am", "Bar EUR", "Gesamt EUR", "Status"];
    const raw = filtered.map((e) => [e.termin_datum, e.kunde, e.art, e.studio, e.dauer ?? "", e.anzahlung_datum ?? "", e.anzahlung.toFixed(2).replace(".", ","), e.anzahlung_method ?? "", e.bar_datum ?? "", e.bar.toFixed(2).replace(".", ","), e.gesamt.toFixed(2).replace(".", ","), statusLabel[e.status]]);
    const csv = [head, ...raw].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
    download(`kassenbuch-${month}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  }

  function exportExcel() {
    const table = [["Termin", "Kunde", "Art", "Studio", "Dauer", "Anzahlung erhalten am", "Anzahlung", "Zahlungsart", "Bar erhalten am", "Bar", "Gesamt", "Status"], ...rows()]
      .map((r) => `<tr>${r.map((v) => `<td>${String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</td>`).join("")}</tr>`).join("");
    download(`kassenbuch-${month}.xls`, `\uFEFF<html><head><meta charset="utf-8"></head><body><table>${table}</table></body></html>`, "application/vnd.ms-excel");
  }

  return <>
    <PageHeader eyebrow="Admin" title={<em className="font-script gold-text not-italic">Kassenbuch</em>} />
    <section className="py-12"><div className="container-luxe max-w-[1500px] space-y-8">
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-vanilla/60 hover:text-champagne"><ArrowLeft size={14} /> Zurück zum Admin</Link>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Stat label="Anzahlungen" value={eur(totals.anzahlung)} /><Stat label="Bar erhalten" value={eur(totals.bar)} /><Stat label="Gesamtumsatz" value={eur(totals.gesamt)} gold /><Stat label="Storno-Anzahlungen" value={eur(totals.storno)} /><Stat label="Erledigte Termine" value={String(totals.termine)} /></div>
      <div className="bg-card border border-champagne/20 p-5 grid md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        <Field label="Monat"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="luxe-input" /></Field>
        <Field label="Studio"><select value={studioFilter} onChange={(e) => setStudioFilter(e.target.value)} className="luxe-input"><option value="">Alle</option>{studios.map(v => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Zahlungsart"><select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="luxe-input"><option value="">Alle</option>{methods.map(v => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Status"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="luxe-input"><option value="">Alle</option><option value="open">Offen</option><option value="completed">Erledigt</option><option value="cancelled">Storniert</option><option value="rescheduling">Umplanen</option></select></Field>
        <Field label="Kunde suchen"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-vanilla/40" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="luxe-input pl-9" /></div></Field>
        <div className="flex gap-2 flex-wrap"><button onClick={exportPdf} className="export-btn"><FileDown size={14} /> PDF</button><button onClick={exportCsv} className="export-btn"><FileSpreadsheet size={14} /> CSV</button><button onClick={exportExcel} className="export-btn"><FileSpreadsheet size={14} /> Excel</button></div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="bg-card border border-champagne/20 p-5 space-y-4">
        <h2 className="eyebrow">Manueller Eintrag</h2><div className="grid md:grid-cols-4 gap-3">
          <Field label="Datum"><input required type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className="luxe-input" /></Field><Field label="Kunde"><input required value={kunde} onChange={(e) => setKunde(e.target.value)} className="luxe-input" /></Field><Field label="Studio"><input required value={studio} onChange={(e) => setStudio(e.target.value)} className="luxe-input" /></Field><Field label="Zahlungsart"><input value={anzahlungMethod} onChange={(e) => setAnzahlungMethod(e.target.value)} className="luxe-input" /></Field><Field label="Anzahlung (€)"><input value={anzahlung} onChange={(e) => setAnzahlung(e.target.value)} className="luxe-input" /></Field><Field label="Bar (€)"><input value={bar} onChange={(e) => setBar(e.target.value)} className="luxe-input" /></Field><div className="md:col-span-2"><Field label="Notiz"><input value={notiz} onChange={(e) => setNotiz(e.target.value)} className="luxe-input" /></Field></div>
        </div><button className="btn-gold inline-flex gap-2"><Plus size={15} /> Eintrag speichern</button>
      </form>
      <div className="bg-card border border-champagne/20 overflow-hidden">{isLoading ? <div className="p-8">Lade…</div> : error ? <div className="p-8 text-bordeaux">Fehler beim Laden</div> : <div className="overflow-x-auto"><table className="w-full text-sm min-w-[1450px]"><thead><tr className="border-b border-champagne/20 text-[10px] uppercase tracking-widest text-vanilla/50">{["Termin", "Kunde", "Art", "Studio", "Dauer", "Anzahlung am", "Anzahlung", "Zahlungsart", "Bar am", "Bar", "Gesamt", "Status", ""].map(h => <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{filtered.map(e => <tr key={e.id} className="border-b border-champagne/10 align-top"><td className="p-3 whitespace-nowrap">{dateLabel(e.termin_datum)}</td><td className="p-3 font-medium">{e.kunde}</td><td className="p-3">{e.art}</td><td className="p-3 max-w-[230px]">{e.studio}</td><td className="p-3 whitespace-nowrap">{e.dauer ?? "—"}</td><td className="p-3 whitespace-nowrap">{dateLabel(e.anzahlung_datum)}</td><td className="p-3">{eur(e.anzahlung)}</td><td className="p-3">{e.anzahlung_method ?? "—"}</td><td className="p-3 whitespace-nowrap">{dateLabel(e.bar_datum)}</td><td className="p-3">{eur(e.bar)}</td><td className="p-3 text-champagne">{eur(e.gesamt)}</td><td className="p-3"><span className={`status-${e.status}`}>{statusLabel[e.status]}</span></td><td className="p-3">{e.source === "booking" ? <button onClick={() => setEditing(e)} className="text-champagne text-xs uppercase tracking-widest">Bearbeiten</button> : <button onClick={() => confirm("Löschen?") && deleteMut.mutate(e.id)}><Trash2 size={15} /></button>}</td></tr>)}</tbody></table></div>}</div>
    </div></section>
    {editing && <AccountingDialog entry={editing} onClose={() => setEditing(null)} onSave={async (payload) => { await saveAccounting({ data: payload }); await qc.invalidateQueries({ queryKey: ["cashbook"] }); setEditing(null); }} />}
    <style>{`.luxe-input{width:100%;background:color-mix(in oklab,var(--color-anthracite) 60%,transparent);border:1px solid color-mix(in oklab,var(--color-champagne) 25%,transparent);color:var(--color-vanilla);padding:.65rem .75rem;outline:none}.export-btn{display:inline-flex;gap:.35rem;align-items:center;border:1px solid color-mix(in oklab,var(--color-champagne) 45%,transparent);padding:.65rem .75rem;color:var(--color-champagne);font-size:.65rem;text-transform:uppercase;letter-spacing:.12em}.status-open,.status-completed,.status-cancelled,.status-rescheduling{padding:.25rem .45rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.12em}.status-open{background:#7c5a102d;color:#e8c98e}.status-completed{background:#16653455;color:#bbf7d0}.status-cancelled{background:#7f1d1d55;color:#fecaca}.status-rescheduling{background:#1d4ed855;color:#bfdbfe}`}</style>
  </>;
}

function AccountingDialog({ entry, onClose, onSave }: { entry: CashBookEntry; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [a, setA] = useState(String(entry.anzahlung));
  const [method, setMethod] = useState(entry.anzahlung_method ?? "");
  const [aDate, setADate] = useState(entry.anzahlung_datum ?? "");
  const [bar, setBar] = useState(String(entry.bar));
  const [barDate, setBarDate] = useState(entry.bar_datum ?? "");
  const [status, setStatus] = useState<CashBookEntry["status"]>(entry.status);
  const [full, setFull] = useState(entry.status === "completed");
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); try { await onSave({ id: entry.booking_id, anzahlung: Number(a.replace(",", ".")) || 0, anzahlung_method: method || null, anzahlung_paid_at: aDate || null, bar: Number(bar.replace(",", ".")) || 0, completed_at: full ? (entry.durchgefuehrt_datum || today()) : null, cash_received_at: barDate || null, fully_paid: full, status, note: entry.notiz }); } finally { setSaving(false); } }
  return <div className="fixed inset-0 z-[100] bg-black/80 grid place-items-center p-4"><div className="bg-card border border-champagne/40 max-w-2xl w-full p-6"><div className="flex justify-between mb-5"><div><div className="eyebrow">Termin & Zahlung</div><h3 className="font-display text-2xl">{entry.kunde}</h3></div><button onClick={onClose}><X /></button></div><div className="grid md:grid-cols-2 gap-4"><Field label="Anzahlung (€)"><input value={a} onChange={e => setA(e.target.value)} className="luxe-input" /></Field><Field label="Zahlungsart"><input value={method} onChange={e => setMethod(e.target.value)} className="luxe-input" /></Field><Field label="Anzahlung erhalten am"><input type="date" value={aDate} onChange={e => setADate(e.target.value)} className="luxe-input" /></Field><Field label="Bar erhalten (€)"><input value={bar} onChange={e => setBar(e.target.value)} className="luxe-input" /></Field><Field label="Bar erhalten am"><input type="date" value={barDate} onChange={e => setBarDate(e.target.value)} className="luxe-input" /></Field><Field label="Status"><select value={status} onChange={e => setStatus(e.target.value as CashBookEntry["status"])} className="luxe-input"><option value="open">Offen</option><option value="completed">Erledigt</option><option value="cancelled">Storniert</option><option value="rescheduling">Umplanen</option></select></Field><label className="md:col-span-2 flex gap-3 items-center border border-champagne/20 p-3"><input type="checkbox" checked={full} onChange={e => { setFull(e.target.checked); if (e.target.checked) { setStatus("completed"); setBarDate(v => v || (Number(bar) > 0 ? today() : "")); } }} /><span>Vollständig bezahlt</span></label></div><div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="export-btn">Abbrechen</button><button onClick={save} disabled={saving} className="btn-gold inline-flex gap-2"><Save size={15} />{saving ? "Speichere…" : "Speichern"}</button></div></div></div>;
}

function Stat({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) { return <div className="bg-card border border-champagne/20 p-4"><div className="text-[10px] uppercase tracking-widest text-vanilla/45">{label}</div><div className={`text-xl mt-1 ${gold ? "text-champagne" : "text-vanilla"}`}>{value}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">{label}</span>{children}</label>; }
