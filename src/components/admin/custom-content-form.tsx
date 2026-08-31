import { useMemo, useState } from "react";
import { CalendarPlus, CreditCard } from "lucide-react";
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
  const [imageCount, setImageCount] = useState("");
  const [videoMinutes, setVideoMinutes] = useState("");
  const [note, setNote] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Überweisung");
  const [isPaid, setIsPaid] = useState(true);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const total = Number(totalAmount.replace(",", "."));
    const paid = isPaid ? Number((paymentAmount || totalAmount).replace(",", ".")) : 0;
    const parsedImageCount = imageCount.trim() ? Number(imageCount) : null;
    const parsedVideoMinutes = videoMinutes.trim() ? Number(videoMinutes) : null;

    if (!date || !guestName.trim() || !wish.trim()) {
      setError("Bitte Produktionsdatum, Kunde und den gewünschten Inhalt eintragen.");
      return;
    }
    if (!Number.isFinite(total) || total <= 0) {
      setError("Bitte den vereinbarten Gesamtpreis eintragen.");
      return;
    }
    if (isPaid && (!Number.isFinite(paid) || paid <= 0 || paid > total)) {
      setError("Bitte den tatsächlich erhaltenen Betrag eintragen. Er darf den Gesamtpreis nicht überschreiten.");
      return;
    }
    if (
      parsedImageCount !== null &&
      (!Number.isInteger(parsedImageCount) || parsedImageCount < 1)
    ) {
      setError("Die Anzahl der Bilder muss eine positive ganze Zahl sein.");
      return;
    }
    if (
      parsedVideoMinutes !== null &&
      (!Number.isInteger(parsedVideoMinutes) || parsedVideoMinutes < 1)
    ) {
      setError("Die Videolänge muss in positiven ganzen Minuten angegeben werden.");
      return;
    }
    if (isPaid && !paymentMethod.trim()) {
      setError("Bitte angeben, wie das Geld geschickt wurde.");
      return;
    }
    if (isPaid && !paidAt) {
      setError("Bitte das Zahlungsdatum angeben.");
      return;
    }

    const startsAt = berlinWallTimeToDate(date, start);
    const endsAt = berlinWallTimeToDate(date, end, end <= start);
    const contentDetails = [
      parsedImageCount !== null ? `Anzahl Bilder: ${parsedImageCount}` : null,
      parsedVideoMinutes !== null ? `Videolänge: ${parsedVideoMinutes} Minuten` : null,
      `Wunsch:\n${wish.trim()}`,
    ].filter(Boolean).join("\n\n");

    try {
      await onCreate({
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        location,
        guest_name: guestName.trim(),
        guest_contact: contact.trim() || null,
        source: "Custom Content",
        internal_note: [
          note.trim() || null,
          isPaid
            ? `Custom-Content-Zahlung: ${paid.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} · ${paymentMethod.trim()} · ${paidAt}`
            : "Custom-Content-Zahlung: noch offen",
        ].filter(Boolean).join("\n\n") || null,
        preferences: contentDetails,
        taboos: null,
        health_notes: null,
        booking_type: "custom_content",
        duo_partner: null,
        total_amount: total,
        deposit_amount: paid,
        deposit_method: isPaid ? paymentMethod.trim() : paymentMethod.trim() || "Überweisung",
        deposit_paid_at: isPaid ? paidAt : null,
        deposit_exemption_reason: null,
        onsite_method: null,
        onsite_paid_at: null,
      });

      setSuccess(true);
      setDate("");
      setGuestName("");
      setContact("");
      setWish("");
      setImageCount("");
      setVideoMinutes("");
      setNote("");
      setTotalAmount("");
      setPaymentAmount("");
      setIsPaid(true);
      setPaidAt(new Date().toISOString().slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Custom Content konnte nicht gespeichert werden.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="border border-champagne/20 bg-anthracite/25 p-4 space-y-4">
        <div className="eyebrow">Auftrag</div>

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
          <textarea required value={wish} onChange={(e) => setWish(e.target.value)} className="input-luxe min-h-28" placeholder="Inhalt, Outfit, Ablauf, besondere Wünsche …" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="eyebrow block mb-1">Anzahl Bilder (optional)</label>
            <input type="number" min={1} step={1} value={imageCount} onChange={(e) => setImageCount(e.target.value)} className="input-luxe !py-2" placeholder="z. B. 10" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Video in Minuten (optional)</label>
            <input type="number" min={1} step={1} value={videoMinutes} onChange={(e) => setVideoMinutes(e.target.value)} className="input-luxe !py-2" placeholder="z. B. 15" />
          </div>
        </div>
      </div>

      <div className="border border-champagne/30 bg-anthracite/35 p-4 space-y-4">
        <div className="eyebrow flex items-center gap-2"><CreditCard size={14} /> Zahlung</div>
        <p className="text-xs text-vanilla/55 leading-relaxed">
          Hier siehst bzw. hinterlegst du genau, wie viel der Kunde geschickt hat, wann das Geld kam und über welchen Zahlungsweg.
        </p>

        <div>
          <label className="eyebrow block mb-1">Vereinbarter Gesamtpreis (€)</label>
          <input inputMode="decimal" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="input-luxe !py-2" placeholder="z. B. 250" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsPaid(true)}
            className={`px-3 py-2 text-xs uppercase tracking-wider border ${isPaid ? "border-champagne bg-champagne/15 text-champagne" : "border-vanilla/20 text-vanilla/55"}`}
          >
            Geld erhalten
          </button>
          <button
            type="button"
            onClick={() => setIsPaid(false)}
            className={`px-3 py-2 text-xs uppercase tracking-wider border ${!isPaid ? "border-amber-400/70 bg-amber-500/10 text-amber-200" : "border-vanilla/20 text-vanilla/55"}`}
          >
            Zahlung offen
          </button>
        </div>

        {isPaid ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="eyebrow block mb-1">Erhaltener Betrag (€)</label>
              <input
                inputMode="decimal"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="input-luxe !py-2"
                placeholder={totalAmount || "z. B. 250"}
              />
            </div>
            <div>
              <label className="eyebrow block mb-1">Wie bezahlt?</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-luxe !py-2">
                <option value="Überweisung">Überweisung</option>
                <option value="PayPal">PayPal</option>
                <option value="Bar">Bar</option>
                <option value="Kreditkarte">Kreditkarte</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="eyebrow block mb-1">Zahlungsdatum</label>
              <input type="date" required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="input-luxe !py-2" />
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-200/80">
            Der Auftrag wird mit offener Zahlung gespeichert. Sobald das Geld da ist, kannst du die Zahlung in den Buchungsdetails nachtragen.
          </p>
        )}
      </div>

      <div className="border border-champagne/30 bg-anthracite/35 p-4 space-y-4">
        <div className="eyebrow flex items-center gap-2"><CalendarPlus size={14} /> Terminplan · Content produzieren</div>
        <p className="text-xs text-vanilla/55 leading-relaxed">
          Trage hier ein, wann du den Content tatsächlich machst. Dieser Zeitraum wird als <span className="text-champagne">Custom Content</span> in deinem Terminplan eingetragen.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="eyebrow block mb-1">Produktionsdatum</label>
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
          <label className="eyebrow block mb-1">Ort / Studio</label>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="input-luxe !py-2">
            {availableStudios.map((studio) => (
              <option key={studio.id} value={`${studio.name}, ${studio.address}`}>
                {studio.name} · {studio.address}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-1">Interne Notiz (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input-luxe min-h-20" />
      </div>

      <p className="text-xs text-vanilla/50">
        Zahlung und Produktionszeit werden gemeinsam am Custom-Content-Auftrag gespeichert. Der Produktionstermin erscheint direkt im Terminplan; erhaltene Beträge werden im Kassenbuch berücksichtigt.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-300">Custom Content inklusive Zahlung und Produktionstermin wurde eingetragen.</p>}
      <button type="submit" disabled={pending} className="btn-gold w-full !py-3">
        <CalendarPlus size={14} /> Custom Content speichern & in Terminplan eintragen
      </button>
    </form>
  );
}
