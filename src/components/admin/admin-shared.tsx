import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  CalendarPlus,
  Calendar,
  MapPin,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { CustomerRow } from "@/lib/customers.functions";

const ADMIN_TIME_ZONE = "Europe/Berlin";

function berlinOffsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const representedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return (representedAsUtc - date.getTime()) / 60_000;
}

function berlinWallTimeToDate(date: string, time: string, nextDay = false) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallTime = Date.UTC(year, month - 1, day + (nextDay ? 1 : 0), hour, minute);
  let candidate = new Date(wallTime);
  candidate = new Date(wallTime - berlinOffsetMinutes(candidate) * 60_000);
  // Re-evaluate at the resulting instant so DST transition dates stay correct.
  candidate = new Date(wallTime - berlinOffsetMinutes(candidate) * 60_000);
  return candidate;
}

export type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  is_duo: boolean;
  is_content_shoot: boolean;
  duo_partner: string | null;
  status: "open" | "held" | "booked";
  internal_note: string | null;
  buffer_minutes?: number | null;
  is_hidden?: boolean;
};

export type Booking = {
  id: string;
  slot_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  duration: string | null;
  duration_minutes: number | null;
  requested_start: string | null;
  message: string;
  status: "pending" | "confirmed" | "cancelled" | "declined" | "rescheduling" | "waiting_deposit" | "open";
  admin_note: string | null;
  created_at: string;
  anzahlung_paid?: boolean | null;
  deposit_exemption_reason?: "regular_customer" | "trust" | "exception" | "colleague_guarantees" | "spontaneous" | null;
  completed_at?: string | null;
  cash_received_at?: string | null;
  fully_paid?: boolean | null;
};

export type DeclineReason = "services_not_offered" | "slot_taken" | "not_yet_offered" | "no_response";

const DECLINE_REASONS: { value: DeclineReason; label: string }[] = [
  { value: "services_not_offered", label: "Leistungen biete ich nicht an" },
  { value: "slot_taken", label: "Termin schon belegt" },
  { value: "not_yet_offered", label: "Praktik noch nicht im Angebot" },
  { value: "no_response", label: "Keine Antwort erhalten" },
];

export function StatusBadge({ status }: { status: Slot["status"] }) {
  const map = {
    open: { label: "Offen", cls: "bg-champagne/15 text-champagne" },
    held: { label: "Reserviert", cls: "bg-bordeaux/30 text-vanilla" },
    booked: { label: "Gebucht", cls: "bg-vanilla/15 text-vanilla" },
  } as const;
  const s = map[status];
  return <span className={`text-[0.6rem] uppercase tracking-[0.2em] px-2 py-0.5 ${s.cls}`}>{s.label}</span>;
}

export function BookingStatusBadge({ status }: { status: Booking["status"] }) {
  const map = {
    pending: { label: "Neu", cls: "bg-champagne/15 text-champagne" },
    confirmed: { label: "Bestätigt", cls: "bg-green-700/30 text-green-200" },
    declined: { label: "Abgelehnt", cls: "bg-bordeaux/40 text-vanilla" },
    cancelled: { label: "Storniert", cls: "bg-vanilla/10 text-vanilla/60" },
    rescheduling: { label: "Umplanen", cls: "bg-champagne/25 text-champagne" },
    waiting_deposit: { label: "Wartend · Anzahlung offen", cls: "bg-amber-700/30 text-amber-200" },
    open: { label: "Offen", cls: "bg-sky-700/30 text-sky-200" },
  } as const;
  const s = map[status];
  return <span className={`text-[0.6rem] uppercase tracking-[0.2em] px-2 py-1 ${s.cls}`}>{s.label}</span>;
}

