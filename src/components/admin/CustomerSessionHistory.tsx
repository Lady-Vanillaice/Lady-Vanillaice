import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCustomerSessionHistory, saveCustomerSession } from "@/lib/customer-session.functions";
import type { CustomerSession } from "@/lib/customer-session.schema";

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateLabel = (date: string) => date ? date.split("-").reverse().join(".") : "Datum nicht hinterlegt";
const statusLabel: Record<string, string> = { confirmed: "Bestätigt", cancelled: "Abgesagt", rescheduling: "Wird verschoben", pending: "Anfrage", waiting_deposit: "Reserviert", declined: "Abgelehnt" };
const fields = [
  ["activities", "Ablauf – was haben wir gemacht?", 6000],
  ["liked", "Was kam gut an?", 3000],
  ["disliked", "Was mochte er nicht / welche Grenzen sind wichtig?", 3000],
  ["nextTime", "Für die nächste Session merken", 3000],
  ["notes", "Weitere persönliche Notizen", 6000],
] as const;
function newEntry(booking?: { id: string; date: string; time: string; place: string }): CustomerSession {
  return { id: booking?.id ?? crypto.randomUUID(), bookingId: booking?.id ?? null,
    date: booking?.date || today(), time: booking?.time || "", place: booking?.place || "",
    activities: "", liked: "", disliked: "", nextTime: "", notes: "" };
}

