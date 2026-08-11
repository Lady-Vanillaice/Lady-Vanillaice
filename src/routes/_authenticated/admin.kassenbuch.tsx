import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Car, FileDown, FileSpreadsheet, Plus, Save, Search, Smartphone, Trash2, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader } from "@/components/site/PageHeader";
import { FinancialSlaveEntryForm } from "@/components/admin/financial-slave-entry-form";
import { updateBookingAccounting } from "@/lib/accounting.functions";
import { createCashBookEntry, createStudioRentExpense, deleteCashBookEntry, listCashBookEntries, updateCashBookEntry, type CashBookEntry, type DepositExemptionReason } from "@/lib/cashbook.functions";
import { hideBookingFromCashbook, listHiddenCashbookBookings } from "@/lib/cashbook-visibility.functions";
import { listBookingRestPaymentMethods } from "@/lib/rest-payment.functions";
import { calculateStudioDistances } from "@/lib/travel-log.functions";

export const Route = createFileRoute("/_authenticated/admin/kassenbuch")({ component: KassenbuchPage });

const eur = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (v: string | null) => v ? format(parseISO(v), "dd.MM.yyyy", { locale: de }) : "—";
const timeLabel = (v: string | null) => v ? format(parseISO(v), "HH:mm", { locale: de }) : null;
const appointmentTime = (entry: CashBookEntry) => {
  const start = timeLabel(entry.termin_start);
  const end = timeLabel(entry.termin_ende);
  return start ? `${start}${end ? `–${end}` : ""} Uhr` : "—";
};
const bookingAmount = (received: number, planned: number) => received > 0
  ? eur(received)
  : planned > 0 ? `${eur(planned)} vorgemerkt` : eur(0);