export function DeclineButton({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (reason: DeclineReason) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux/60 text-bordeaux hover:bg-bordeaux/10 disabled:opacity-30"
      >
        <XCircle size={12} className="inline mr-1" /> Ablehnen
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute z-50 mt-1 left-0 w-72 bg-card border border-champagne/30 shadow-xl">
            <div className="px-3 py-2 text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/55 border-b border-champagne/15">
              Grund wählen — Mail geht raus
            </div>
            {DECLINE_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(r.value);
                }}
                className="block w-full text-left px-3 py-2 text-xs text-vanilla/80 hover:bg-bordeaux/10 hover:text-bordeaux border-b border-champagne/10 last:border-b-0"
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function InlineDeleteButton({
  guestName,
  pending,
  onConfirm,
}: {
  guestName: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(true)}
        className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux/50 text-bordeaux hover:bg-bordeaux/10 disabled:opacity-30 inline-flex items-center gap-1"
      >
        <Trash2 size={12} /> Löschen
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 border border-bordeaux/50 bg-bordeaux/10 px-3 py-2">
      <span className="text-[0.65rem] text-vanilla/85">
        „{guestName}" löschen?
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={onConfirm}
        className="text-[0.6rem] uppercase tracking-[0.2em] px-2 py-1 border border-bordeaux bg-bordeaux/30 text-vanilla hover:bg-bordeaux/50 disabled:opacity-40"
      >
        {pending ? "…" : "Ja"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(false)}
        className="text-[0.6rem] uppercase tracking-[0.2em] px-2 py-1 border border-vanilla/30 text-vanilla/70 hover:bg-vanilla/5 disabled:opacity-40"
      >
        Nein
      </button>
    </span>
  );
}

