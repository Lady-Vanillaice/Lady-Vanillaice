import { useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import type { ManualBookingValues } from "@/components/admin/admin-shared";
import { DEFAULT_STUDIOS, type StudioOption } from "@/lib/studio.functions";

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
  studios,
}: {
  onCreate: (values: ManualBookingValues) => Promise<unknown>;
  pending: boolean;
  studios?: StudioOption[];
}) {
  const availableStudios = useMemo(
    () => (studios && studios.length > 0 ? studios : DEFAULT_STUDIOS),
    [studios],
  );
  const defaultLocation = `${availableStudios[0]?.name ?? "Studio60"}, ${availableStudios[0]?.address ?? "Gärtnerstraße 60, 80992 München"}`;

  const [date, setDate] = useState("");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [location, setLocation] = useState(defaultLocation);
  const [guestName, setGuestName] = useState("");
  const [contact, setContact] = useState("");
  const [wish, setWish] = useState("");
  const [note, setNote] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Überweisung");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const total = Number(totalAmount.replace(",", "."));
    if (!date || !guestName.trim() || !wish.trim()) {
      setError("Bitte Datum, Kunde und den gewünschten Inhalt eintragen.");
      return;
    }
    if (!Number.isFinite(total) || total <= 0) {
      setError("Bitte den vollständig vorausbezahlten Gesamtpreis eintragen.");
      return;
    }
    if (!paymentMethod.trim() || !paidAt) {
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
        deposit_amount: total,
        deposit_method: paymentMethod.trim(),
        deposit_paid_at: paidAt,
        deposit_exemption_reason: null,
      });

      setSuccess(true);
      setDate("");
      setGuestName("");
      setContact("");
      setWish("");
      setNote("");
      setTotalAmount("");
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
          {availableStudios.map((studio) => (
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

      <div>
        <label className="eyebrow block mb-1">Vollständig gezahlter Gesamtpreis (€)</label>
        <input inputMode="decimal" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="input-luxe !py-2" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="eyebrow block mb-1">Zahlungsart</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-luxe !py-2">
            <option value="Überweisung">Überweisung</option>
            <option value="PayPal">PayPal</option>
            <option value="Bar">Bar</option>
            <option value="Kreditkarte">Kreditkarte</option>
            <option value="Sonstiges">Sonstiges</option>
          </select>
        </div>
        <div>
          <label className="eyebrow block mb-1">Bezahlt am</label>
          <input type="date" required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="input-luxe !py-2" />
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-1">Interne Notiz (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input-luxe min-h-20" />
      </div>

      <p className="text-xs text-vanilla/50">
        Der vollständige Betrag wird als vorausbezahlt gespeichert. Der Termin erscheint im Terminplan und im Kassenbuch als Custom Content.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-300">Custom Content wurde eingetragen.</p>}
      <button type="submit" disabled={pending} className="btn-gold w-full !py-3">
        <CalendarPlus size={14} /> Custom Content speichern
      </button>
    </form>
  );
}
