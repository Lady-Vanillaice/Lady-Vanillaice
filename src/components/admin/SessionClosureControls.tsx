import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { completeBookingSession, saveBookingSessionCrm } from "@/lib/booking-session-closure.functions";
import { updateBookingOnsitePayment } from "@/lib/rest-payment.functions";

export function SessionClosureControls({ bookingId, completed, reportDecision, amount = 0, paidAt, crmNotes = "" }: {
  bookingId: string;
  completed: boolean;
  reportDecision?: string;
  amount?: number;
  paidAt?: string | null;
  crmNotes?: string;
}) {
  const qc = useQueryClient();
  const savePayment = useServerFn(updateBookingOnsitePayment);
  const saveCrm = useServerFn(saveBookingSessionCrm);
  const complete = useServerFn(completeBookingSession);
  const [value, setValue] = useState(String(amount));
  const [date, setDate] = useState(paidAt ? paidAt.slice(0, 10) : new Date().toLocaleDateString("sv-SE"));
  const [method, setMethod] = useState("Bar");
  const [paymentSaved, setPaymentSaved] = useState(Boolean(paidAt));
  const [notes, setNotes] = useState(crmNotes);
  const [crmSaved, setCrmSaved] = useState(Boolean(crmNotes));
  const payment = useMutation({
    mutationFn: () => savePayment({ data: { id: bookingId, amount: Number(value), method, paid_at: date } }),
    onSuccess: async () => {
      setPaymentSaved(true);
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-terminplan"] }), qc.invalidateQueries({ queryKey: ["cashbook"] })]);
    },
  });
  const crm = useMutation({
    mutationFn: () => saveCrm({ data: { bookingId, crmNotes: notes } }),
    onSuccess: () => setCrmSaved(true),
  });
  const finish = useMutation({
    mutationFn: (decision: "sent" | "skipped") => complete({ data: { bookingId, crmNotes: notes, reportDecision: decision } }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["booking-session-closures"] }),
  });
  if (completed) return <p className="mt-3 text-xs text-red-200">✓ Abgeschlossen · CRM gespeichert · Erfahrungsbericht {reportDecision === "sent" ? "vorhanden" : "übersprungen"}</p>;
  return <div className="mt-4 border-t border-champagne/20 pt-4 space-y-5">
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-champagne">1. Restzahlung</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-xs text-vanilla/70">Betrag (€)<input type="number" min="0" step="0.01" value={value} onChange={e => { setValue(e.target.value); setPaymentSaved(false); }} className="mt-1 w-full bg-background border border-champagne/30 p-2 text-vanilla" /></label>
        <label className="text-xs text-vanilla/70">Bezahlt am<input type="date" value={date} onChange={e => { setDate(e.target.value); setPaymentSaved(false); }} className="mt-1 w-full bg-background border border-champagne/30 p-2 text-vanilla" /></label>
        <label className="text-xs text-vanilla/70">Zahlungsart<select value={method} onChange={e => { setMethod(e.target.value); setPaymentSaved(false); }} className="mt-1 w-full bg-background border border-champagne/30 p-2 text-vanilla"><option>Bar</option><option>Überweisung</option><option>PayPal</option><option>EC-Karte</option><option>Sonstige</option></select></label>
      </div>
      <button type="button" disabled={payment.isPending || !date || value === "" || Number(value) < 0} onClick={() => payment.mutate()} className="btn-outline-gold !py-2 !px-3 !text-xs">{payment.isPending ? "Speichert…" : paymentSaved ? "✓ Restzahlung gespeichert" : "Restzahlung speichern"}</button>
      {payment.isError && <p className="text-xs text-red-300">{String(payment.error)}</p>}
    </div>
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-champagne">2. CRM / Session-Dokumentation</h3>
      <label className="block text-xs text-vanilla/80" htmlFor={`session-crm-${bookingId}`}>Was wurde in der Session gemacht?</label>
      <textarea id={`session-crm-${bookingId}`} rows={4} maxLength={6000} value={notes} onChange={e => { setNotes(e.target.value); setCrmSaved(false); }} className="w-full bg-background border border-champagne/30 p-3 text-vanilla" />
      <button type="button" disabled={!paymentSaved || !notes.trim() || crm.isPending} onClick={() => crm.mutate()} className="btn-outline-gold !py-2 !px-3 !text-xs disabled:opacity-40">{crm.isPending ? "Speichert…" : crmSaved ? "✓ CRM gespeichert" : "CRM speichern"}</button>
      {crm.isError && <p className="text-xs text-red-300">{String(crm.error)}</p>}
    </div>
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-champagne">3. Erfahrungsbericht</h3>
      <p className="text-xs text-vanilla/60">Erfahrungsbericht freiwillig. Nach deiner Auswahl wird die Session abgeschlossen.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!crmSaved || finish.isPending} onClick={() => finish.mutate("sent")} className="btn-outline-gold !py-2 !px-3 !text-xs disabled:opacity-40">Bericht vorhanden – abschließen</button>
        <button type="button" disabled={!crmSaved || finish.isPending} onClick={() => finish.mutate("skipped")} className="btn-outline-gold !py-2 !px-3 !text-xs disabled:opacity-40">Ohne Bericht abschließen</button>
      </div>
      {finish.isError && <p className="text-xs text-red-300">{String(finish.error)}</p>}
    </div>
  </div>;
}