export function BookingCard({
  b,
  slot,
  onConfirm,
  onDecline,
  onDelete,
  pending,
}: {
  b: Booking;
  slot?: Slot;
  onConfirm: () => void;
  onDecline: (reason: DeclineReason) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <div className="bg-card border border-champagne/15 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-display text-xl text-vanilla">{b.guest_name}</div>
          <a href={`mailto:${b.guest_email}`} className="text-xs text-champagne hover:underline">{b.guest_email}</a>
          {b.guest_phone && <div className="text-xs text-vanilla/70 mt-0.5">{b.guest_phone}</div>}
        </div>
        <BookingStatusBadge status={b.status} />
      </div>

      {(slot || b.requested_start) && (
        <div className="text-xs text-vanilla/65 mb-3 flex flex-wrap gap-x-4 gap-y-1">
          <span><Calendar size={11} className="inline mr-1" />
            {b.requested_start
              ? `${format(new Date(b.requested_start), "dd.MM.yyyy", { locale: de })} · ${format(new Date(b.requested_start), "HH:mm", { locale: de })}${b.duration_minutes ? ` – ${format(new Date(new Date(b.requested_start).getTime() + b.duration_minutes * 60_000), "HH:mm", { locale: de })}` : ""}`
              : slot
                ? `${format(new Date(slot.starts_at), "dd.MM.yyyy", { locale: de })} · ${format(new Date(slot.starts_at), "HH:mm", { locale: de })} – ${format(new Date(slot.ends_at), "HH:mm", { locale: de })}`
                : ""}
          </span>
          {slot && <span><MapPin size={11} className="inline mr-1" />{slot.location}</span>}
          {b.duration && <span>· {b.duration}</span>}
        </div>
      )}

      <div className="mb-3">
        <div className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1">
          Session-Übersicht
        </div>
        <p className="text-sm text-vanilla/75 leading-relaxed bg-anthracite/40 p-3 border border-champagne/10 whitespace-pre-line">
          <MessageSquare size={11} className="inline mr-1 text-champagne" />
          {b.message}
        </p>
      </div>

      {b.admin_note && (
        <div className="mb-3">
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-champagne/70 mb-1">
            Deine Notiz
          </div>
          <p className="text-sm text-vanilla/75 leading-relaxed bg-champagne/5 p-3 border border-champagne/20 whitespace-pre-line">
            {b.admin_note}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={b.status === "confirmed" || pending}
          onClick={onConfirm}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"
        >
          <CheckCircle2 size={12} className="inline mr-1" /> Termin fixieren
        </button>
        <DeclineButton
          disabled={b.status === "declined" || pending}
          onPick={onDecline}
        />
        <Link
          to="/admin/buchung/$id"
          params={{ id: b.id }}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-vanilla/30 text-vanilla/75 hover:bg-vanilla/5"
        >
          Details
        </Link>
        <InlineDeleteButton
          guestName={b.guest_name}
          pending={pending}
          onConfirm={onDelete}
        />

      </div>

      <div className="mt-3 text-[0.65rem] text-vanilla/35">
        Eingegangen: {format(new Date(b.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
      </div>
    </div>
  );
}

export function NewSlotForm({
  onCreate,
  pending,
}: {
  onCreate: (v: { starts_at: string; ends_at: string; location: string; is_duo?: boolean; is_content_shoot?: boolean; duo_partner?: string | null; internal_note?: string; buffer_minutes?: number; is_hidden?: boolean }) => Promise<unknown>;
  pending: boolean;
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [hasSecondWindow, setHasSecondWindow] = useState(false);
  const [secondStart, setSecondStart] = useState("20:00");
  const [secondEnd, setSecondEnd] = useState("22:00");
  const [location, setLocation] = useState("Studio60, Gärtnerstraße 60, 80992 München");
  const [room, setRoom] = useState("");
  const [isDuo, setIsDuo] = useState(false);
  const [duoPartner, setDuoPartner] = useState("");
  const [isContentShoot, setIsContentShoot] = useState(false);
  const [note, setNote] = useState("");
  const [buffer, setBuffer] = useState(45);
  const [isHidden, setIsHidden] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!date) {
      setErr("Bitte ein Datum wählen.");
      return;
    }
    const starts_at = berlinWallTimeToDate(date, start);
    const ends_at = berlinWallTimeToDate(date, end, end <= start);
    const secondStartsAt = berlinWallTimeToDate(date, secondStart);
    const secondEndsAt = berlinWallTimeToDate(
      date,
      secondEnd,
      secondEnd <= secondStart,
    );
    if (hasSecondWindow && secondStartsAt.getTime() < ends_at.getTime() && secondEndsAt.getTime() > starts_at.getTime()) {
      setErr("Die beiden Zeitfenster dürfen sich nicht überschneiden.");
      return;
    }
    if (isDuo && !duoPartner.trim()) {
      setErr("Bitte den Namen der Duo-Partnerin angeben.");
      return;
    }
    try {
      const fullLocation = room.trim() ? `${location} — Raum ${room.trim()}` : location;
      const sharedValues = {
        location: fullLocation,
        is_duo: isDuo,
        is_content_shoot: isContentShoot,
        duo_partner: isDuo ? duoPartner.trim() : null,
        internal_note: note || undefined,
        buffer_minutes: buffer,
        is_hidden: isHidden,
      };
      await onCreate({
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        ...sharedValues,
      });
      if (hasSecondWindow) {
        await onCreate({
          starts_at: secondStartsAt.toISOString(),
          ends_at: secondEndsAt.toISOString(),
          ...sharedValues,
        });
      }
      setDate(""); setRoom(""); setNote(""); setIsDuo(false); setDuoPartner(""); setIsContentShoot(false); setBuffer(45); setIsHidden(true); setHasSecondWindow(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    }
  }

  return (
    <form onSubmit={submit} className="bg-card border border-champagne/15 p-5 space-y-3">
      <div className="border-b border-champagne/15 pb-3">
        <div className="eyebrow text-champagne mb-1">Zeitfenster anlegen</div>
        <p className="text-xs text-vanilla/55 leading-relaxed">
          Das ist kein fester Kundentermin. Es ist nur der Zeitraum, in dem Kunden später frei buchen können. Für mehrere Blöcke am selben Tag legst du einfach mehrere Zeitfenster an.
        </p>
      </div>
      <div className="border border-champagne/15 bg-anthracite/20 p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="eyebrow block mb-1">Datum</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input-luxe !py-2" />
          </div>
          <div>
            <label className="eyebrow block mb-1">1. Zeitfenster von</label>
            <input type="time" required value={start} onChange={(e) => setStart(e.target.value)} className="input-luxe !py-2" />
          </div>
          <div>
            <label className="eyebrow block mb-1">1. Zeitfenster bis</label>
            <input type="time" required value={end} onChange={(e) => setEnd(e.target.value)} className="input-luxe !py-2" />
          </div>
        </div>

        {hasSecondWindow && (
          <div className="grid grid-cols-1 gap-3 border-t border-champagne/15 pt-4 sm:grid-cols-2">
            <div>
              <label className="eyebrow block mb-1">2. Zeitfenster von</label>
              <input type="time" required value={secondStart} onChange={(e) => setSecondStart(e.target.value)} className="input-luxe !py-2" />
            </div>
            <div>
              <label className="eyebrow block mb-1">2. Zeitfenster bis</label>
              <input type="time" required value={secondEnd} onChange={(e) => setSecondEnd(e.target.value)} className="input-luxe !py-2" />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setHasSecondWindow((value) => !value)}
          className="text-[0.65rem] uppercase tracking-[0.18em] text-champagne hover:text-vanilla transition"
        >
          {hasSecondWindow ? "– Zweites Zeitfenster entfernen" : "+ Zweites Zeitfenster an diesem Tag"}
        </button>
        <p className="text-[0.65rem] text-vanilla/45">
          Ideal, wenn du zum Beispiel vormittags und abends verfügbar bist. Beide Zeitfenster erhalten dieselben Angaben unten.
        </p>
      </div>
      <div>
        <label className="eyebrow block mb-1">Standort</label>
        <select value={location} onChange={(e) => setLocation(e.target.value)} className="input-luxe !py-2">
          <option value="Studio60, Gärtnerstraße 60, 80992 München">Studio60, Gärtnerstraße 60, 80992 München</option>
          <option value="Studio Elegance, Frankfurter Ring 139, 80807 München">Studio Elegance, Frankfurter Ring 139, 80807 München</option>
        </select>
      </div>
      <div>
        <label className="eyebrow block mb-1">Raum (optional)</label>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="z. B. Raum 1, Dungeon, Medizinzimmer …"
          className="input-luxe !py-2"
        />
        <p className="text-[0.65rem] text-vanilla/45 mt-1">Optional — muss nicht angegeben werden, um den Termin im Kalender anzuzeigen.</p>
      </div>
      <div>
        <label className="eyebrow block mb-1">Pause zwischen Terminen (Minuten)</label>
        <input
          type="number" min={0} max={240} step={15}
          value={buffer}
          onChange={(e) => setBuffer(Math.max(0, Math.min(240, Number(e.target.value) || 0)))}
          className="input-luxe !py-2"
        />
        <p className="text-[0.65rem] text-vanilla/45 mt-1">Standard 45 Min. Wird auch bei bestehenden Buchungen berücksichtigt.</p>
      </div>
      <label className="flex items-start gap-3 text-xs text-vanilla/70 cursor-pointer border border-champagne/15 bg-anthracite/30 p-3">
        <input
          type="checkbox"
          checked={isDuo}
          onChange={(e) => setIsDuo(e.target.checked)}
          className="mt-0.5 accent-[var(--color-champagne)]"
        />
        <span>
          Als Duo-Zeitfenster freischalten — wird im Kalender sichtbar mit <span className="text-champagne">Duo</span> markiert.
        </span>
      </label>
      {isDuo && (
        <div>
          <label className="eyebrow block mb-1">Duo-Partnerin</label>
          <input
            value={duoPartner}
            onChange={(e) => setDuoPartner(e.target.value)}
            placeholder="z. B. Lady Selena"
            className="input-luxe !py-2"
          />
          <p className="text-[0.65rem] text-vanilla/45 mt-1">
            Wird im Kalender groß neben dem Datum angezeigt.
          </p>
        </div>
      )}
      <label className="flex items-start gap-3 text-xs text-vanilla/70 cursor-pointer border border-champagne/15 bg-anthracite/30 p-3">
        <input
          type="checkbox"
          checked={isContentShoot}
          onChange={(e) => setIsContentShoot(e.target.checked)}
          className="mt-0.5 accent-[var(--color-champagne)]"
        />
        <span>
          Als Content-Dreh markieren — wird im Kalender sichtbar mit <span className="text-champagne">Content</span> gekennzeichnet.
        </span>
      </label>
      <div>
        <label className="eyebrow block mb-1">Interne Notiz (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="input-luxe !py-2" placeholder="Nur für dich sichtbar" />
      </div>
      <label className="flex items-start gap-3 text-xs text-vanilla/70 cursor-pointer border border-champagne/15 bg-anthracite/30 p-3">
        <input
          type="checkbox"
          checked={isHidden}
          onChange={(e) => setIsHidden(e.target.checked)}
          className="mt-0.5 accent-[var(--color-champagne)]"
        />
        <span>
          Zunächst <span className="text-champagne">unsichtbar</span> anlegen — das Zeitfenster ist nur intern sichtbar und erscheint noch nicht auf dem öffentlichen Kalender. Du kannst es später freigeben.
        </span>
      </label>
      {err && <div className="text-xs text-destructive">{err}</div>}
      <button type="submit" disabled={pending} className="btn-gold w-full !py-3">
        <Plus size={14} /> Zeitfenster hinzufügen
      </button>
    </form>
  );
}
export type ManualBookingValues = {
  starts_at: string;
  ends_at: string;
  location: string;
  guest_name: string;
  guest_contact?: string | null;
  source?: string | null;
  internal_note?: string | null;
  preferences?: string | null;
  taboos?: string | null;
  health_notes?: string | null;
  booking_type: "single" | "duo" | "content";
  duo_partner?: string | null;
  total_amount: number;
  deposit_amount: number;
  deposit_method: string | null;
  deposit_paid_at: string | null;
  deposit_exemption_reason: "regular_customer" | "trust" | "exception" | "colleague_guarantees" | "spontaneous" | null;
};

export function ManualBookingForm({
  onCreate,
  pending,
  customers = [],
}: {
  onCreate: (v: ManualBookingValues) => Promise<unknown>;
  pending: boolean;
  customers?: CustomerRow[];
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [location, setLocation] = useState(
    "Studio60, Gärtnerstraße 60, 80992 München",
  );
  const [room, setRoom] = useState("");
  const [guestName, setGuestName] = useState("");
  const [source, setSource] = useState("Telegram");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [preferences, setPreferences] = useState("");
  const [taboos, setTaboos] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [bookingType, setBookingType] =
    useState<"single" | "duo" | "content">("single");
  const [duoPartner, setDuoPartner] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [shortSessionPrice, setShortSessionPrice] = useState("");
  const [depositExemptionReason, setDepositExemptionReason] = useState<ManualBookingValues["deposit_exemption_reason"]>(null);
  const [depositMethod, setDepositMethod] = useState("Überweisung");
  const [depositPaidAt, setDepositPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const matchingCustomers = guestName.trim()
    ? customers.filter((customer) => {
        const query = guestName.trim().toLocaleLowerCase("de-DE");
        return [customer.note?.pseudonym, ...customer.names].filter(Boolean).some((name) => String(name).toLocaleLowerCase("de-DE").startsWith(query));
      }).slice(0, 8)
    : [];

  const selectCustomer = (customer: CustomerRow) => {
    const name = customer.note?.pseudonym || customer.names[0] || "";
    const phone = customer.note?.phone || customer.phones[0] || "";
    const profile = {
      vorlieben: customer.note?.vorlieben || customer.booking_profile.vorlieben,
      tabus: customer.note?.tabus || customer.booking_profile.tabus,
      gesundheit: customer.note?.gesundheit || customer.booking_profile.gesundheit,
      safeword: customer.note?.safeword || customer.booking_profile.safeword,
      admin: customer.note?.admin_note || null,
    };
    setGuestName(name);
    setContact(phone || customer.email);
    setPreferences(profile.vorlieben ?? "");
    setTaboos(profile.tabus ?? "");
    setHealthNotes(profile.gesundheit ?? "");
    setNote([
      profile.safeword ? `Safeword: ${profile.safeword}` : null,
      profile.admin ?? null,
    ].filter(Boolean).join("\n"));
    setCustomerOpen(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);

    if (!date) {
      setErr("Bitte ein Datum wählen.");
      return;
    }

    if (!guestName.trim()) {
      setErr("Bitte einen Namen oder Pseudonym angeben.");
      return;
    }

    if (bookingType === "duo" && !duoPartner.trim()) {
      setErr("Bitte die Duo-Partnerin angeben.");
      return;
    }

    const total = Number(totalAmount.replace(",", "."));
    const deposit = Number(depositAmount.replace(",", "."));
    if (!Number.isFinite(total) || total <= 0) {
      setErr("Bitte den Gesamtpreis eintragen.");
      return;
    }
    if (!depositExemptionReason && (!Number.isFinite(deposit) || deposit <= 0 || deposit > total)) {
      setErr("Die erhaltene Anzahlung muss größer als 0 € und höchstens so hoch wie der Gesamtpreis sein.");
      return;
    }
    if (!depositExemptionReason && (!depositMethod.trim() || !depositPaidAt)) {
      setErr("Bitte Zahlungsart und Eingangsdatum der Anzahlung angeben.");
      return;
    }

    const starts_at = berlinWallTimeToDate(date, start);
    const ends_at = berlinWallTimeToDate(date, end, end <= start);

    const fullLocation = room.trim()
      ? `${location} — Raum ${room.trim()}`
      : location;

    try {
      await onCreate({
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        location: fullLocation,
        guest_name: guestName.trim(),
        guest_contact: contact.trim() || null,
        source: source.trim() || null,
        internal_note: note.trim() || null,
        preferences: preferences.trim() || null,
        taboos: taboos.trim() || null,
        health_notes: healthNotes.trim() || null,
        booking_type: bookingType,
        duo_partner:
          bookingType === "duo" ? duoPartner.trim() : null,
        total_amount: total,
        deposit_amount: depositExemptionReason ? 0 : deposit,
        deposit_method: depositExemptionReason ? null : depositMethod.trim(),
        deposit_paid_at: depositExemptionReason ? null : depositPaidAt,
        deposit_exemption_reason: depositExemptionReason,
      });

      setOk(true);
      setDate("");
      setRoom("");
      setGuestName("");
      setContact("");
      setNote("");
      setPreferences("");
      setTaboos("");
      setHealthNotes("");
      setBookingType("single");
      setDuoPartner("");
      setTotalAmount("");
      setDepositAmount("");
      setShortSessionPrice("");
      setDepositExemptionReason(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[0.7rem] text-vanilla/55 leading-relaxed">
        Trag hier Termine ein, die du außerhalb der Website, zum Beispiel über
        Telegram oder E-Mail, vereinbart hast. Die Zeit wird sofort im Kalender
        gesperrt – keine Doppelbuchungen.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 sm:col-span-1">
          <label className="eyebrow block mb-1">Datum</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-luxe !py-2"
          />
        </div>

        <div>
          <label className="eyebrow block mb-1">Von</label>
          <input
            type="time"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="input-luxe !py-2"
          />
        </div>

        <div>
          <label className="eyebrow block mb-1">Bis</label>
          <input
            type="time"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="input-luxe !py-2"
          />
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-1">Standort</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="input-luxe !py-2"
        >
          <option value="Studio60, Gärtnerstraße 60, 80992 München">
            Studio60, Gärtnerstraße 60, 80992 München
          </option>
          <option value="Studio Elegance, Frankfurter Ring 139, 80807 München">
            Studio Elegance, Frankfurter Ring 139, 80807 München
          </option>
        </select>
      </div>

      <div>
        <label className="eyebrow block mb-1">Raum (optional)</label>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="z. B. Raum 1, Dungeon, Medizinzimmer …"
          className="input-luxe !py-2"
        />
      </div>

      <div>
        <label className="eyebrow block mb-2">Terminart</label>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setBookingType("single");
              setDuoPartner("");
            }}
            className={
              bookingType === "single"
                ? "btn-gold !py-2 !px-3 !text-[0.65rem]"
                : "btn-outline-gold !py-2 !px-3 !text-[0.65rem]"
            }
          >
            Einzel
          </button>

          <button
            type="button"
            onClick={() => setBookingType("duo")}
            className={
              bookingType === "duo"
                ? "btn-gold !py-2 !px-3 !text-[0.65rem]"
                : "btn-outline-gold !py-2 !px-3 !text-[0.65rem]"
            }
          >
            Duo
          </button>

          <button
            type="button"
            onClick={() => {
              setBookingType("content");
              setDuoPartner("");
            }}
            className={
              bookingType === "content"
                ? "btn-gold !py-2 !px-3 !text-[0.65rem]"
                : "btn-outline-gold !py-2 !px-3 !text-[0.65rem]"
            }
          >
            Content
          </button>
        </div>
      </div>

      {bookingType === "duo" && (
        <div>
          <label className="eyebrow block mb-1">
            Duo-Partnerin / Domina
          </label>
          <input
            value={duoPartner}
            onChange={(e) => setDuoPartner(e.target.value)}
            placeholder="z. B. Lady Selena"
            className="input-luxe !py-2"
            required
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="relative">
          <label className="eyebrow block mb-1">Name / Pseudonym</label>
          <input
            value={guestName}
            onChange={(e) => { setGuestName(e.target.value); setCustomerOpen(true); }}
            onFocus={() => setCustomerOpen(true)}
            placeholder="z. B. Markus / Sklave M."
            className="input-luxe !py-2"
            required
            autoComplete="off"
          />
          {customerOpen && matchingCustomers.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 border border-champagne/30 bg-card shadow-xl max-h-64 overflow-y-auto">
              {matchingCustomers.map((customer) => {
                const displayName = customer.note?.pseudonym || customer.names[0] || customer.email;
                return <button key={customer.email} type="button" onClick={() => selectCustomer(customer)} className="block w-full text-left px-3 py-2 border-b border-champagne/10 last:border-0 hover:bg-champagne/10"><span className="block text-sm text-vanilla">{displayName}</span><span className="block text-[0.65rem] text-vanilla/50">{customer.email} · {customer.visits_count} vergangene Termine</span></button>;
              })}
            </div>
          )}
        </div>

        <div>
          <label className="eyebrow block mb-1">Quelle</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="input-luxe !py-2"
          >
            <option>WhatsApp</option>
            <option>E-Mail</option>
            <option>Telegram</option>
            <option>Instagram</option>
            <option>Twitter</option>
            <option>Persönlich</option>
            <option>Kollegin</option>
          </select>
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-1">Kontakt (optional)</label>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="@telegram-handle, E-Mail oder Telefonnummer"
          className="input-luxe !py-2"
        />
      </div>

      <div className="border border-champagne/20 bg-anthracite/20 p-4 space-y-4">
        <div>
          <div className="eyebrow text-champagne">Persönliche Angaben</div>
          <p className="mt-1 text-[0.7rem] leading-relaxed text-vanilla/55">
            Diese Angaben werden in der Buchung und zusätzlich in der internen Notiz gespeichert.
          </p>
        </div>
        <div>
          <label className="eyebrow block mb-1">Vorlieben &amp; Wünsche (optional)</label>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="Was ist gewünscht? Welche Vorlieben wurden besprochen?"
            rows={3}
            maxLength={2000}
            className="input-luxe !py-2 resize-y"
          />
        </div>
        <div>
          <label className="eyebrow block mb-1">Tabus &amp; Grenzen (optional)</label>
          <textarea
            value={taboos}
            onChange={(e) => setTaboos(e.target.value)}
            placeholder="Tabus, klare Grenzen und ausgeschlossene Praktiken"
            rows={3}
            maxLength={2000}
            className="input-luxe !py-2 resize-y"
          />
        </div>
        <div>
          <label className="eyebrow block mb-1">Gesundheitliche Hinweise (optional)</label>
          <textarea
            value={healthNotes}
            onChange={(e) => setHealthNotes(e.target.value)}
            placeholder="Allergien, Verletzungen, Medikamente oder andere wichtige Hinweise"
            rows={3}
            maxLength={2000}
            className="input-luxe !py-2 resize-y"
          />
          <p className="mt-1 text-[0.65rem] text-vanilla/45">Nur im geschützten Adminbereich sichtbar.</p>
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-1">
          Weitere interne Notiz (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Weitere Absprachen oder organisatorische Hinweise"
          rows={3}
          maxLength={2000}
          className="input-luxe !py-2 resize-y"
        />
      </div>

      <div className="border border-champagne/25 bg-champagne/[0.04] p-4 space-y-3">
        <div>
          <div className="eyebrow text-champagne">Preis & Zahlung</div>
          <p className="mt-1 text-[0.7rem] text-vanilla/55">Die Anzahlung wird als bereits erhalten gespeichert. Der Restbetrag wird automatisch berechnet und ins Kassenbuch übernommen.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">Kurzsession</label><select value={shortSessionPrice} onChange={(e) => { const value = e.target.value; setShortSessionPrice(value); if (value) setTotalAmount(value); }} className="input-luxe !py-2"><option value="">Preis auswählen</option><option value="60">60 €</option><option value="75">75 €</option><option value="100">100 €</option></select></div>
          <div><label className="eyebrow block mb-1">Anzahlungsregel</label><select value={depositExemptionReason ?? ""} onChange={(e) => { const value = e.target.value as ManualBookingValues["deposit_exemption_reason"] | ""; setDepositExemptionReason(value || null); if (value) setDepositAmount("0"); }} className="input-luxe !py-2"><option value="">Normale Anzahlung</option><option value="regular_customer">Keine Anzahlung – Stammkunde</option><option value="trust">Keine Anzahlung – Vertrauensbasis</option><option value="exception">Keine Anzahlung – Ausnahme</option><option value="colleague_guarantees">Keine Anzahlung – Kollegin bürgt</option><option value="spontaneous">Keine Anzahlung – Spontaner Termin</option></select></div>
          <div><label className="eyebrow block mb-1">Gesamtpreis (€)</label><input required inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="z. B. 450" className="input-luxe !py-2" /></div>
          <div><label className="eyebrow block mb-1">Anzahlung erhalten (€)</label><input required={!depositExemptionReason} disabled={Boolean(depositExemptionReason)} inputMode="decimal" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="z. B. 150" className="input-luxe !py-2 disabled:opacity-40" /></div>
          <div><label className="eyebrow block mb-1">Zahlungsart</label><select disabled={Boolean(depositExemptionReason)} value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="input-luxe !py-2 disabled:opacity-40"><option>Überweisung</option><option>PayPal</option><option>Bar</option><option>Sonstige</option></select></div>
          <div><label className="eyebrow block mb-1">Anzahlung eingegangen am</label><input required={!depositExemptionReason} disabled={Boolean(depositExemptionReason)} type="date" value={depositPaidAt} onChange={(e) => setDepositPaidAt(e.target.value)} className="input-luxe !py-2 disabled:opacity-40" /></div>
        </div>
        <div className="flex items-center justify-between border-t border-champagne/20 pt-3"><span className="text-sm text-vanilla/65">Noch bar beim Termin</span><strong className="font-display text-2xl text-champagne">{Math.max(0, (Number(totalAmount.replace(",", ".")) || 0) - (Number(depositAmount.replace(",", ".")) || 0)).toLocaleString("de-DE")} €</strong></div>
      </div>

      {err && <div className="text-xs text-destructive">{err}</div>}

      {ok && (
        <div className="text-xs text-green-300">
          Termin wurde eingetragen und im Kalender gesperrt.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-gold w-full !py-3"
      >
        <CalendarPlus size={14} />
        {pending
          ? "Wird gespeichert…"
          : "Externen Termin eintragen"}
      </button>
    </form>
  );
}
export function useConfirmAmounts(
  mutate: (v: {
    id: string;
    status: "confirmed";
    anzahlung: number;
    bar: number;
  }) => void,
) {
  return (id: string) => {
    const tRaw = window.prompt("Gesamtpreis der Session in € (z. B. 450):", "300");
    if (tRaw === null) return;
    const aRaw = window.prompt("Davon Anzahlung in € (Rest wird bar bezahlt):", "150");
    if (aRaw === null) return;
    const total = Number(tRaw.replace(",", ".")) || 0;
    const anzahlung = Number(aRaw.replace(",", ".")) || 0;
    const bar = Math.max(0, total - anzahlung);
    mutate({
      id,
      status: "confirmed",
      anzahlung,
      bar,
    });
  };
}
