import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import type { ManualBookingValues } from "@/components/admin/admin-shared";

function berlinWallTimeToDate(day: string, time: string, nextDay = false) {
  const [year, month, datePart] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallTime = Date.UTC(year, month - 1, datePart + (nextDay ? 1 : 0), hour, minute);
  let candidate = new Date(wallTime);

  const getOffset = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const representedAsUtc = Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
      value("second"),
    );
    return representedAsUtc - date.getTime();
  };

  candidate = new Date(wallTime - getOffset(candidate));
  candidate = new Date(wallTime - getOffset(candidate));
  return candidate;
}

export function CustomContentForm({
  onCreate,
  pending,
  studios = [],
}: {
  onCreate: (values: ManualBookingValues) => Promise<unknown>;
  pending: boolean;
  studios?: Array<{ id: string; name: string; address: string }>;
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [location, setLocation] = useState("Studio60, Gärtnerstraße 60, 80992 München");
  const [guestName, setGuestName] = useState("");
  const [contact, setContact] = useState("");
  const [wish, setWish] = useState("");
  const [note, setNote] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Überweisung");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const total = Number(totalAmount.replace(",", "."));
    const paid = Number(paidAmount.replace(",", "."));
    if (!date || !guestName.trim() || !wish.trim()) {
      setError("Bitte Datum, Kunde und den gewünschten Inhalt eintragen.");
      return;
    }
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(paid) || paid < 0 || paid > total) {
      setError("Bitte Gesamtpreis und bereits gezahlten Betrag korrekt eintragen.");
      return;
    }
    if (paid > 0 && (!paymentMethod.trim() || !paidAt)) {
      setError("Bitte Zahlungsart und Zahlungsdatum angeben.");
      return;
    }

    const startsAt = berlinWallTimeToDate(date, start);
    const endsAt = berlinWallTimeToDate(date, end, end <= start);

    try {
      await onCreate({
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        location,
        guest_name: guestName.trim(),
        guest_contact: contact.trim() || null,
        source: "Custom Content",
        internal_note: note.trim() || null,
        preferences: wish.trim(),
        taboos: null,
        health_notes: null,
        booking_type: "custom_content",
        duo_partner: null,
        total_amount: total,
        deposit_amount: paid,
        deposit_method: paid > 0 ? paymentMethod.trim() : null,
        deposit_paid_at: paid > 0 ? paidAt : null,
        deposit_exemption_reason: null,
      });

      setSuccess(true);
      setDate("");
      setGuestName("");
      setContact("");
      setWish("");
      setNote("");
      setTotalAmount("");
      setPaidAmount("0");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Custom Content konnte nicht gespeichert werden.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="eyebrow block mb-1">Datum</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Von</label>
          <input type="time" required value={start} onChange={(e) => setStart(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Bis</label>
          <input type="time" required value={end} onChange={(e) => setEnd(e.target.value)} className="input-luxe !py-2" />
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-1">Studio</label>
        <select value={location} onChange={(e) => setLocation(e.target.value)} className="input-luxe !py-2">
          {studios.map((studio) => (
            <option key={studio.id} value={`${studio.name}, ${studio.address}`}>
              {studio.name} · {studio.address}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="eyebrow block mb-1">Kunde / Pseudonym</label>
          <input required value={guestName} onChange={(e) => setGuestName(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Kontakt (optional)</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} className="input-luxe !py-2" placeholder="E-Mail, Telegram oder Telefon" />
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-1">Was möchte der Kunde?</label>
        <textarea required value={wish} onChange={(e) => setWish(e.target.value)} className="input-luxe min-h-28" placeholder="Inhalt, Outfit, Praktiken, Ablauf, besondere Wünsche …" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="eyebrow block mb-1">Gesamtpreis (€)</label>
          <input inputMode="decimal" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Bereits gezahlt (€)</label>
          <input inputMode="decimal" required value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="input-luxe !py-2" />
        </div>
      </div>

      {Number(paidAmount.replace(",", ".")) > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="eyebrow block mb-1">Zahlungsart</label>
            <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-luxe !py-2" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Bezahlt am</label>
            <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="input-luxe !py-2" />
          </div>
        </div>
      )}

      <div>
        <label className="eyebrow block mb-1">Interne Notiz (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input-luxe min-h-20" />
      </div>

      <p className="text-xs text-vanilla/50">
        Der Termin erscheint automatisch im Terminplan. Zahlungen werden im Kassenbuch als Custom Content geführt.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-300">Custom Content wurde eingetragen.</p>}
      <button type="submit" disabled={pending} className="btn-gold w-full !py-3">
        <CalendarPlus size={14} /> Custom Content speichern
      </button>
    </form>
  );
}