const PAYMENT_METHODS = ["Bar", "PayPal", "Überweisung", "Karte", "Sonstige"] as const;
function addPdfLogo(doc: jsPDF) {
  const x = doc.internal.pageSize.getWidth() - 154;
  doc.setFillColor(11, 11, 13);
  doc.roundedRect(x, 24, 28, 28, 5, 5, "F");
  doc.setFont("times", "italic");
  doc.setTextColor(212, 175, 122);
  doc.setFontSize(16);
  doc.text("V", x + 14, 43, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("LADY VANILLA ICE", x + 36, 42);
  doc.setTextColor(0, 0, 0);
}
const addDays = (date: string, days: number) => {
  const value = parseISO(date);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};
const statusLabel: Record<CashBookEntry["status"], string> = { open: "Offen", completed: "Erledigt", cancelled: "Storniert", rescheduling: "Umplanen" };
const exemptionLabel: Record<DepositExemptionReason, string> = {
  regular_customer: "Keine Anzahlung – Stammkunde",
  trust: "Keine Anzahlung – Vertrauensbasis",
  exception: "Keine Anzahlung – Ausnahme",
  colleague_guarantees: "Keine Anzahlung – Kollegin bürgt",
  spontaneous: "Keine Anzahlung – Spontaner Termin",
};

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function KassenbuchPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCashBookEntries);
  const listRestPayments = useServerFn(listBookingRestPaymentMethods);
  const listHiddenBookings = useServerFn(listHiddenCashbookBookings);
  const hideBooking = useServerFn(hideBookingFromCashbook);
  const create = useServerFn(createCashBookEntry);
  const updateManual = useServerFn(updateCashBookEntry);
  const createExpense = useServerFn(createStudioRentExpense);
  const calculateDistances = useServerFn(calculateStudioDistances);
  const del = useServerFn(deleteCashBookEntry);
  const saveAccounting = useServerFn(updateBookingAccounting);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["cashbook"], queryFn: () => list() });
  const { data: restPaymentMethods = {} } = useQuery({ queryKey: ["booking-rest-payment-methods"], queryFn: () => listRestPayments() });
  const { data: hiddenBookingIds = [] } = useQuery({ queryKey: ["cashbook-hidden-bookings"], queryFn: () => listHiddenBookings() });
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [studioFilter, setStudioFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CashBookEntry | null>(null);
  const [studio, setStudio] = useState(""); const [datum, setDatum] = useState(today()); const [kunde, setKunde] = useState("");
  const [anzahlung, setAnzahlung] = useState("0"); const [anzahlungMethod, setAnzahlungMethod] = useState("Überweisung"); const [anzahlungDatum, setAnzahlungDatum] = useState(""); const [manualDepositReason, setManualDepositReason] = useState<DepositExemptionReason | "">(""); const [bar, setBar] = useState("0"); const [manualRestMethod, setManualRestMethod] = useState("Bar"); const [manualRestDate, setManualRestDate] = useState(""); const [notiz, setNotiz] = useState("");
  const [expenseStudio, setExpenseStudio] = useState(""); const [expenseDate, setExpenseDate] = useState(today());
  const [expenseAmount, setExpenseAmount] = useState(""); const [expenseMethod, setExpenseMethod] = useState(""); const [expenseNote, setExpenseNote] = useState("");
  const [travelLogPending, setTravelLogPending] = useState(false);
  const [cashDay, setCashDay] = useState(today());
  const hiddenBookingSet = useMemo(() => new Set(hiddenBookingIds), [hiddenBookingIds]);

  const restMethodFor = (e: CashBookEntry) => {
    if (e.source !== "booking" || !e.booking_id) return e.restzahlung_method ?? null;
    return restPaymentMethods[e.booking_id] ?? e.restzahlung_method ?? (e.restbetrag_vorgemerkt > 0 ? "Bar" : null);
  };

  const filtered = useMemo(() => data.filter((e) => {
    if (e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) return false;
    const matchesMonth = !month || e.termin_datum.startsWith(month) || Boolean(e.anzahlung_datum?.startsWith(month)) || Boolean(e.bar_datum?.startsWith(month));
    const restMethod = e.source === "booking" && e.booking_id ? restPaymentMethods[e.booking_id] ?? (e.restbetrag_vorgemerkt > 0 ? "Bar" : null) : null;
    const haystack = `${e.kunde} ${e.studio} ${e.studio_address ?? ""} ${e.art} ${e.dauer ?? ""} ${e.expense_category ?? ""} ${e.payment_method ?? ""} ${e.anzahlung_method ?? ""} ${restMethod ?? ""}`.toLowerCase();
    const methodsForEntry = e.entry_type === "expense" ? [e.payment_method] : e.source === "booking" ? [e.anzahlung_method, restMethod] : [e.anzahlung_method];
    return matchesMonth && (!studioFilter || e.studio === studioFilter) && (!methodFilter || methodsForEntry.includes(methodFilter)) && (!statusFilter || e.status === statusFilter) && (!search || haystack.includes(search.toLowerCase()));
  }).sort((a, b) => {
    const dateOrder = (a.payment_date ?? a.termin_datum).localeCompare(b.payment_date ?? b.termin_datum);
    return dateOrder || (a.termin_start ?? "99:99").localeCompare(b.termin_start ?? "99:99");
  }), [data, month, studioFilter, methodFilter, statusFilter, search, restPaymentMethods, hiddenBookingSet]);

  const incomeEntries = filtered.filter(e => e.entry_type === "income");
  const activeIncomeEntries = incomeEntries.filter(e => e.status !== "completed");
  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed");
  const receivedIncomeEntries = incomeEntries.filter(e => e.source === "manual" ? Boolean(e.payment_date?.startsWith(month) && e.gesamt > 0) : Boolean((e.anzahlung_datum?.startsWith(month) && e.anzahlung > 0) || (e.bar_datum?.startsWith(month) && e.bar > 0)));
  const expenseEntries = filtered.filter(e => e.entry_type === "expense");
  const totals = receivedIncomeEntries.reduce((a, e) => { const deposit = e.source === "manual" || e.anzahlung_datum?.startsWith(month) ? e.anzahlung : 0; const cash = e.source === "manual" || e.bar_datum?.startsWith(month) ? e.bar : 0; a.anzahlung += deposit; a.bar += cash; a.gesamt += deposit + cash; if (e.status === "cancelled") a.storno += deposit; return a; }, { anzahlung: 0, bar: 0, gesamt: 0, storno: 0 });
  const completedAppointments = new Set(data.filter(e => e.booking_id && e.status === "completed" && e.termin_datum.startsWith(month)).map(e => e.booking_id)).size;
  const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.expense_amount, 0);
  const balance = totals.gesamt - totalExpenses;
  const totalNet = totals.gesamt / 1.19;
  const totalVat = totals.gesamt - totalNet;
  const dailyCash = data.filter(e => e.entry_type === "income")
    .filter(e => !(e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)))
    .reduce((sum, e) => {
      const depositCash = e.anzahlung_datum === cashDay && e.anzahlung > 0 && e.anzahlung_method?.trim().toLowerCase() === "bar" ? e.anzahlung : 0;
      const onsiteCash = e.bar_datum === cashDay && e.bar > 0 && restMethodFor(e)?.trim().toLowerCase() === "bar" ? e.bar : 0;
      return sum + depositCash + onsiteCash;
    }, 0);
  const studios = [...new Set(data.map(e => e.studio))].sort();
  const methods = [...new Set(data.flatMap(e => [e.anzahlung_method, e.restzahlung_method, e.payment_method, restMethodFor(e)]).filter(Boolean) as string[])].sort();
  const depositText = (e: CashBookEntry) => e.deposit_exemption_reason ? exemptionLabel[e.deposit_exemption_reason] : e.anzahlung_method ?? "—";
  const studioParts = (e: CashBookEntry) => {
    const rawStudio = e.studio.trim();
    const storedAddress = e.studio_address?.trim() ?? "";
    const commaIndex = rawStudio.indexOf(",");
    const studioName = commaIndex >= 0 ? rawStudio.slice(0, commaIndex).trim() : rawStudio;
    const addressFromStudio = commaIndex >= 0 ? rawStudio.slice(commaIndex + 1).trim() : "";
    return { studio: studioName, address: storedAddress || addressFromStudio };
  };
  const studioText = (e: CashBookEntry) => {
    const parts = studioParts(e);
    return parts.address ? `${parts.studio}\n${parts.address}` : parts.studio;
  };
  const isFinancialSlave = (e: CashBookEntry) => e.source === "manual" && (e.studio === "Zahlsklave" || e.notiz === "Zahlsklave");
  const paymentLabel = (e: CashBookEntry) => isFinancialSlave(e) ? "Zahlsklave" : e.source === "booking" ? "Buchung" : "Manuelle Zahlung";
  const paymentMethodText = (e: CashBookEntry) => [e.anzahlung > 0 || e.anzahlung_vorgemerkt > 0 ? `Anz. ${depositText(e)}` : e.deposit_exemption_reason ? depositText(e) : null, e.bar > 0 || e.restbetrag_vorgemerkt > 0 ? `Vor Ort ${restMethodFor(e) ?? "—"}` : null].filter(Boolean).join(" · ") || "—";
  const paymentDateText = (e: CashBookEntry) => [e.anzahlung_datum ? `Anz. ${dateLabel(e.anzahlung_datum)}` : null, e.bar_datum ? `Vor Ort ${dateLabel(e.bar_datum)}` : null].filter(Boolean).join(" · ") || "—";
  const openBalance = (e: CashBookEntry) => Math.max(0, e.restbetrag_vorgemerkt - e.bar);
  const bookingAmountText = (e: CashBookEntry) => e.source === "booking" ? [`Anz. ${eur(e.anzahlung)}`, openBalance(e) > 0 ? `${eur(openBalance(e))} offen` : e.bar > 0 ? `Rest ${eur(e.bar)}` : null].filter(Boolean).join(" · ") : eur(e.gesamt);
  const monthAmount = (e: CashBookEntry) => (e.source === "manual" ? e.gesamt : (e.anzahlung_datum?.startsWith(month) ? e.anzahlung : 0) + (e.bar_datum?.startsWith(month) ? e.bar : 0));
  const rows = () => receivedIncomeEntries.map(e => {
    const parts = studioParts(e);
    return [paymentDateText(e), paymentLabel(e), eur(monthAmount(e)), paymentMethodText(e), e.kunde, dateLabel(e.termin_datum), appointmentTime(e), e.art, parts.studio, parts.address || "—", e.dauer ?? "—", statusLabel[e.status]];
  });

  const createMut = useMutation({ mutationFn: () => create({ data: { studio, datum, kunde, anzahlung: manualDepositReason ? 0 : Number(anzahlung.replace(",", ".")) || 0, anzahlung_method: manualDepositReason ? null : anzahlungMethod || null, anzahlung_datum: manualDepositReason ? null : anzahlungDatum || null, deposit_exemption_reason: manualDepositReason || null, bar: Number(bar.replace(",", ".")) || 0, restzahlung_method: Number(bar.replace(",", ".")) > 0 ? manualRestMethod || null : null, restzahlung_datum: Number(bar.replace(",", ".")) > 0 ? manualRestDate || null : null, notiz: notiz || null } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook"] }); setKunde(""); setAnzahlung("0"); setAnzahlungDatum(""); setManualDepositReason(""); setAnzahlungMethod("Überweisung"); setBar("0"); setManualRestMethod("Bar"); setManualRestDate(""); setNotiz(""); } });
  const expenseMut = useMutation({ mutationFn: () => createExpense({ data: { studio: expenseStudio, datum: expenseDate, betrag: Number(expenseAmount.replace(",", ".")), zahlungsart: expenseMethod, notiz: expenseNote || null } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashbook"] }); setExpenseAmount(""); setExpenseMethod(""); setExpenseNote(""); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cashbook"] }) });
  const hideBookingMut = useMutation({
    mutationFn: (booking_id: string) => hideBooking({ data: { booking_id } }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cashbook-hidden-bookings"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["cashbook"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["admin-bookings"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["admin-slots"], refetchType: "all" }),
      ]);
    },
    onError: (err) => alert(`Termin konnte nicht gelöscht werden: ${err instanceof Error ? err.message : String(err)}`),
  });

  function canExport() {
    if (isLoading) { alert("Das Kassenbuch wird noch geladen. Bitte kurz warten."); return false; }
    if (error) { alert(`Die Kassenbuchdaten konnten nicht geladen werden: ${(error as Error).message}`); return false; }
    if (!receivedIncomeEntries.length) { alert(`Für ${month || "den gewählten Zeitraum"} wurden keine Zahlungseingänge gefunden.`); return false; }
    return true;
  }

  function exportPdf(mobile = false) {
    if (!canExport()) return false;
    const doc = new jsPDF({ orientation: mobile ? "portrait" : "landscape", unit: "pt", format: "a4" });
    addPdfLogo(doc);
    const monthLabel = format(parseISO(`${month}-01`), "LLLL yyyy", { locale: de });
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("KASSENBUCH", 28, 40); doc.setFontSize(11); doc.text(monthLabel, 28, 58);
    autoTable(doc, mobile ? {
      startY: 92, head: [["Zahlung / Kunde", "Session", "Studio / Art", "Betrag"]],
      body: receivedIncomeEntries.map(e => [`${paymentDateText(e)} · ${paymentLabel(e)}\n${e.kunde}\n${paymentMethodText(e)}`, `${dateLabel(e.termin_datum)} · ${appointmentTime(e)}\n${e.dauer ?? ""}`, `${studioText(e)}\n${e.art}`, eur(monthAmount(e))]),
      foot: [["SUMME", "", "", eur(totals.gesamt)]], styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak" }, headStyles: { fillColor: [15, 15, 15] }, footStyles: { fillColor: [239, 229, 207], textColor: 15 },
    } : {
      startY: 92, head: [["Zahlungseingang", "Vorgang", "Betrag", "Zahlungsart", "Kunde", "Session am", "Uhrzeit", "Art", "Studio", "Adresse", "Dauer", "Status"]], body: rows(),
      foot: [["SUMME", "", eur(totals.gesamt), "", "", "", "", "", "", "", "", ""]], styles: { fontSize: 6, cellPadding: 3, overflow: "linebreak" }, headStyles: { fillColor: [15, 15, 15] }, footStyles: { fillColor: [239, 229, 207], textColor: 15 },
    });
    const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 92;
    let summaryY = tableEndY + 18;
    if (summaryY > doc.internal.pageSize.getHeight() - 24) { doc.addPage(); summaryY = 28; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(`Gesamt brutto: ${eur(totals.gesamt)} · enthaltene MwSt. 19 %: ${eur(totalVat)} · Gesamt netto: ${eur(totalNet)}`, 28, summaryY);
    doc.save(`kassenbuch-${month}${mobile ? "-mobil" : ""}.pdf`);
    return true;
  }

  function exportCsv() {
    if (!canExport()) return;
    const head = ["Zahlungseingang", "Vorgang", "Betrag", "Zahlungsart", "Kunde", "Session am", "Uhrzeit von–bis", "Art", "Studio", "Adresse", "Dauer", "Status"];
    const raw = receivedIncomeEntries.map(e => {
      const parts = studioParts(e);
      return [e.payment_date ?? "", paymentLabel(e), e.gesamt.toFixed(2).replace(".", ","), paymentMethodText(e), e.kunde, e.termin_datum, appointmentTime(e), e.art, parts.studio, parts.address, e.dauer ?? "", statusLabel[e.status]];
    });
    const csv = [head, ...raw].map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
    download(`kassenbuch-${month}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  }

  function exportMonthPackage() { if (!exportPdf(false)) return; window.setTimeout(() => exportCsv(), 250); }
  function exportExcel() {
    if (!canExport()) return;
    const table = [["Zahlungseingang", "Vorgang", "Betrag", "Zahlungsart", "Kunde", "Session am", "Uhrzeit", "Art", "Studio", "Adresse", "Dauer", "Status"], ...rows()].map(r => `<tr>${r.map(v => `<td>${String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("\n", "<br>")}</td>`).join("")}</tr>`).join("");
    download(`kassenbuch-${month}.xls`, `\uFEFF<html><head><meta charset="utf-8"></head><body><table>${table}</table></body></html>`, "application/vnd.ms-excel");
  }

  async function exportTravelLog() {
    const cleanTravelText = (value: string) => value
      .replace(/\s*(?:—|–|-)\s*(?:Raum|Room)\b.*$/i, "")
      .replace(/\s*,\s*(?:Raum|Room)\b.*$/i, "")
      .trim();
    const cleanTravelStudio = (value: string) => value
      .replace(/\s*(?:—|–|-)\s*(?:Raum|Room|VIP(?:\s+Lounge)?)\b.*$/i, "")
      .trim();
    const clockMinutes = (value: string | null) => {
      const label = timeLabel(value);
      if (!label) return null;
      const [hours, minutes] = label.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const clock = (minutes: number) => {
      const dayShift = Math.floor(minutes / 1440);
      const normalized = ((minutes % 1440) + 1440) % 1440;
      const label = `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
      if (dayShift > 0) return `${label} Uhr (+${dayShift} Tag${dayShift > 1 ? "e" : ""})`;
      if (dayShift < 0) return `${label} Uhr (${Math.abs(dayShift)} Tag vorher)`;
      return `${label} Uhr`;
    };
    const awayStart = (firstStart: number | null) => firstStart !== null && firstStart <= 12 * 60 ? firstStart - 3 * 60 : 10 * 60;
    const awayEnd = (lastEnd: number | null, lastStart: number | null) => (lastEnd ?? lastStart ?? 20 * 60) + 4 * 60;

    const appointmentMap = new Map<string, { date: string; studio: string; address: string; firstStart: number | null; lastStart: number | null; lastEnd: number | null }>();
    for (const entry of data.filter(entry => entry.termin_datum.startsWith(month)).filter(entry => entry.source === "booking" && entry.status !== "cancelled")) {
      const parts = studioParts(entry);
      const studio = cleanTravelStudio(parts.studio);
      const address = cleanTravelText(parts.address);
      const key = `${entry.termin_datum}|${studio.toLowerCase()}|${address.toLowerCase()}`;
      const startMinutes = clockMinutes(entry.termin_start);
      const endMinutes = clockMinutes(entry.termin_ende);
      const existing = appointmentMap.get(key);
      if (!existing) {
        appointmentMap.set(key, { date: entry.termin_datum, studio, address, firstStart: startMinutes, lastStart: startMinutes, lastEnd: endMinutes });
      } else {
        if (startMinutes !== null && (existing.firstStart === null || startMinutes < existing.firstStart)) existing.firstStart = startMinutes;
        if (startMinutes !== null && (existing.lastStart === null || startMinutes > existing.lastStart)) existing.lastStart = startMinutes;
        if (endMinutes !== null && (existing.lastEnd === null || endMinutes > existing.lastEnd)) existing.lastEnd = endMinutes;
      }
    }
    const appointments = [...appointmentMap.values()].sort((a, b) => a.date.localeCompare(b.date) || a.studio.localeCompare(b.studio));
    const missingAddress = appointments.find(entry => !entry.address);
    if (missingAddress) { alert(`Für ${missingAddress.studio} am ${dateLabel(missingAddress.date)} fehlt die Studio-Adresse. Bitte den Termin zuerst im Kassenbuch bearbeiten.`); return; }
    if (!appointments.length) { alert("Für den gewählten Monat gibt es keine Termine mit Fahrt."); return; }
    setTravelLogPending(true);
    try {
      const distanceResult = await calculateDistances({ data: { destinations: appointments.map(entry => ({ key: `${entry.studio}|${entry.address}`, address: entry.address })) } });
      const kilometres = new Map(distanceResult.distances.map(entry => [entry.key, entry.kilometres]));
      const travelRows: Array<[string, string, string, string, string, string, number]> = [];
      for (let index = 0; index < appointments.length;) {
        const first = appointments[index]; let lastIndex = index;
        while (lastIndex + 1 < appointments.length && appointments[lastIndex + 1].date === addDays(appointments[lastIndex].date, 1) && appointments[lastIndex + 1].studio === first.studio && appointments[lastIndex + 1].address === first.address) lastIndex += 1;
        const km = kilometres.get(`${first.studio}|${first.address}`) ?? 0;
        if (lastIndex === index) {
          const period = `${clock(awayStart(first.firstStart))} – ${clock(awayEnd(first.lastEnd, first.lastStart))}`;
          travelRows.push([dateLabel(first.date), period, `${distanceResult.homeAddress} - ${first.address} - ${distanceResult.homeAddress}`, first.studio, first.address, "Hin- und Rückfahrt", km * 2]);
        } else {
          const last = appointments[lastIndex];
          travelRows.push([dateLabel(first.date), `${clock(awayStart(first.firstStart))} – Übernachtung vor Ort`, `${distanceResult.homeAddress} - ${first.address}`, first.studio, first.address, "Hinfahrt, Übernachtung vor Ort", km]);
          travelRows.push([dateLabel(last.date), `Übernachtung vor Ort – ${clock(awayEnd(last.lastEnd, last.lastStart))}`, `${last.address} - ${distanceResult.homeAddress}`, last.studio, last.address, "Rückfahrt nach mehrtägigem Aufenthalt", km]);
        }
        index = lastIndex + 1;
      }
      const totalKm = travelRows.reduce((sum, row) => sum + row[6], 0);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" }); addPdfLogo(doc);
      const monthLabel = format(parseISO(`${month}-01`), "LLLL yyyy", { locale: de });
      doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("FAHRTENBUCH", 28, 40); doc.setFontSize(11); doc.text(monthLabel, 28, 58); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`Ausgangspunkt: ${distanceResult.homeAddress}`, 28, 74);
      autoTable(doc, { startY: 90, head: [["Datum", "Von–bis", "Fahrtstrecke", "Studio", "Adresse", "Anlass / Art der Fahrt", "Kilometer"]], body: travelRows.map(row => [row[0], row[1], row[2], row[3], row[4], row[5], `${row[6]} km`]), foot: [["SUMME", "", "", "", "", "", `${totalKm} km`]], styles: { fontSize: 7.2, cellPadding: 4, overflow: "linebreak" }, columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 120 }, 2: { cellWidth: 215 }, 3: { cellWidth: 75 }, 4: { cellWidth: 145 }, 5: { cellWidth: 125 }, 6: { cellWidth: 58, halign: "right" } }, headStyles: { fillColor: [15, 15, 15] }, footStyles: { fillColor: [239, 229, 207], textColor: 15, fontStyle: "bold" } });
      const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;
      doc.setFontSize(8); doc.text("Zeitregel: bei Terminen ab 12 Uhr Abfahrt 10:00 Uhr, sonst 3 Stunden vor dem ersten Termin; Rückkehr ca. 4 Stunden nach dem letzten Termin.", 28, Math.min(finalY + 24, 560)); doc.save(`fahrtenbuch-${month}.pdf`);
    } catch (error) { alert(error instanceof Error ? error.message : "Das Fahrtenbuch konnte nicht erstellt werden."); }
    finally { setTravelLogPending(false); }
  }

  const incomeActions = (e: CashBookEntry) => e.source === "booking" ? (
    <div className="flex items-center gap-3">
      <button onClick={() => setEditing(e)} className="text-champagne text-xs uppercase">Bearbeiten</button>
      <button onClick={() => e.booking_id && confirm("Termin und Kassenbucheintrag endgültig löschen? Der Zeitraum wird wieder freigegeben.") && hideBookingMut.mutate(e.booking_id)} aria-label="Termin löschen" title="Termin löschen"><Trash2 size={15} /></button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <button onClick={() => setEditing(e)} className="text-champagne text-xs uppercase">Bearbeiten</button>
      <button onClick={() => confirm("Löschen?") && deleteMut.mutate(e.id)} aria-label="Löschen"><Trash2 size={15} /></button>
    </div>
  );

  return <>
    <PageHeader eyebrow="Admin" title={<em className="font-script gold-text not-italic">Kassenbuch</em>} />
    <section className="py-8 md:py-12"><div className="container-luxe max-w-[1500px] space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-vanilla/60 hover:text-champagne"><ArrowLeft size={14} /> Zurück zum Admin</Link>
      {error && <div className="border border-bordeaux bg-bordeaux/10 p-4 text-bordeaux">Kassenbuchdaten konnten nicht geladen werden: {(error as Error).message}</div>}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Stat label="Anzahlungen" value={eur(totals.anzahlung)} /><Stat label="Vor Ort" value={eur(totals.bar)} /><Stat label="Ausgaben" value={eur(totalExpenses)} /><Stat label="Saldo" value={eur(balance)} gold /><Stat label="Erledigte Termine" value={String(completedAppointments)} /></div>
      <div className="bg-card border border-champagne/30 p-4 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="sm:w-64"><Field label="Tag für Bareinzahlung"><input type="date" value={cashDay} onChange={e => setCashDay(e.target.value)} className="luxe-input" /></Field></div>
        <div className="flex-1 border border-champagne/20 px-4 py-3 min-h-[54px] flex items-center justify-between gap-4"><span className="eyebrow">Bar erhalten an diesem Tag</span><strong className="text-xl text-champagne whitespace-nowrap">{eur(dailyCash)}</strong></div>
      </div>
      <div className="bg-card border border-champagne/20 p-4 grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        <Field label="Monat"><input type="month" value={month} onChange={e => setMonth(e.target.value)} className="luxe-input" /></Field>
        <Field label="Studio"><select value={studioFilter} onChange={e => setStudioFilter(e.target.value)} className="luxe-input"><option value="">Alle</option>{studios.map(v => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Zahlungsart"><select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="luxe-input"><option value="">Alle</option>{methods.map(v => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Status"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="luxe-input"><option value="">Alle</option><option value="open">Offen</option><option value="completed">Erledigt</option><option value="cancelled">Storniert</option><option value="rescheduling">Umplanen</option></select></Field>
        <Field label="Suchen"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-vanilla/40" /><input value={search} onChange={e => setSearch(e.target.value)} className="luxe-input pl-9" /></div></Field>
        <div className="flex gap-2 flex-wrap"><button onClick={exportMonthPackage} className="export-btn !border-champagne !bg-champagne/10"><FileDown size={14} /> Monatsabschluss</button><button onClick={exportTravelLog} disabled={travelLogPending} className="export-btn !border-champagne !bg-champagne/10"><Car size={14} /> {travelLogPending ? "Berechne…" : "Fahrtenbuch PDF"}</button><button onClick={() => exportPdf(false)} className="export-btn"><FileDown size={14} /> PDF</button><button onClick={() => exportPdf(true)} className="export-btn"><Smartphone size={14} /> PDF Handy</button><button onClick={exportCsv} className="export-btn"><FileSpreadsheet size={14} /> CSV</button><button onClick={exportExcel} className="export-btn"><FileSpreadsheet size={14} /> Excel</button></div>
      </div>
      <FinancialSlaveEntryForm />
      <form onSubmit={e => { e.preventDefault(); createMut.mutate(); }} className="bg-card border border-champagne/20 p-4 space-y-4"><h2 className="eyebrow">Manueller Eintrag</h2><div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3"><Field label="Datum"><input required type="date" value={datum} onChange={e => setDatum(e.target.value)} className="luxe-input" /></Field><Field label="Kunde"><input required value={kunde} onChange={e => setKunde(e.target.value)} className="luxe-input" /></Field><Field label="Studio"><input required value={studio} onChange={e => setStudio(e.target.value)} className="luxe-input" /></Field><Field label="Anzahlungsregel"><select value={manualDepositReason} onChange={e => { const v = e.target.value as DepositExemptionReason | ""; setManualDepositReason(v); if (v) { setAnzahlung("0"); setAnzahlungDatum(""); } }} className="luxe-input"><option value="">Normale Anzahlung</option><option value="regular_customer">Keine Anzahlung – Stammkunde</option><option value="trust">Keine Anzahlung – Vertrauensbasis</option><option value="exception">Keine Anzahlung – Ausnahme</option><option value="colleague_guarantees">Keine Anzahlung – Kollegin bürgt</option><option value="spontaneous">Keine Anzahlung – Spontaner Termin</option></select></Field><Field label="Anzahlung Betrag (€)"><input disabled={Boolean(manualDepositReason)} value={anzahlung} onChange={e => setAnzahlung(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Anzahlung erhalten am"><input disabled={Boolean(manualDepositReason)} type="date" value={anzahlungDatum} onChange={e => setAnzahlungDatum(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Anzahlungsmethode"><select disabled={Boolean(manualDepositReason)} value={anzahlungMethod} onChange={e => setAnzahlungMethod(e.target.value)} className="luxe-input disabled:opacity-40">{PAYMENT_METHODS.map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Vor Ort Betrag (€)"><input value={bar} onChange={e => setBar(e.target.value)} className="luxe-input" /></Field><Field label="Vor Ort erhalten am"><input type="date" value={manualRestDate} onChange={e => setManualRestDate(e.target.value)} className="luxe-input" /></Field><Field label="Vor Ort Zahlungsmethode"><select value={manualRestMethod} onChange={e => setManualRestMethod(e.target.value)} className="luxe-input">{PAYMENT_METHODS.map(v => <option key={v}>{v}</option>)}</select></Field><div className="md:col-span-2"><Field label="Notiz"><input value={notiz} onChange={e => setNotiz(e.target.value)} className="luxe-input" /></Field></div></div><button className="btn-gold inline-flex gap-2"><Plus size={15} /> Eintrag speichern</button></form>
      <form onSubmit={e => { e.preventDefault(); expenseMut.mutate(); }} className="bg-card border border-bordeaux/50 p-4 space-y-4"><h2 className="eyebrow text-champagne">Ausgabe – Studiomiete</h2><div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3"><Field label="Datum"><input required type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="luxe-input" /></Field><Field label="Studio"><input required value={expenseStudio} onChange={e => setExpenseStudio(e.target.value)} placeholder="z. B. Studio60" className="luxe-input" /></Field><Field label="Betrag (€)"><input required inputMode="decimal" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="luxe-input" /></Field><Field label="Bezahlt mit"><input required value={expenseMethod} onChange={e => setExpenseMethod(e.target.value)} placeholder="Bar, Karte, Überweisung …" className="luxe-input" /></Field><div className="md:col-span-4"><Field label="Notiz (optional)"><input value={expenseNote} onChange={e => setExpenseNote(e.target.value)} className="luxe-input" /></Field></div></div><button disabled={expenseMut.isPending} className="btn-gold inline-flex gap-2"><Plus size={15} />{expenseMut.isPending ? "Speichere…" : "Studiomiete speichern"}</button>{expenseMut.error && <p className="text-sm text-bordeaux">{(expenseMut.error as Error).message}</p>}</form>
      {expenseEntries.length > 0 && <div className="bg-card border border-bordeaux/40 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase text-vanilla/50">{["Datum", "Ausgabe", "Studio", "Zahlungsart", "Betrag", ""].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{expenseEntries.map(e => <tr key={e.id} className="border-t border-champagne/10"><td className="p-3">{dateLabel(e.termin_datum)}</td><td className="p-3">Studiomiete</td><td className="p-3">{e.studio}</td><td className="p-3">{e.payment_method}</td><td className="p-3 text-bordeaux">− {eur(e.expense_amount)}</td><td className="p-3"><button onClick={() => confirm("Ausgabe löschen?") && deleteMut.mutate(e.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}
      <div className="md:hidden space-y-3">{isLoading ? <div>Lade…</div> : error ? <div className="text-bordeaux">Fehler beim Laden</div> : activeIncomeEntries.map(e => <article key={e.id} className="bg-card border border-champagne/20 p-4 space-y-2"><div className="flex justify-between gap-3"><div><strong>{e.kunde}</strong><div className="text-xs text-champagne">{paymentDateText(e)}</div></div><span className="text-champagne text-right">{bookingAmountText(e)}</span></div><div className="text-xs text-vanilla/55">Session: {dateLabel(e.termin_datum)} · {appointmentTime(e)} · {e.art}</div><div className="text-sm">{studioParts(e).studio}</div>{studioParts(e).address && <div className="text-xs text-vanilla/55">{studioParts(e).address}</div>}<div className="text-xs">Zahlungsart: {paymentMethodText(e)}</div><div className="flex justify-between"><span className={`status-${e.status}`}>{statusLabel[e.status]}</span>{incomeActions(e)}</div></article>)}</div>
      <div className="hidden md:block bg-card border border-champagne/20 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[1250px]"><thead><tr className="text-[10px] uppercase text-vanilla/50">{["Zahlungseingang", "Vorgang", "Anzahlung / Restbetrag", "Zahlungsart", "Kunde", "Session am", "Uhrzeit", "Art", "Studio / Adresse", "Dauer", "Status", ""].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{activeIncomeEntries.map(e => <tr key={e.id} className="border-t border-champagne/10"><td className="p-3">{paymentDateText(e)}</td><td className="p-3">{paymentLabel(e)}</td><td className="p-3 text-champagne">{bookingAmountText(e)}</td><td className="p-3">{paymentMethodText(e)}</td><td className="p-3 font-medium">{e.kunde}</td><td className="p-3">{dateLabel(e.termin_datum)}</td><td className="p-3">{appointmentTime(e)}</td><td className="p-3">{e.art}</td><td className="p-3"><div>{studioParts(e).studio}</div>{studioParts(e).address && <div className="text-xs text-vanilla/50 mt-1">{studioParts(e).address}</div>}</td><td className="p-3">{e.dauer ?? "—"}</td><td className="p-3"><span className={`status-${e.status}`}>{statusLabel[e.status]}</span></td><td className="p-3">{incomeActions(e)}</td></tr>)}</tbody></table></div></div>
      {completedIncomeEntries.length > 0 && (
        <details className="bg-card border border-champagne/20">
          <summary className="cursor-pointer px-4 py-4 text-sm uppercase tracking-[0.16em] text-champagne hover:bg-champagne/5">
            Vergangene Termine ({completedIncomeEntries.length})
          </summary>
          <div className="border-t border-champagne/15">
            <div className="md:hidden space-y-3 p-3">
              {completedIncomeEntries.map(e => <article key={e.id} className="bg-anthracite/20 border border-champagne/15 p-4 space-y-2"><div className="flex justify-between gap-3"><div><strong>{e.kunde}</strong><div className="text-xs text-champagne">{paymentDateText(e)}</div></div><span className="text-champagne text-right">{bookingAmountText(e)}</span></div><div className="text-xs text-vanilla/55">Session: {dateLabel(e.termin_datum)} · {appointmentTime(e)} · {e.art}</div><div className="text-sm">{studioParts(e).studio}</div>{studioParts(e).address && <div className="text-xs text-vanilla/55">{studioParts(e).address}</div>}<div className="text-xs">Zahlungsart: {paymentMethodText(e)}</div><div className="flex justify-between"><span className={`status-${e.status}`}>{statusLabel[e.status]}</span>{incomeActions(e)}</div></article>)}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[1250px]"><thead><tr className="text-[10px] uppercase text-vanilla/50">{["Zahlungseingang", "Vorgang", "Anzahlung / Restbetrag", "Zahlungsart", "Kunde", "Session am", "Uhrzeit", "Art", "Studio / Adresse", "Dauer", "Status", ""].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{completedIncomeEntries.map(e => <tr key={e.id} className="border-t border-champagne/10"><td className="p-3">{paymentDateText(e)}</td><td className="p-3">{paymentLabel(e)}</td><td className="p-3 text-champagne">{bookingAmountText(e)}</td><td className="p-3">{paymentMethodText(e)}</td><td className="p-3 font-medium">{e.kunde}</td><td className="p-3">{dateLabel(e.termin_datum)}</td><td className="p-3">{appointmentTime(e)}</td><td className="p-3">{e.art}</td><td className="p-3"><div>{studioParts(e).studio}</div>{studioParts(e).address && <div className="text-xs text-vanilla/50 mt-1">{studioParts(e).address}</div>}</td><td className="p-3">{e.dauer ?? "—"}</td><td className="p-3"><span className={`status-${e.status}`}>{statusLabel[e.status]}</span></td><td className="p-3">{incomeActions(e)}</td></tr>)}</tbody></table>
            </div>
          </div>
        </details>
      )}
      <div className="border border-champagne/30 bg-card p-4"><div className="eyebrow text-champagne mb-3">Gesamtsumme</div><div className="grid sm:grid-cols-3 gap-3"><Stat label="Gesamt brutto" value={eur(totals.gesamt)} gold /><Stat label="Ausgaben Studiomiete" value={eur(totalExpenses)} /><Stat label="Saldo" value={eur(balance)} gold /></div></div>
    </div></section>
    {editing?.source === "booking" && <AccountingDialog entry={editing} restMethod={restMethodFor(editing)} onClose={() => setEditing(null)} onSave={async payload => { await saveAccounting({ data: payload }); await Promise.all([qc.invalidateQueries({ queryKey: ["cashbook"] }), qc.invalidateQueries({ queryKey: ["booking-rest-payment-methods"] })]); setEditing(null); }} />}
    {editing?.source === "manual" && editing.entry_type === "income" && <ManualEntryDialog entry={editing} onClose={() => setEditing(null)} onSave={async payload => { await updateManual({ data: payload }); await qc.invalidateQueries({ queryKey: ["cashbook"] }); setEditing(null); }} />}
    <style>{`.luxe-input{width:100%;background:color-mix(in oklab,var(--color-anthracite) 60%,transparent);border:1px solid color-mix(in oklab,var(--color-champagne) 25%,transparent);color:var(--color-vanilla);padding:.65rem .75rem;outline:none}.export-btn{display:inline-flex;gap:.35rem;align-items:center;border:1px solid color-mix(in oklab,var(--color-champagne) 45%,transparent);padding:.65rem .75rem;color:var(--color-champagne);font-size:.65rem;text-transform:uppercase}.status-open,.status-completed,.status-cancelled,.status-rescheduling{padding:.25rem .45rem;font-size:.62rem;text-transform:uppercase}.status-open{background:#7c5a102d}.status-completed{background:#16653455}.status-cancelled{background:#7f1d1d55}.status-rescheduling{background:#1d4ed855}`}</style>
  </>;
}

function AccountingDialog({ entry, restMethod, onClose, onSave }: { entry: CashBookEntry; restMethod: string | null; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [studio, setStudio] = useState(entry.studio === "—" ? "" : entry.studio);
  const [address, setAddress] = useState(entry.studio_address ?? "");
  const [a, setA] = useState(String(entry.anzahlung_vorgemerkt)); const [depositMethod, setDepositMethod] = useState(entry.anzahlung_method ?? "Überweisung"); const [aDate, setADate] = useState(entry.anzahlung_datum ?? "");
  const [bar, setBar] = useState(String(entry.restbetrag_vorgemerkt)); const [restPaymentMethod, setRestPaymentMethod] = useState(restMethod ?? (entry.restbetrag_vorgemerkt > 0 ? "Bar" : "")); const [barDate, setBarDate] = useState(entry.bar_datum ?? ""); const [status, setStatus] = useState<CashBookEntry["status"]>(entry.status); const [full, setFull] = useState(entry.status === "completed");
  const [reason, setReason] = useState<DepositExemptionReason | "">(entry.deposit_exemption_reason ?? ""); const [saving, setSaving] = useState(false);
  const hasExemption = Boolean(reason);
  async function save() {
    setSaving(true);
    try { await onSave({ id: entry.booking_id, studio, studio_address: address || null, anzahlung: hasExemption ? 0 : Number(a.replace(",", ".")) || 0, anzahlung_method: hasExemption ? null : depositMethod || null, anzahlung_paid_at: hasExemption ? null : aDate || null, deposit_exemption_reason: reason || null, deposit_guarantor: null, bar: Number(bar.replace(",", ".")) || 0, restzahlung_method: Number(bar.replace(",", ".")) > 0 ? restPaymentMethod || null : null, completed_at: full ? (entry.durchgefuehrt_datum || today()) : null, cash_received_at: barDate || null, fully_paid: full, status, note: entry.notiz }); } finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[100] bg-black/80 grid place-items-center p-3"><div className="bg-card border border-champagne/40 max-w-2xl w-full p-4 md:p-6 max-h-[92vh] overflow-y-auto"><div className="flex justify-between mb-5"><div><div className="eyebrow">Termin, Studio & Zahlung</div><h3 className="font-display text-2xl">{entry.kunde}</h3></div><button onClick={onClose}><X /></button></div><div className="grid md:grid-cols-2 gap-4"><Field label="Studio"><input value={studio} onChange={e => setStudio(e.target.value)} placeholder="z. B. Studio60" className="luxe-input" /></Field><Field label="Studio-Adresse"><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Straße, Hausnummer, PLZ, Ort" className="luxe-input" /></Field><div className="md:col-span-2"><Field label="Anzahlungsregel"><select value={reason} onChange={e => { const value = e.target.value as DepositExemptionReason | ""; setReason(value); if (value) { setA("0"); setADate(""); setDepositMethod(""); } }} className="luxe-input"><option value="">Normale Anzahlung</option><option value="regular_customer">Keine Anzahlung – Stammkunde</option><option value="trust">Keine Anzahlung – Vertrauensbasis</option><option value="exception">Keine Anzahlung – Ausnahme</option><option value="colleague_guarantees">Keine Anzahlung – Kollegin bürgt</option><option value="spontaneous">Keine Anzahlung – Spontaner Termin</option></select></Field></div><Field label="Anzahlung Betrag (€)"><input disabled={hasExemption} value={a} onChange={e => setA(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Anzahlungsmethode"><select disabled={hasExemption} value={depositMethod} onChange={e => setDepositMethod(e.target.value)} className="luxe-input disabled:opacity-40"><option value="">Auswählen</option>{PAYMENT_METHODS.map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Anzahlung erhalten am"><input disabled={hasExemption} type="date" value={aDate} onChange={e => setADate(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Vor Ort Betrag (€)"><input value={bar} onChange={e => setBar(e.target.value)} className="luxe-input" /></Field><Field label="Vor Ort Zahlungsmethode"><select value={restPaymentMethod} onChange={e => setRestPaymentMethod(e.target.value)} className="luxe-input"><option value="">Auswählen</option>{PAYMENT_METHODS.map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Vor Ort erhalten am"><input type="date" value={barDate} onChange={e => setBarDate(e.target.value)} className="luxe-input" /></Field><Field label="Status"><select value={status} onChange={e => setStatus(e.target.value as CashBookEntry["status"])} className="luxe-input"><option value="open">Offen</option><option value="completed">Erledigt</option><option value="cancelled">Storniert</option><option value="rescheduling">Umplanen</option></select></Field><label className="md:col-span-2 flex gap-3 items-center border border-champagne/20 p-3"><input type="checkbox" checked={full} onChange={e => { setFull(e.target.checked); if (e.target.checked) { setStatus("completed"); setBar(v => (Number(v.replace(",", ".")) > 0 ? v : String(entry.restbetrag_vorgemerkt))); setBarDate(v => v || today()); } }} /><span>Vollständig bezahlt</span></label></div><div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="export-btn">Abbrechen</button><button onClick={save} disabled={saving || !studio.trim() || (Number(bar.replace(",", ".")) > 0 && !restPaymentMethod)} className="btn-gold inline-flex gap-2"><Save size={15} />{saving ? "Speichere…" : "Speichern"}</button></div></div></div>;
}

function ManualEntryDialog({ entry, onClose, onSave }: { entry: CashBookEntry; onClose: () => void; onSave: (data: { id: string; studio: string; datum: string; kunde: string; anzahlung: number; anzahlung_method: string | null; anzahlung_datum: string | null; deposit_exemption_reason: DepositExemptionReason | null; bar: number; restzahlung_method: string | null; restzahlung_datum: string | null; notiz: string | null }) => Promise<void> }) {
  const [date, setDate] = useState(entry.termin_datum); const [customer, setCustomer] = useState(entry.kunde); const [studio, setStudio] = useState(entry.studio);
  const [reason, setReason] = useState<DepositExemptionReason | "">(entry.deposit_exemption_reason ?? ""); const [deposit, setDeposit] = useState(String(entry.anzahlung_vorgemerkt)); const [depositMethod, setDepositMethod] = useState(entry.anzahlung_method ?? "Überweisung"); const [depositDate, setDepositDate] = useState(entry.anzahlung_datum ?? "");
  const [onsite, setOnsite] = useState(String(entry.restbetrag_vorgemerkt)); const [onsiteMethod, setOnsiteMethod] = useState(entry.restzahlung_method ?? "Bar"); const [onsiteDate, setOnsiteDate] = useState(entry.bar_datum ?? ""); const [note, setNote] = useState(entry.notiz ?? ""); const [saving, setSaving] = useState(false); const hasExemption = Boolean(reason);
  async function save() { setSaving(true); try { await onSave({ id: entry.id, studio: studio.trim(), datum: date, kunde: customer.trim(), anzahlung: hasExemption ? 0 : Number(deposit.replace(",", ".")) || 0, anzahlung_method: hasExemption ? null : depositMethod || null, anzahlung_datum: hasExemption ? null : depositDate || null, deposit_exemption_reason: reason || null, bar: Number(onsite.replace(",", ".")) || 0, restzahlung_method: Number(onsite.replace(",", ".")) > 0 ? onsiteMethod || null : null, restzahlung_datum: Number(onsite.replace(",", ".")) > 0 ? onsiteDate || null : null, notiz: note.trim() || null }); } finally { setSaving(false); } }
  return <div className="fixed inset-0 z-[100] bg-black/80 grid place-items-center p-3"><div className="bg-card border border-champagne/40 max-w-2xl w-full p-4 md:p-6 max-h-[92vh] overflow-y-auto"><div className="flex justify-between mb-5"><div><div className="eyebrow">Kassenbuch-Eintrag bearbeiten</div><h3 className="font-display text-2xl">{entry.kunde}</h3></div><button onClick={onClose}><X /></button></div><div className="grid md:grid-cols-2 gap-4"><Field label="Datum"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="luxe-input" /></Field><Field label="Kunde"><input value={customer} onChange={e => setCustomer(e.target.value)} className="luxe-input" /></Field><Field label="Studio"><input value={studio} onChange={e => setStudio(e.target.value)} className="luxe-input" /></Field><Field label="Anzahlungsregel"><select value={reason} onChange={e => { const v = e.target.value as DepositExemptionReason | ""; setReason(v); if (v) { setDeposit("0"); setDepositDate(""); } }} className="luxe-input"><option value="">Normale Anzahlung</option><option value="regular_customer">Keine Anzahlung – Stammkunde</option><option value="trust">Keine Anzahlung – Vertrauensbasis</option><option value="exception">Keine Anzahlung – Ausnahme</option><option value="colleague_guarantees">Keine Anzahlung – Kollegin bürgt</option><option value="spontaneous">Keine Anzahlung – Spontaner Termin</option></select></Field><Field label="Anzahlung Betrag (€)"><input disabled={hasExemption} value={deposit} onChange={e => setDeposit(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Anzahlung erhalten am"><input disabled={hasExemption} type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} className="luxe-input disabled:opacity-40" /></Field><Field label="Anzahlungsmethode"><select disabled={hasExemption} value={depositMethod} onChange={e => setDepositMethod(e.target.value)} className="luxe-input disabled:opacity-40"><option value="">Auswählen</option>{PAYMENT_METHODS.map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Vor Ort Betrag (€)"><input value={onsite} onChange={e => setOnsite(e.target.value)} className="luxe-input" /></Field><Field label="Vor Ort erhalten am"><input type="date" value={onsiteDate} onChange={e => setOnsiteDate(e.target.value)} className="luxe-input" /></Field><Field label="Vor Ort Zahlungsmethode"><select value={onsiteMethod} onChange={e => setOnsiteMethod(e.target.value)} className="luxe-input"><option value="">Auswählen</option>{PAYMENT_METHODS.map(v => <option key={v}>{v}</option>)}</select></Field><div className="md:col-span-2"><Field label="Notiz"><input value={note} onChange={e => setNote(e.target.value)} className="luxe-input" /></Field></div></div><div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="export-btn">Abbrechen</button><button onClick={save} disabled={saving || !date || !customer.trim() || !studio.trim() || (Number(onsite.replace(",", ".")) > 0 && !onsiteMethod)} className="btn-gold inline-flex gap-2"><Save size={15} />{saving ? "Speichere…" : "Änderung speichern"}</button></div></div></div>;
}

function Stat({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) { return <div className="bg-card border border-champagne/20 p-3 md:p-4"><div className="text-[10px] uppercase tracking-widest text-vanilla/45">{label}</div><div className={`text-lg md:text-xl mt-1 ${gold ? "text-champagne" : "text-vanilla"}`}>{value}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">{label}</span>{children}</label>; }
