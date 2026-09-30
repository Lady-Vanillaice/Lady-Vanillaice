import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBookingRestTime, saveBookingRestTime } from "@/lib/booking-rest-time.functions";

export function BookingRestTime({ bookingId, startsAt, durationMinutes }: { bookingId: string; startsAt: string | null; durationMinutes: number }) {
  const load = useServerFn(getBookingRestTime);
  const save = useServerFn(saveBookingRestTime);
  const qc = useQueryClient();
  const queryKey = ["booking-rest-time", bookingId];
  const query = useQuery({ queryKey, gcTime: 0, queryFn: () => load({ data: { id: bookingId } }) });
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? String(query.data ?? 0);
  const minutes = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(minutes) && minutes >= 0 && minutes <= 1440;
  const mutation = useMutation({
    mutationFn: () => save({ data: { id: bookingId, minutes } }),
    onSuccess: saved => { qc.setQueryData(queryKey, saved); setDraft(null); },
  });
  const start = startsAt && durationMinutes > 0 ? new Date(new Date(startsAt).getTime() + durationMinutes * 60000) : null;
  const end = start && valid ? new Date(start.getTime() + minutes * 60000) : null;
  const display = (date: Date) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  return <div className="mt-4 border-t border-champagne/20 pt-4 space-y-2">
    <label className="block text-sm">Liegezeit nach der Session (Minuten)
      <input type="number" min={0} max={1440} step={1} value={value} disabled={query.isPending || query.isError || mutation.isPending} onChange={e => { setDraft(e.target.value); mutation.reset(); }} className="input-luxe w-full mt-1" />
    </label>
    <p className="text-xs text-vanilla/55">Darf sich mit anderen Gästen überschneiden. 0 Minuten bedeutet keine Liegezeit.</p>
    {start && end && Number.isFinite(start.getTime()) && minutes > 0 && <p className="text-sm text-champagne">Eingeplante Liegezeit: {display(start)} – {display(end)} Uhr</p>}
    {query.isPending ? <p role="status" className="text-xs">Liegezeit wird geladen…</p> : query.isError ? <div role="alert" className="text-sm text-bordeaux">Liegezeit konnte nicht geladen werden. <button type="button" onClick={() => query.refetch()} className="underline">Erneut versuchen</button></div> : <button type="button" className="btn-outline-gold" disabled={!valid || draft === null || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Speichere…" : "Liegezeit speichern"}</button>}
    {mutation.isSuccess && <p role="status" className="text-xs text-champagne">Liegezeit gespeichert.</p>}
    {mutation.isError && <p role="alert" className="text-sm text-bordeaux">{mutation.error.message}</p>}
  </div>;
}
