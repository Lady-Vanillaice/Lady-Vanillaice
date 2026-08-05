import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(text, search, replacement, label) {
  if (text.includes(replacement)) return text;
  if (!text.includes(search)) throw new Error(`${label} konnte nicht gefunden werden.`);
  return text.replace(search, replacement);
}

// Server: support a dedicated Custom Content booking type while reusing the
// existing booking, calendar and cashbook data model.
{
  const path = "src/lib/booking.functions.ts";
  let text = readFileSync(path, "utf8");

  text = replaceOnce(
    text,
    'booking_type: z.enum(["single", "duo", "content"]),',
    'booking_type: z.enum(["single", "duo", "content", "custom_content"]),',
    "Custom-Content-Buchungstyp",
  );

  text = replaceOnce(
    text,
    '    if (!data.deposit_exemption_reason && !data.deposit_paid_at) {\n      throw new Error("Das Eingangsdatum der Anzahlung fehlt.");\n    }\n    if (!data.deposit_exemption_reason && data.deposit_amount <= 0) {\n      throw new Error("Die erhaltene Anzahlung muss größer als 0 € sein.");\n    }',
    '    if (!data.deposit_exemption_reason && data.deposit_amount > 0 && !data.deposit_paid_at) {\n      throw new Error("Das Eingangsdatum der Zahlung fehlt.");\n    }\n    if (data.booking_type !== "custom_content" && !data.deposit_exemption_reason && data.deposit_amount <= 0) {\n      throw new Error("Die erhaltene Anzahlung muss größer als 0 € sein.");\n    }',
    "Zahlungsprüfung für Custom Content",
  );

  text = replaceOnce(
    text,
    '      data.preferences ? `Vorlieben & Wünsche:\\n${data.preferences}` : null,',
    '      data.preferences ? `${data.booking_type === "custom_content" ? "Custom-Content-Wunsch" : "Vorlieben & Wünsche"}:\\n${data.preferences}` : null,',
    "Custom-Content-Wunsch im Nachrichtentext",
  );

  text = replaceOnce(
    text,
    '  is_content_shoot: data.booking_type === "content",',
    '  is_content_shoot: data.booking_type === "content" || data.booking_type === "custom_content",',
    "Custom Content als Content-Termin",
  );

  text = replaceOnce(
    text,
    '    : data.booking_type === "content"\n      ? "Content Dreh"\n      : `${durationMinutes} Minuten`,',
    '    : data.booking_type === "custom_content"\n      ? "Custom Content"\n      : data.booking_type === "content"\n        ? "Content Dreh"\n        : `${durationMinutes} Minuten`,',
    "Custom-Content-Bezeichnung",
  );

  text = replaceOnce(
    text,
    '        anzahlung_paid: data.deposit_exemption_reason ? false : true,\n        anzahlung_paid_at: data.deposit_exemption_reason ? null : `${data.deposit_paid_at}T12:00:00.000Z`,',
    '        anzahlung_paid: !data.deposit_exemption_reason && data.deposit_amount > 0,\n        anzahlung_paid_at: !data.deposit_exemption_reason && data.deposit_amount > 0 && data.deposit_paid_at ? `${data.deposit_paid_at}T12:00:00.000Z` : null,',
    "Custom-Content-Zahlungsstatus",
  );

  writeFileSync(path, text);
}

// Shared type: allow the dedicated booking type.
{
  const path = "src/components/admin/admin-shared.tsx";
  let text = readFileSync(path, "utf8");
  text = replaceOnce(
    text,
    '  booking_type: "single" | "duo" | "content";',
    '  booking_type: "single" | "duo" | "content" | "custom_content";',
    "Custom-Content-Typ im Admin",
  );
  writeFileSync(path, text);
}

