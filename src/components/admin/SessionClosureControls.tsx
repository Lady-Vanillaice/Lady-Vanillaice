import { useState } from "react";
import { getCustomerSessionHistory, saveCustomerSession } from "@/lib/customer-session.functions";
import type { CustomerSession } from "@/lib/customer-session.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { completeBookingSession, saveBookingSessionCrm } from "@/lib/booking-session-closure.functions";
import { updateBookingOnsitePayment } from "@/lib/rest-payment.functions";

export function SessionClosureControls({ bookingId, completed, reportDecision, amount = 0, paidAt, crmNotes = "", guestEmail, sessionStart, sessionPlace }: {
  bookingId: string;
  completed: boolean;
  reportDecision?: string;
  amount?: number;
  paidAt?: string | null;
  crmNotes?: string;
  guestEmail?: string | null;
  sessionStart?: string;
  sessionPlace?: string | null;
}) {
  const qc = useQueryClient();
  const savePayment = useServerFn(updateBookingOnsitePayment);
  const saveCrm = useServerFn(saveBookingSessionCrm);
  const loadHistory = useServerFn(getCustomerSessionHistory);
  const saveSession = useServerFn(saveCustomerSession);
  const complete = useServerFn(completeBookingSession);
  const [value, setValue] = useState(String(amount));
  const [date, setDate] = useState(paidAt ? paidAt.slice(0, 10) : new Date().toLocaleDateString("sv-SE"));
  const [method, setMethod] = useState("Bar");
  const [paymentSaved, setPaymentSaved] = useState(Boolean(paidAt));
  const [notes, setNotes] = useState(crmNotes);
  const [crmSaved, setCrmSaved] = useState(Boolean(crmNotes));
  const [crmOpen, setCrmOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [crmLoaded, setCrmLoaded] = useState(false);
  const [crmLoading, setCrmLoading] = useState(false);
  const [session, setSession] = useState<CustomerSession>({
    id: bookingId, bookingId, date: sessionStart ? new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(sessionStart)) : new Date().toISOString().slice(0,10),
    time: sessionStart ? new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(sessionStart)) : "",
    place: sessionPlace ?? "", room:"", activities:crmNotes, liked:"", disliked:"", nextTime:"", notes:"",
  });
  const fields = [["room","Raum",200],["activities","Ablauf",6000],["liked","Was kam gut an?",3000],["disliked","Grenzen / Abneigungen",3000],["nextTime","Nächstes Mal",3000],["notes","Weitere Notizen",6000]] as const;
  const toggleCrm = async () => {
    setCrmOpen(!crmOpen);
    if (crmOpen || crmLoaded || !guestEmail) return;
    setCrmLoading(true);
    try {
      const result = await loadHistory({data:{email:guestEmail}});
      const existing = result.sessions.find(item => item.bookingId === bookingId);
      if (existing) { setSession(existing); setNotes(existing.activities); setCrmSaved(Boolean(existing.activities)); }
      setCrmLoaded(true);
    } finally { setCrmLoading(false); }
  };
  const payment = useMutation({
    mutationFn: () => savePayment({ data: { id: bookingId, amount: Number(value), method, paid_at: date } }),
    onSuccess: async () => {
      setPaymentSaved(true);
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-terminplan"] }), qc.invalidateQueries({ queryKey: ["cashbook"] })]);
    },
  });
  const crm = useMutation({
    mutationFn: async () => {
      if (!guestEmail) throw new Error("Kunden-E-Mail fehlt.");
      if (!session.activities.trim()) throw new Error("Bitte den Ablauf ausfüllen.");
      await saveSession({data:{email:guestEmail,entry:session}});
      await saveCrm({data:{bookingId,crmNotes:session.activities}});
      setNotes(session.activities);
    },
    onSuccess: () => setCrmSaved(true),
  });
  const finish = useMutation({
    mutationFn: (decision: "sent" | "skipped") => complete({ data: { bookingId, crmNotes: notes, reportDecision: decision } }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["booking-session-closures"] }),
  });
  if (completed) return <p className="mt-3 text-xs text-red-200">✓ Abgeschlossen · CRM gespeichert · Erfahrungsbericht {reportDecision === "sent" ? "vorhanden" : "übersprungen"}</p>;
  return <div className="mt-4 border-t border-champagne/20 pt-3">
    <button type="button" aria-expanded={closingOpen} onClick={() => setClosingOpen(open => !open)} className="btn-outline-gold !py-2 !px-3 !text-xs">Session abschließen {closingOpen ? "▲" : "▼"}</button>
    {closingOpen && <div className="mt-4 space-y-5">
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
      <button type="button" onClick={() => void toggleCrm()} className="btn-outline-gold !py-2 !px-3 !text-xs">2. CRM / Session-Dokumentation {crmOpen ? "▲" : "▼"}</button>
      {crmOpen && <div className="space-y-3">
        {crmLoading && <p className="text-xs">Kundenakte wird geladen…</p>}
        {fields.map(([key,label,max]) => <label key={key} className="block text-xs text-vanilla/80">{label}<textarea rows={key === "activities" ? 4 : 2} maxLength={max} value={session[key]} onChange={e => {setSession({...session,[key]:e.target.value});setCrmSaved(false);}} className="mt-1 w-full bg-background border border-champagne/30 p-3 text-vanilla" /></label>)}
        <button type="button" disabled={!paymentSaved || !guestEmail || crmLoading || !session.activities.trim() || crm.isPending} onClick={() => crm.mutate()} className="btn-outline-gold !py-2 !px-3 !text-xs disabled:opacity-40">{crm.isPending ? "Speichert…" : crmSaved ? "✓ CRM gespeichert" : "CRM speichern"}</button>
      </div>}
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
    </div>}
  </div>;
}
