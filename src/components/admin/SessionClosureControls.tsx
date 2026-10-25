import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { completeBookingSession } from "@/lib/booking-session-closure.functions";

export function SessionClosureControls({ bookingId, completed, reportDecision }: {
  bookingId: string;
  completed: boolean;
  reportDecision?: string;
}) {
  const qc = useQueryClient();
  const complete = useServerFn(completeBookingSession);
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (reportDecision: "sent" | "skipped") =>
      complete({ data: { bookingId, crmNotes: notes, reportDecision } }),
    onSuccess: async () => {
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["booking-session-closures"] });
    },
  });
  if (completed) return <p className="mt-3 text-xs text-red-200">✓ Erledigt · CRM gespeichert · Erfahrungsbericht {reportDecision === "sent" ? "vorhanden" : "übersprungen"}</p>;
  return <div className="mt-3 border-t border-champagne/20 pt-3 space-y-3">
    <button type="button" className="btn-outline-gold !py-2 !px-3 !text-xs" onClick={() => setOpen(value => !value)}>CRM / Session-Dokumentation</button>
    {open && <>
      <label className="block text-xs text-vanilla/80" htmlFor={`session-crm-${bookingId}`}>Was wurde heute in der Session gemacht? (Pflicht)</label>
      <textarea id={`session-crm-${bookingId}`} rows={4} maxLength={6000} value={notes} onChange={event => setNotes(event.target.value)} className="w-full bg-background border border-champagne/30 p-3 text-vanilla" />
      <p className="text-xs text-vanilla/60">Restzahlung vorher im Buchungsdetail erfassen. Erfahrungsbericht freiwillig.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!notes.trim() || mutation.isPending} className="btn-outline-gold !py-2 !px-3 !text-xs disabled:opacity-40" onClick={() => mutation.mutate("sent")}>Mit Erfahrungsbericht abschließen</button>
        <button type="button" disabled={!notes.trim() || mutation.isPending} className="btn-outline-gold !py-2 !px-3 !text-xs disabled:opacity-40" onClick={() => mutation.mutate("skipped")}>Ohne Erfahrungsbericht abschließen</button>
      </div>
      {mutation.isError && <p role="alert" className="text-xs text-red-300">{mutation.error instanceof Error ? mutation.error.message : "Abschluss fehlgeschlagen."}</p>}
    </>}
  </div>;
}