// Terminplan: add a dedicated, compact entry form below the external booking form.
{
  const path = "src/routes/_authenticated/admin.terminplan.tsx";
  let text = readFileSync(path, "utf8");

  if (!text.includes('from "react";')) {
    text = text.replace(
      'import { createFileRoute, Link } from "@tanstack/react-router";\n',
      'import { createFileRoute, Link } from "@tanstack/react-router";\nimport { useState } from "react";\n',
    );
  }

  const existingDetails = `          <details className="mb-8 bg-card border border-champagne/25">
            <summary className="cursor-pointer px-5 py-4 text-sm text-vanilla/80 hover:text-champagne flex items-center gap-2">
              <CalendarPlus size={16} className="text-champagne" />
              Neuen externen Termin eintragen
            </summary>
            <div className="p-5 border-t border-champagne/15">
              <ManualBookingForm onCreate={(values) => manualMut.mutateAsync(values)} pending={manualMut.isPending} customers={customersQ.data ?? []} studios={studiosQ.data} />
            </div>
          </details>`;

  const withCustomDetails = `${existingDetails}

          {/* Dedicated Custom Content booking entry */}
          <details className="mb-8 bg-card border border-champagne/25">
            <summary className="cursor-pointer px-5 py-4 text-sm text-vanilla/80 hover:text-champagne flex items-center gap-2">
              <Crown size={16} className="text-champagne" />
              Custom Content eintragen
            </summary>
            <div className="p-5 border-t border-champagne/15">
              <CustomContentForm
                onCreate={(values) => manualMut.mutateAsync(values)}
                pending={manualMut.isPending}
                studios={studiosQ.data}
              />
            </div>
          </details>`;

  text = replaceOnce(text, existingDetails, withCustomDetails, "Custom-Content-Bereich im Terminplan");

  const componentMarker = "function wrapCanvasText(";
  if (!text.includes("function CustomContentForm(")) {
    const customComponent = `function CustomContentForm({
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

  const toBerlinDate = (day: string, time: string, nextDay = false) => {
    const [year, month, datePart] = day.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const wall = new Date(Date.UTC(year, month - 1, datePart + (nextDay ? 1 : 0), hour, minute));
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(wall);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    return new Date(wall.getTime() - (represented - wall.getTime()));
  };

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
    const startsAt = toBerlinDate(date, start);
    const endsAt = toBerlinDate(date, end, end <= start);
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className="eyebrow block mb-1">Datum</label><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input-luxe !py-2" /></div>
        <div><label className="eyebrow block mb-1">Von</label><input type="time" required value={start} onChange={(e) => setStart(e.target.value)} className="input-luxe !py-2" /></div>
        <div><label className="eyebrow block mb-1">Bis</label><input type="time" required value={end} onChange={(e) => setEnd(e.target.value)} className="input-luxe !py-2" /></div>
      </div>
      <div><label className="eyebrow block mb-1">Studio</label><select value={location} onChange={(e) => setLocation(e.target.value)} className="input-luxe !py-2">{studios.map((studio) => <option key={studio.id} value={\`${studio.name}, ${studio.address}\`}>{studio.name} · {studio.address}</option>)}</select></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="eyebrow block mb-1">Kunde / Pseudonym</label><input required value={guestName} onChange={(e) => setGuestName(e.target.value)} className="input-luxe !py-2" /></div>
        <div><label className="eyebrow block mb-1">Kontakt (optional)</label><input value={contact} onChange={(e) => setContact(e.target.value)} className="input-luxe !py-2" placeholder="E-Mail, Telegram oder Telefon" /></div>
      </div>
      <div><label className="eyebrow block mb-1">Was möchte der Kunde?</label><textarea required value={wish} onChange={(e) => setWish(e.target.value)} className="input-luxe min-h-28" placeholder="Inhalt, Outfit, Praktiken, Ablauf, besondere Wünsche …" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="eyebrow block mb-1">Gesamtpreis (€)</label><input inputMode="decimal" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="input-luxe !py-2" /></div>
        <div><label className="eyebrow block mb-1">Bereits gezahlt (€)</label><input inputMode="decimal" required value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="input-luxe !py-2" /></div>
      </div>
      {Number(paidAmount.replace(",", ".")) > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="eyebrow block mb-1">Zahlungsart</label><input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-luxe !py-2" /></div><div><label className="eyebrow block mb-1">Bezahlt am</label><input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="input-luxe !py-2" /></div></div>}
      <div><label className="eyebrow block mb-1">Interne Notiz (optional)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} className="input-luxe min-h-20" /></div>
      <p className="text-xs text-vanilla/50">Der Termin erscheint automatisch im Terminplan. Zahlungen werden im Kassenbuch als Custom Content geführt.</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-300">Custom Content wurde eingetragen.</p>}
      <button type="submit" disabled={pending} className="btn-gold w-full !py-3"><CalendarPlus size={14} /> Custom Content speichern</button>
    </form>
  );
}

`;
    text = text.replace(componentMarker, customComponent + componentMarker);
  }

  text = text.replace(
    '        : entry.is_content_shoot\n          ? "CONTENT"',
    '        : entry.duration === "Custom Content"\n          ? "CUSTOM CONTENT"\n          : entry.is_content_shoot\n            ? "CONTENT"',
  );

  text = text.replace(
    '              Content\n            </span>',
    '              {e.duration === "Custom Content" ? "Custom Content" : "Content"}\n            </span>',
  );

  writeFileSync(path, text);
}

console.log("Custom Content booking workflow applied.");
