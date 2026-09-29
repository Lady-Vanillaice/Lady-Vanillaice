import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPrivateBookingLocation, savePrivateBookingLocation } from "@/lib/private-booking-location.functions";
import type { PrivateBookingLocation as Location } from "@/lib/private-booking-location.schema";

const empty: Location = { mode: "studio", name: "", address: "", notes: "" };

export function PrivateBookingLocation({ bookingId, children, studioPending = false }: { bookingId: string; children: ReactNode; studioPending?: boolean }) {
  const load = useServerFn(getPrivateBookingLocation);
  const save = useServerFn(savePrivateBookingLocation);
  const qc = useQueryClient();
  const queryKey = ["private-booking-location", bookingId];
  const query = useQuery({ queryKey, gcTime: 0, queryFn: () => load({ data: { id: bookingId } }) });
  const [draft, setDraft] = useState<Location | null>(null);
  const location = draft ?? query.data ?? empty;
  const mutation = useMutation({
    mutationFn: (value: Location) => save({ data: { id: bookingId, location: value } }),
    onSuccess: (saved) => { qc.setQueryData(queryKey, saved); setDraft(null); },
  });
  const edit = (field: keyof Location, value: string) => {
    mutation.reset();
    setDraft({ ...location, [field]: value });
  };
  return (
    <section className="bg-card border border-champagne/15 p-6 mb-6" aria-labelledby="private-location-title">
      <h2 id="private-location-title" className="text-base text-champagne mb-2">Terminort für diese Buchung</h2>
      {query.isPending ? <p role="status">Private Angaben werden geladen…</p> : query.isError ? (
        <div role="alert"><p>Die privaten Angaben konnten nicht geladen werden.</p><button type="button" onClick={() => query.refetch()} className="btn-outline-gold mt-2">Erneut versuchen</button></div>
      ) : (
        <div className="space-y-3">
          <fieldset disabled={mutation.isPending || studioPending} className="space-y-3">
            <legend className="text-sm mb-2">Studio oder privater Terminort</legend>
            <div className="flex flex-wrap gap-4">
              {([['studio', 'Studio'], ['private', 'Privater Terminort']] as const).map(([mode, label]) => (
                <label key={mode} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={`venue-${bookingId}`} value={mode} checked={location.mode === mode} onChange={() => mutation.mutate({ ...location, mode })} />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-xs text-vanilla/65">Die Ortsauswahl wird automatisch gespeichert und für das Fahrtenbuch verwendet.</p>
          </fieldset>
          {location.mode === "studio" ? <fieldset disabled={mutation.isPending}>{children}</fieldset> : <>
          <p className="text-sm text-vanilla/65">Private Angaben sind nur im Adminbereich sichtbar. Beim Fahrtenbuch-Export wird die Adresse zur Kilometerberechnung an den Kartendienst übermittelt, private Notizen werden nicht übertragen.</p>
          <fieldset disabled={mutation.isPending} className="space-y-3">
            <label className="block text-sm">Ort / Hotel (optional)
              <input className="luxe-input mt-1 w-full" value={location.name} maxLength={120} onChange={(e) => edit("name", e.target.value)} autoComplete="off" />
            </label>
            <label className="block text-sm">Private Adresse für die Fahrt
              <textarea className="luxe-input mt-1 w-full" rows={2} value={location.address} maxLength={300} onChange={(e) => edit("address", e.target.value)} placeholder="Straße, Hausnummer, PLZ und Ort" autoComplete="off" />
            </label>
            <label className="block text-sm">Private Notizen (z. B. Zimmernummer)
              <textarea className="luxe-input mt-1 w-full" rows={3} value={location.notes} maxLength={4000} onChange={(e) => edit("notes", e.target.value)} autoComplete="off" />
            </label>
          </fieldset>
          <button type="button" className="btn-outline-gold" disabled={mutation.isPending || draft === null} onClick={() => mutation.mutate(location)}>
            {mutation.isPending ? "Speichere…" : "Private Angaben speichern"}
          </button>
          </>}
          {mutation.isSuccess && <p className="text-sm text-champagne" role="status">Terminort gespeichert.</p>}
          {mutation.isError && <p className="text-sm text-bordeaux" role="alert">{mutation.error.message}</p>}
        </div>
      )}
    </section>
  );
}