export function CustomerSessionHistory({ email }: { email: string }) {
  const load = useServerFn(getCustomerSessionHistory);
  const save = useServerFn(saveCustomerSession);
  const qc = useQueryClient();
  const queryKey = ["admin-customer-sessions", email.toLowerCase()];
  const query = useQuery({ queryKey, queryFn: () => load({ data: { email } }), gcTime: 0 });
  const [draft, setDraft] = useState<CustomerSession | null>(null);
  const [search, setSearch] = useState("");
  const [savedMessage, setSavedMessage] = useState(false);
  const mutation = useMutation({
    mutationFn: (entry: CustomerSession) => save({ data: { email, entry } }),
    onSuccess: async () => { setDraft(null); setSavedMessage(true); await qc.invalidateQueries({ queryKey }); },
  });
  const sessions = query.data?.sessions ?? [];
  const bookings = query.data?.bookings ?? [];
  const notedBookings = new Set(sessions.flatMap(entry => entry.bookingId ? [entry.bookingId] : []));
  const history = [
    ...sessions.map(entry => ({ id: entry.id, date: entry.date, time: entry.time, place: entry.place,
      entry, booking: bookings.find(booking => booking.id === entry.bookingId) })),
    ...bookings.filter(booking => !notedBookings.has(booking.id)).map(booking => ({ ...booking, entry: null, booking })),
  ].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  const needle = search.trim().toLocaleLowerCase("de-DE");
  const filtered = history.filter(item => [dateLabel(item.date), item.place, ...fields.map(([key]) => item.entry?.[key] ?? "")].join(" ").toLocaleLowerCase("de-DE").includes(needle));
  const edit = (entry: CustomerSession) => { mutation.reset(); setSavedMessage(false); setDraft(entry); };

  return (
    <section className="border border-champagne/25 bg-anthracite/20 p-4 sm:p-5 space-y-4" aria-label="Private Session-Historie">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="font-display text-2xl text-champagne">Session-Historie</h2>
          <p className="text-sm text-vanilla/60 mt-1">Private Notizen pro Termin. Nur im Adminbereich sichtbar.</p>
        </div>
        <button type="button" className="btn-outline-gold !text-sm !tracking-normal !py-2 !px-3" disabled={!!draft || query.isPending || query.isError} onClick={() => edit(newEntry())}>Session nachtragen</button>
      </div>
      {query.isPending && <p role="status" className="text-sm">Historie wird geladen…</p>}
      {query.isError && <div role="alert"><p className="text-sm text-bordeaux">{query.error.message}</p><button type="button" className="btn-outline-gold mt-2" onClick={() => query.refetch()}>Erneut laden</button></div>}
      {savedMessage && <p role="status" className="text-sm text-champagne">Session-Notizen gespeichert.</p>}
      {draft && (
        <form className="border border-champagne/20 p-4 space-y-4" onSubmit={event => { event.preventDefault(); mutation.mutate(draft); }}>
          <h3 className="text-lg text-vanilla">Session-Notizen bearbeiten</h3>
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm">Datum<input required type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} className="input-luxe mt-1 min-w-0 w-full" /></label>
              <label className="block text-sm">Uhrzeit (optional)<input type="time" value={draft.time} onChange={event => setDraft({ ...draft, time: event.target.value })} className="input-luxe mt-1 min-w-0 w-full" /></label>
            </div>
            <label className="block text-sm">Ort / Studio (nur intern)<input value={draft.place} maxLength={300} onChange={event => setDraft({ ...draft, place: event.target.value })} className="input-luxe mt-1 w-full" /></label>
            {fields.map(([key, label, max]) => <label key={key} className="block text-sm">{label}<textarea rows={key === "activities" ? 4 : 3} value={draft[key]} maxLength={max} onChange={event => setDraft({ ...draft, [key]: event.target.value })} className="input-luxe mt-1 w-full" /></label>)}
          </fieldset>
          {mutation.isError && <p role="alert" className="text-sm text-bordeaux">{mutation.error.message}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={mutation.isPending} className="btn-gold !text-sm !tracking-normal !py-2 !px-3">{mutation.isPending ? "Speichere…" : "Session speichern"}</button>
            <button type="button" disabled={mutation.isPending} onClick={() => { setDraft(null); mutation.reset(); }} className="btn-outline-gold !text-sm !tracking-normal !py-2 !px-3">Abbrechen</button>
          </div>
        </form>
      )}
      {query.isSuccess && <>
        {history.length > 0 && <label className="block text-sm">Historie durchsuchen<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Datum, Ort oder Stichwort" className="input-luxe mt-1 w-full" /></label>}
        {filtered.length === 0 && <p className="text-sm text-vanilla/60">{history.length ? "Keine passenden Einträge." : "Noch keine Termine oder Notizen hinterlegt. Du kannst auch frühere Sessions nachtragen."}</p>}
        <div className="space-y-3">
          {filtered.map(item => <article key={item.id} className="border-l-2 border-champagne/40 pl-4 py-2">
            <div className="flex flex-wrap justify-between gap-3">
              <div><h3 className="text-base text-champagne">{dateLabel(item.date)}{item.time ? ` · ${item.time} Uhr` : ""}</h3>
                {item.place && <p className="text-sm text-vanilla/75 whitespace-pre-wrap break-words">{item.place}</p>}
                <p className="text-sm text-vanilla/50">{item.booking ? statusLabel[item.booking.status] ?? item.booking.status : "Nachgetragene Session"}</p>
              </div>
              <div className="flex flex-wrap gap-3 items-start text-sm">
                {item.booking && <Link to="/admin/buchung/$id" params={{ id: item.booking.id }} className="text-champagne underline">Buchung öffnen</Link>}
                <button type="button" disabled={!!draft} className="text-champagne underline disabled:opacity-40" onClick={() => edit(item.entry ?? newEntry(item.booking))}>{item.entry ? "Notizen bearbeiten" : "Notizen eintragen"}</button>
              </div>
            </div>
            {item.entry ? <dl className="space-y-2 mt-3">
              {fields.map(([key, label]) => item.entry?.[key] ? <div key={key}><dt className="text-sm text-vanilla/55">{label}</dt><dd className="text-sm text-vanilla/90 whitespace-pre-wrap break-words mt-0.5">{item.entry[key]}</dd></div> : null)}
              {!fields.some(([key]) => item.entry?.[key]) && <p className="text-sm text-vanilla/50">Noch keine Session-Notizen.</p>}
            </dl> : <p className="text-sm text-vanilla/50 mt-2">Noch keine Session-Notizen.</p>}
          </article>)}
        </div>
      </>}
    </section>
  );
}
