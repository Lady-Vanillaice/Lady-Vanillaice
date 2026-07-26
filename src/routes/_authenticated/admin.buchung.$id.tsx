import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getBookingDetail,
  updateBookingStatus,
  updateBookingNote,
  updateBookingSchedule,
  updateBookingType,
  updateBookingPayment,
  deleteBooking,
  markDepositPaid,
  sendPaymentReminder,
  sendPersonalMessage,
  sendContentdrehReply,
  previewPersonalMessage,
} from "@/lib/booking.functions";
import { PageHeader } from "../../components/site/PageHeader";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Euro,
  History,
  AlertCircle,
  Trash2,
  Circle,
  Hourglass,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/buchung/$id")({
  head: () => ({
    meta: [
      { title: "Buchungsdetails — Lady Vanilla Ice" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BookingDetailPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen pt-40 text-center text-vanilla/70">
      <AlertCircle className="mx-auto mb-3 text-bordeaux" />
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen pt-40 text-center text-vanilla/70">
      Buchung nicht gefunden.
    </div>
  ),
});

const RUBY_JUNE_NAME = "Ruby June";
const RUBY_JUNE_EMAIL = "mistress.ruby.june@gmail.com";

function BookingDetailPage() {
  const { id } = Route.useParams();
  console.log("BOOKING ID:", id);
  const router = useRouter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getBookingDetail);
  const updateStatus = useServerFn(updateBookingStatus);
  const saveNote = useServerFn(updateBookingNote);
  const saveSchedule = useServerFn(updateBookingSchedule);
  const saveBookingType = useServerFn(updateBookingType);
  const savePayment = useServerFn(updateBookingPayment);
  const markDepositPaidFn = useServerFn(markDepositPaid);
  const sendPaymentReminderFn = useServerFn(sendPaymentReminder);
  const sendPersonalMessageFn = useServerFn(sendPersonalMessage);
  const previewPersonalMessageFn = useServerFn(previewPersonalMessage);
  const sendContentdrehReplyFn = useServerFn(sendContentdrehReply);
  const deleteBookingFn = useServerFn(deleteBooking);

  const deleteMut = useMutation({
    mutationFn: () => deleteBookingFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
      navigate({ to: "/admin" });
    },
  });

  const detailQ = useQuery({
    queryKey: ["admin-booking-detail", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [confirmationNote, setConfirmationNote] = useState("");

// Terminart
const [bookingType, setBookingType] =
  useState<"single" | "duo">("single");

const [isContentShoot, setIsContentShoot] = useState(false);

// Termin-Überschreibung
const [overrideDate, setOverrideDate] = useState("");
  const [overrideTime, setOverrideTime] = useState(""); // hh:mm
  const [overrideDuration, setOverrideDuration] = useState<string>(""); // minutes as string
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Zahlung
  const [anzahlungInput, setAnzahlungInput] = useState<string>("");
  const [anzahlungMethod, setAnzahlungMethod] = useState<string>("");
  const [barInput, setBarInput] = useState<string>("");
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [depositPartnerRuby, setDepositPartnerRuby] = useState<boolean>(false);

  // Content-Dreh Antwort
  const [cdrProposedDate, setCdrProposedDate] = useState("");
  const [cdrPrice, setCdrPrice] = useState("");
  const [cdrDeposit, setCdrDeposit] = useState("");
  const [cdrMessage, setCdrMessage] = useState("");

  const [activeTab, setActiveTab] = useState<"overview" | "communication" | "schedule" | "history">("overview");


  useEffect(() => {
    if (detailQ.data?.booking) {
      const b = detailQ.data.booking as {
  admin_note: string | null;
  confirmation_note: string | null;
  requested_start: string | null;
  duration_minutes: number | null;
  anzahlung: number | string | null;
  anzahlung_method: string | null;
  bar: number | string | null;
  availability_slots?: {
    is_duo?: boolean | null;
    is_content_shoot?: boolean | null;
    duo_partner?: string | null;
  } | null;
};
      setNote(b.admin_note ?? "");
      setConfirmationNote(b.confirmation_note ?? "");
      if (b.availability_slots?.is_content_shoot) {
  setBookingType("content");
} else if (b.availability_slots?.is_duo) {
  setBookingType("duo");
} else {
  setBookingType("single");
}

setDuoPartner(b.availability_slots?.duo_partner ?? "");
      if (b.requested_start) {
        const d = new Date(b.requested_start);
        const pad = (n: number) => String(n).padStart(2, "0");
        setOverrideDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setOverrideTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setOverrideDate("");
        setOverrideTime("");
      }
      setOverrideDuration(b.duration_minutes ? String(b.duration_minutes) : "");
      setAnzahlungInput(b.anzahlung != null ? String(b.anzahlung) : "0");
      setAnzahlungMethod(b.anzahlung_method ?? "");
      setBarInput(b.bar != null ? String(b.bar) : "0");
    }
  }, [detailQ.data?.booking?.id]);

  const noteMut = useMutation({
    mutationFn: () => saveNote({ data: { id, admin_note: note } }),
    onSuccess: () => {
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
  });

  const scheduleMut = useMutation({
    mutationFn: () => {
      let iso: string | null = null;
      if (overrideDate && overrideTime) {
        const local = new Date(`${overrideDate}T${overrideTime}:00`);
        if (isNaN(local.getTime())) throw new Error("Ungültiges Datum/Uhrzeit");
        iso = local.toISOString();
      }
      const dur = overrideDuration.trim() ? Number(overrideDuration) : null;
      if (dur !== null && (!Number.isFinite(dur) || dur < 15 || dur > 24 * 60)) {
        throw new Error("Dauer muss zwischen 15 und 1440 Minuten liegen.");
      }
      return saveSchedule({ data: { id, requested_start: iso, duration_minutes: dur } });
    },
    onSuccess: () => {
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      router.invalidate();
    },
  });
  const bookingTypeMut = useMutation({
  mutationFn: () =>
    saveBookingType({
      data: {
        id,
        booking_type: bookingType,
        duo_partner:
          bookingType === "duo" ? duoPartner.trim() || null : null,
      },
    }),
  onSuccess: () => {
    setBookingTypeSaved(true);
    setTimeout(() => setBookingTypeSaved(false), 2500);
    qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    qc.invalidateQueries({ queryKey: ["admin-slots"] });
    router.invalidate();
  },
});

  const paymentMut = useMutation({
    mutationFn: () => {
      const a = Number((anzahlungInput || "0").replace(",", ".")) || 0;
      const b = Number((barInput || "0").replace(",", ".")) || 0;
      return savePayment({ data: { id, anzahlung: a, bar: b, anzahlung_method: anzahlungMethod.trim() || null } });
    },
    onSuccess: () => {
      setPaymentSaved(true);
      setTimeout(() => setPaymentSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  const depositPaidMut = useMutation({
    mutationFn: () => markDepositPaidFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
      router.invalidate();
    },
  });

  const reminderMut = useMutation({
    mutationFn: () => sendPaymentReminderFn({ data: { id } }),
    onSuccess: () => {
      alert("Zahlungserinnerung wurde versendet.");
    },
    onError: (err) => {
      alert(`Fehler: ${(err as Error).message}`);
    },
  });

  const personalMsgMut = useMutation({
    mutationFn: (v: {
      message: string;
      depositOverride?: number | null;
      barOverride?: number | null;
      depositPartnerName?: string | null;
      depositPartnerEmail?: string | null;
    }) => sendPersonalMessageFn({ data: { id, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      alert("Persönliche Nachricht wurde an den Gast versendet.");
    },
    onError: (err) => {
      alert(`Fehler: ${(err as Error).message}`);
    },
  });

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState<boolean>(true);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!previewOpen) return;
    const msg = confirmationNote.trim();
    if (!msg) {
      setPreviewHtml("");
      return;
    }
    const parsedDeposit = Number((anzahlungInput || "").replace(",", "."));
    const parsedBar = Number((barInput || "").replace(",", "."));
    const depositOverride = Number.isFinite(parsedDeposit) && parsedDeposit > 0 ? parsedDeposit : null;
    const barOverride = Number.isFinite(parsedBar) && parsedBar >= 0 ? parsedBar : null;

    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await previewPersonalMessageFn({
          data: {
            id,
            message: msg,
            depositOverride,
            barOverride,
            depositPartnerName: depositPartnerRuby ? RUBY_JUNE_NAME : null,
            depositPartnerEmail: depositPartnerRuby ? RUBY_JUNE_EMAIL : null,
          },
        });
        setPreviewHtml(res.html);
      } catch (err) {
        setPreviewHtml(
          `<pre style="font-family:sans-serif;color:#b00;padding:16px">Vorschau-Fehler: ${(err as Error).message}</pre>`,
        );
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [confirmationNote, previewOpen, id, previewPersonalMessageFn, anzahlungInput, barInput, depositPartnerRuby]);

  const contentdrehReplyMut = useMutation({
    mutationFn: (v: { proposedDate: string; price: string; depositAmount?: string; message?: string }) =>
      sendContentdrehReplyFn({ data: { id, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      alert("Content-Dreh-Antwort wurde an den Gast versendet.");
    },
    onError: (err) => {
      alert(`Fehler: ${(err as Error).message}`);
    },
  });




  const statusMut = useMutation({
    mutationFn: (v: {
      status: "confirmed" | "declined" | "cancelled" | "pending" | "rescheduling" | "waiting_deposit" | "open";
      decline_reason?: "services_not_offered" | "slot_taken" | "not_yet_offered" | "no_response";
      anzahlung?: number;
      bar?: number;
      confirmation_note?: string;
      deposit_partner_name?: string | null;
      deposit_partner_email?: string | null;
    }) => updateStatus({ data: {
      id,
      status: v.status,
      decline_reason: v.decline_reason,
      anzahlung: v.anzahlung,
      bar: v.bar,
      confirmation_note: v.confirmation_note,
      deposit_partner_name: v.deposit_partner_name,
      deposit_partner_email: v.deposit_partner_email,
    } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
      router.invalidate();
    },
  });

  function confirmBookingWithAmounts() {
    const anzahlung = Number((anzahlungInput || "0").replace(",", ".")) || 0;
    const bar = Number((barInput || "0").replace(",", ".")) || 0;
    const note = confirmationNote.trim();
    statusMut.mutate({
      status: "confirmed",
      anzahlung,
      bar,
      confirmation_note: note ? note : undefined,
      deposit_partner_name: depositPartnerRuby ? RUBY_JUNE_NAME : null,
      deposit_partner_email: depositPartnerRuby ? RUBY_JUNE_EMAIL : null,
    });
  }

  function reserveBookingWithAmounts() {
    const anzahlung = Number((anzahlungInput || "0").replace(",", ".")) || 0;
    const bar = Number((barInput || "0").replace(",", ".")) || 0;
    const note = confirmationNote.trim();
    statusMut.mutate({
      status: "waiting_deposit",
      anzahlung,
      bar,
      confirmation_note: note ? note : undefined,
      deposit_partner_name: depositPartnerRuby ? RUBY_JUNE_NAME : null,
      deposit_partner_email: depositPartnerRuby ? RUBY_JUNE_EMAIL : null,
    });
  }





  if (detailQ.isLoading) {
    return (
      <div className="min-h-screen pt-40 text-center text-vanilla/60">
        Wird geladen…
      </div>
    );
  }
  if (!detailQ.data) return null;

  const { booking, emails, photoUrl, photoPath } = detailQ.data;
 const slot = booking.availability_slots as
  | {
      starts_at: string;
      ends_at: string;
      location: string;
      is_duo?: boolean;
      is_content_shoot?: boolean;
      duo_partner?: string | null;
    }
  | null;
  const isDuoBooking = bookingType === "duo";

  // Price calc — same logic as the confirmation email (300 €/h, 50% deposit).
  const minutes = booking.duration_minutes ?? null;
  const total = minutes ? Math.round((minutes / 60) * 300) : null;
  const deposit = total ? Math.round(total * 0.5) : null;
  const rest = total && deposit ? total - deposit : null;

  const TABS = [
    { id: "overview" as const, label: "Übersicht" },
    { id: "communication" as const, label: "Kommunikation" },
    { id: "schedule" as const, label: "Termin & Zahlung" },
    { id: "history" as const, label: "Verlauf" },
  ];

  return (

    <>
      <PageHeader
        eyebrow="Buchungsdetails"
        title={
          <>
            <em className="font-script gold-text not-italic">
              {booking.guest_name}
            </em>
          </>
        }
      />

      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-xs text-vanilla/55 hover:text-champagne uppercase tracking-[0.2em] mb-8"
          >
            <ArrowLeft size={12} /> Zurück zur Übersicht
          </Link>

          {/* QUICK SUMMARY */}
          <div className="bg-card border border-champagne/15 p-5 mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-col">
              <span className="text-[0.55rem] uppercase tracking-[0.25em] text-vanilla/40 mb-1">Gast</span>
              <span className="font-display text-lg text-vanilla leading-none">{booking.guest_name}</span>
            </div>
            {slot && (
              <div className="flex flex-col">
                <span className="text-[0.55rem] uppercase tracking-[0.25em] text-vanilla/40 mb-1">Termin</span>
                <span className="text-sm text-vanilla/80 leading-none">
                  {format(new Date(booking.requested_start ?? slot.starts_at), "dd.MM.yyyy · HH:mm", { locale: de })} Uhr
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[0.55rem] uppercase tracking-[0.25em] text-vanilla/40 mb-1">Status</span>
              <StatusBadge status={booking.status} />
            </div>
            {(booking.anzahlung || 0) > 0 && (
              <div className="flex flex-col ml-auto">
                <span className="text-[0.55rem] uppercase tracking-[0.25em] text-vanilla/40 mb-1">Anzahlung</span>
                <span className={`text-sm leading-none ${booking.anzahlung_paid ? "text-green-300" : "text-champagne"}`}>
                  {booking.anzahlung_paid ? "✓ eingegangen" : `${Number(booking.anzahlung).toLocaleString("de-DE")} € offen`}
                </span>
              </div>
            )}
          </div>

          {/* TABS NAV */}
          <div className="flex flex-wrap gap-1 border-b border-champagne/15 mb-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-3 text-[0.65rem] uppercase tracking-[0.2em] transition border-b-2 -mb-px ${
                  activeTab === t.id
                    ? "border-champagne text-champagne"
                    : "border-transparent text-vanilla/50 hover:text-vanilla"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (<>
          {/* STATUS + ACTIONS */}

          <div className="bg-card border border-champagne/15 p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <div className="eyebrow mb-1">Status</div>
                <StatusBadge status={booking.status} />
              </div>
              <div className="text-[0.65rem] text-vanilla/45 text-right">
                <div>
                  Anfrage:{" "}
                  {format(new Date(booking.created_at), "dd.MM.yyyy HH:mm", {
                    locale: de,
                  })}
                </div>
                <div>
                  Aktualisiert:{" "}
                  {format(new Date(booking.updated_at), "dd.MM.yyyy HH:mm", {
                    locale: de,
                  })}
                </div>
              </div>
            </div>
            {booking.status === "waiting_deposit" && (() => {
              const untilMs = new Date(booking.updated_at).getTime() + 24 * 60 * 60_000;
              const diff = untilMs - Date.now();
              const expired = diff <= 0;
              const h = Math.max(0, Math.floor(diff / 3_600_000));
              const m = Math.max(0, Math.floor((diff % 3_600_000) / 60_000));
              const untilLabel = format(new Date(untilMs), "dd.MM.yyyy HH:mm 'Uhr'", { locale: de });
              return (
                <div className={`mb-4 border p-3 text-xs leading-relaxed ${expired ? "border-bordeaux/50 bg-bordeaux/10 text-vanilla/80" : "border-vanilla/30 bg-vanilla/5 text-vanilla/80"}`}>
                  <Hourglass size={12} className="inline mr-1 text-vanilla/70" />
                  {expired ? (
                    <>Reservierung <strong>abgelaufen</strong> (seit {untilLabel}). Der Zeitslot sollte manuell freigegeben werden, falls keine Anzahlung eingegangen ist.</>
                  ) : (
                    <>Reserviert bis <strong>{untilLabel}</strong> — noch <span className="tabular-nums">{h} Std {m.toString().padStart(2, "0")} Min</span>. Ohne Anzahlung wird der Zeitslot danach wieder freigegeben.</>
                  )}
                </div>
              );
            })()}
            {/* Primary — Reservieren / Bestätigen */}
            <div className="mb-3">
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-vanilla/35 mb-2">
                Antwort an den Gast
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={booking.status === "waiting_deposit" || statusMut.isPending}
                  onClick={() => reserveBookingWithAmounts()}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-vanilla/40 text-vanilla/85 hover:bg-vanilla/10 disabled:opacity-30 inline-flex items-center justify-center gap-1"
                  title="Termin für 24 h reservieren — Gast bekommt Reservierungsmail mit 24-h-Hinweis."
                >
                  <Hourglass size={12} /> Reservieren (24 h)
                </button>
                <button
                  disabled={booking.status === "confirmed" || statusMut.isPending}
                  onClick={() => confirmBookingWithAmounts()}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/50 bg-champagne/5 text-champagne hover:bg-champagne/15 disabled:opacity-30 inline-flex items-center justify-center gap-1"
                >
                  <CheckCircle2 size={12} /> Bestätigen
                </button>
              </div>
            </div>

            {/* Negative — Ablehnen / Stornieren */}
            <div className="mb-3">
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-vanilla/35 mb-2">
                Absagen
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DeclineButtonDetail
                  disabled={booking.status === "declined" || statusMut.isPending}
                  onPick={(reason) => statusMut.mutate({ status: "declined", decline_reason: reason })}
                />
                <button
                  disabled={booking.status === "cancelled" || statusMut.isPending}
                  onClick={() => statusMut.mutate({ status: "cancelled" })}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-vanilla/25 text-vanilla/70 hover:bg-vanilla/5 disabled:opacity-30"
                >
                  Stornieren
                </button>
              </div>
            </div>

            {/* Interne Status */}
            <div className="mb-3">
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-vanilla/35 mb-2">
                Interner Status <span className="text-vanilla/30 normal-case tracking-normal">(keine Mail an Gast)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={booking.status === "rescheduling" || statusMut.isPending}
                  onClick={() => statusMut.mutate({ status: "rescheduling" })}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/30 text-champagne/90 hover:bg-champagne/10 disabled:opacity-30"
                >
                  Umplanen
                </button>
                <button
                  disabled={booking.status === "waiting_deposit" || statusMut.isPending}
                  onClick={() => statusMut.mutate({ status: "waiting_deposit" })}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-30 inline-flex items-center justify-center gap-1"
                >
                  <Clock size={12} /> Wartend
                </button>
                <button
                  disabled={booking.status === "open" || statusMut.isPending}
                  onClick={() => statusMut.mutate({ status: "open" })}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-sky-500/40 text-sky-200 hover:bg-sky-500/10 disabled:opacity-30 inline-flex items-center justify-center gap-1"
                >
                  <Circle size={12} /> Offen
                </button>
                <button
                  disabled={booking.status === "pending" || statusMut.isPending}
                  onClick={() => statusMut.mutate({ status: "pending" })}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-vanilla/20 text-vanilla/55 hover:bg-vanilla/5 disabled:opacity-30"
                >
                  Zurücksetzen
                </button>
              </div>
            </div>

            {/* Danger — Endgültig löschen mit Inline-Bestätigung */}
            <div className="pt-3 border-t border-bordeaux/20">
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-bordeaux/70 mb-2">
                Gefahrenzone
              </div>
              <DeleteInline
                guestName={booking.guest_name}
                pending={deleteMut.isPending}
                error={deleteMut.error instanceof Error ? deleteMut.error.message : null}
                onConfirm={() => deleteMut.mutate()}
              />
            </div>

          </div>

          {/* KONTAKT + TERMIN */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-champagne/15 p-6">
              <div className="eyebrow mb-3">Gast</div>
              <div className="text-vanilla font-medium mb-1">
                {booking.guest_name}
              </div>
              <a
                href={`mailto:${booking.guest_email}`}
                className="text-sm text-champagne hover:underline inline-flex items-center gap-2"
              >
                <Mail size={12} /> {booking.guest_email}
              </a>
              {booking.guest_phone && (
                <a
                  href={`tel:${booking.guest_phone}`}
                  className="text-sm text-champagne hover:underline inline-flex items-center gap-2 mt-1"
                >
                  <Phone size={12} /> {booking.guest_phone}
                </a>
              )}
            </div>

            <div className="bg-card border border-champagne/15 p-6">
              <div className="eyebrow mb-3">Termin</div>
              {slot ? (
                <div className="space-y-1 text-sm text-vanilla/80">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-champagne" />
                    {format(new Date(slot.starts_at), "EEEE, dd.MM.yyyy", {
                      locale: de,
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-champagne" />
                    {booking.requested_start
                      ? `${format(new Date(booking.requested_start), "HH:mm", { locale: de })}${
                          booking.duration_minutes
                            ? ` – ${format(
                                new Date(
                                  new Date(booking.requested_start).getTime() +
                                    booking.duration_minutes * 60_000,
                                ),
                                "HH:mm",
                                { locale: de },
                              )}`
                            : ""
                        }`
                      : `${format(new Date(slot.starts_at), "HH:mm", { locale: de })} – ${format(new Date(slot.ends_at), "HH:mm", { locale: de })}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-champagne" />
                    {slot.location}
                  </div>
                  {booking.duration && (
                    <div className="text-vanilla/55 text-xs mt-2">
                      Dauer-Wunsch: {booking.duration}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-vanilla/55 text-sm">
                  Kein Termin verknüpft (individuelle Anfrage &gt; 3 Std.).
                </div>
              )}
            </div>
          </div>

          {/* NACHRICHT / VORLIEBEN DES GASTS */}
          <div className="bg-card border border-champagne/15 p-6 mb-6">
            <div className="eyebrow mb-3 flex items-center gap-2">
              <MessageSquare size={12} /> Nachricht &amp; Vorlieben von {booking.guest_name}
            </div>
            <p className="text-sm text-vanilla/80 leading-relaxed whitespace-pre-line bg-anthracite/40 p-4 border border-champagne/10">
              {booking.message || "—"}
            </p>
          </div>

          {/* CONTENT-DREH FOTO */}
          {photoUrl && (
            <div className="bg-card border border-champagne/15 p-6 mb-6">
              <div className="eyebrow mb-3">Foto vom Gast</div>
              <a href={photoUrl} target="_blank" rel="noreferrer" className="inline-block">
                <img
                  src={photoUrl}
                  alt="Foto vom Gast"
                  className="max-h-96 border border-champagne/40 hover:border-champagne transition"
                />
              </a>
              <div className="text-[0.65rem] text-vanilla/45 mt-2 font-mono break-all">
                {photoPath}
              </div>
              <div className="text-[0.6rem] text-vanilla/40 mt-1">
                Link ist 30 Minuten gültig — Seite neu laden für neuen Link.
              </div>
            </div>
          )}
          </>)}

          {activeTab === "communication" && (<>
          {/* PERSÖNLICHE NACHRICHT — separat versendbar */}

          <div className="bg-card border border-champagne/15 p-6 mb-6">
            <div className="eyebrow mb-3 flex items-center justify-between gap-2">
              <span>Persönliche Nachricht an den Gast</span>
              <span className="text-[0.6rem] text-vanilla/45 normal-case tracking-normal">
                Wird in mehreren E-Mails verwendet — siehe unten
              </span>
            </div>

            {/* Erklärung: welche Nachricht landet in welcher E-Mail? */}
            <div className="mb-4 border border-champagne/25 bg-anthracite/40 p-4 text-[0.7rem] text-vanilla/75 leading-relaxed space-y-2">
              <div className="eyebrow text-champagne mb-1">
                Dieser Text erscheint in <span className="text-vanilla">3 verschiedenen E-Mails</span> — je nachdem, welchen Button du drückst:
              </div>
              <div>
                <span className="text-champagne">1. „Nachricht senden"</span> (unten in diesem Kasten) →
                der Gast bekommt eine <strong>eigenständige E-Mail</strong> nur mit deinem Text,
                Kontaktdaten und Hinweis auf die 50 %-Anzahlung. Nutze das für lockere Kontaktaufnahme,
                Rückfragen oder wenn der Termin noch nicht steht.
              </div>
              <div>
                <span className="text-champagne">2. „Bestätigen"</span> (oben, Status-Buttons) →
                der Text erscheint in der E-Mail <strong>„Termin reserviert — Anzahlung ausstehend"</strong>
                im Abschnitt <em>„Persönliche Nachricht"</em>.
              </div>
              <div>
                <span className="text-champagne">3. „Anzahlung erhalten"</span> (weiter unten bei Zahlungen) →
                der Text erscheint in der E-Mail <strong>„Termin final bestätigt"</strong>
                im Abschnitt <em>„Persönliche Nachricht"</em>. Nutze diesen Text für die endgültige
                Bestätigung (z. B. Anfahrt, Klingelschild, Erinnerung an Rasur o. Ä.).
              </div>
              <div className="text-[0.65rem] text-vanilla/50 pt-1 border-t border-champagne/15 mt-2">
                Tipp: Text erst hier eintragen und speichern (mit „Nachricht senden" oder einem der
                anderen Buttons) — er wird dann automatisch in der jeweiligen E-Mail mitgeschickt.
                Willst du unterschiedliche Texte für Reservierung und finale Bestätigung, tausche
                den Text zwischen den beiden Klicks aus.
              </div>
            </div>

            <textarea
              value={confirmationNote}
              onChange={(e) => setConfirmationNote(e.target.value)}
              placeholder="Schreibe hier deine persönliche Nachricht an den Gast…"
              rows={5}
              maxLength={2000}
              className="input-luxe w-full resize-y min-h-[120px] text-sm leading-relaxed"
            />
            {isDuoBooking ? (
              <label className="mt-3 flex items-start gap-3 border border-champagne/25 bg-anthracite/40 p-3 cursor-pointer hover:bg-anthracite/60 transition-colors">
                <input
                  type="checkbox"
                  checked={depositPartnerRuby}
                  onChange={(e) => setDepositPartnerRuby(e.target.checked)}
                  className="mt-1 accent-champagne"
                />
                <div className="flex-1">
                  <div className="text-[0.75rem] text-vanilla leading-snug">
                    Duo-Anzahlung teilen mit <strong>Ruby June</strong>
                  </div>
                  <div className="text-[0.65rem] text-vanilla/55 mt-1 leading-snug">
                    Fügt der E-Mail den Hinweis hinzu, dass der Anteil an Ruby Junes PayPal-Adresse{" "}
                    <span className="text-champagne">{RUBY_JUNE_EMAIL}</span> gesendet werden soll.
                  </div>
                </div>
              </label>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[0.6rem] text-vanilla/40">
                {confirmationNote.length}/2000 Zeichen
              </span>
              <button
                type="button"
                disabled={!confirmationNote.trim() || personalMsgMut.isPending}
                onClick={() => {
                  const msg = confirmationNote.trim();
                  if (!msg) return;
                  if (
                    confirm(
                      'Persönliche Nachricht jetzt als eigene E-Mail an den Gast senden?\n\nDie E-Mail enthält deinen Text sowie Kontaktmöglichkeiten (E-Mail & WhatsApp) und den Hinweis auf die 50 %-Anzahlung.\n\nHinweis: Für „Termin reserviert" oder „Termin final bestätigt" musst du stattdessen die entsprechenden Buttons drücken — dieser Text wird dort automatisch mitgeschickt.',
                    )
                  ) {
                    const parsedDeposit = Number((anzahlungInput || "").replace(",", "."));
                    const parsedBar = Number((barInput || "").replace(",", "."));
                    personalMsgMut.mutate({
                      message: msg,
                      depositOverride: Number.isFinite(parsedDeposit) && parsedDeposit > 0 ? parsedDeposit : null,
                      barOverride: Number.isFinite(parsedBar) && parsedBar >= 0 ? parsedBar : null,
                      depositPartnerName: depositPartnerRuby ? RUBY_JUNE_NAME : null,
                      depositPartnerEmail: depositPartnerRuby ? RUBY_JUNE_EMAIL : null,
                    });
                  }
                }}
                className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30 inline-flex items-center gap-1"
              >
                <Mail size={12} /> {personalMsgMut.isPending ? "Wird gesendet…" : "Nachricht senden"}
              </button>
            </div>


            <div className="mt-5 border-t border-champagne/15 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="eyebrow">Live-Vorschau der E-Mail</span>
                <div className="flex items-center gap-3">
                  {previewLoading ? (
                    <span className="text-[0.6rem] text-vanilla/45">Wird aktualisiert…</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPreviewOpen((v) => !v)}
                    className="text-[0.6rem] uppercase tracking-[0.2em] px-2 py-1 border border-champagne/30 text-champagne/80 hover:bg-champagne/10"
                  >
                    {previewOpen ? "Ausblenden" : "Einblenden"}
                  </button>
                </div>
              </div>
              {previewOpen ? (
                confirmationNote.trim() ? (
                  <iframe
                    title="E-Mail-Vorschau"
                    srcDoc={previewHtml}
                    className="w-full h-[520px] bg-white border border-champagne/20"
                    sandbox=""
                  />
                ) : (
                  <div className="text-[0.7rem] text-vanilla/45 border border-dashed border-champagne/20 p-6 text-center">
                    Sobald du oben Text eingibst, erscheint hier die E-Mail-Vorschau (wie sie beim
                    Gast ankommt) – inklusive Anzahlungs- und Kontaktblock.
                  </div>
                )
              ) : null}
            </div>
          </div>


          {/* CONTENT-DREH ANTWORT — nur für Content-Dreh-Anfragen */}
          {bookingType === "content" && (
            <div className="bg-card border border-champagne/15 p-6 mb-6">
              <div className="eyebrow mb-3 flex items-center justify-between gap-2">
                <span>Content-Dreh · Individuelle Antwort</span>
                <span className="text-[0.6rem] text-vanilla/45 normal-case tracking-normal">
                  Terminvorschlag, Preis & 50 %-Anzahlung
                </span>
              </div>
              <p className="text-[0.7rem] text-vanilla/55 mb-4 leading-relaxed">
                Sende dem Gast einen strukturierten Terminvorschlag inkl. Preis und Hinweis auf
                die 50 %-Anzahlung. Die E-Mail enthält zusätzlich Kontaktmöglichkeiten
                (E-Mail & WhatsApp).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="md:col-span-2">
                  <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                    Terminvorschlag *
                  </label>
                  <input
                    type="text"
                    value={cdrProposedDate}
                    onChange={(e) => setCdrProposedDate(e.target.value)}
                    placeholder="z. B. Freitag, 24.07.2026, 15:00 Uhr"
                    maxLength={200}
                    className="input-luxe w-full"
                  />
                </div>
                <div>
                  <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                    Preis *
                  </label>
                  <input
                    type="text"
                    value={cdrPrice}
                    onChange={(e) => setCdrPrice(e.target.value)}
                    placeholder="z. B. 500 €"
                    maxLength={50}
                    className="input-luxe w-full"
                  />
                </div>
                <div>
                  <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                    Anzahlung (50 %)
                  </label>
                  <input
                    type="text"
                    value={cdrDeposit}
                    onChange={(e) => setCdrDeposit(e.target.value)}
                    placeholder="z. B. 250 €"
                    maxLength={50}
                    className="input-luxe w-full"
                  />
                </div>
              </div>
              <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                Zusätzliche Nachricht (optional)
              </label>
              <textarea
                value={cdrMessage}
                onChange={(e) => setCdrMessage(e.target.value)}
                placeholder="Persönlicher Text, Absprachen, Details zum Dreh…"
                rows={4}
                maxLength={2000}
                className="input-luxe w-full resize-y min-h-[100px] text-sm leading-relaxed"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[0.6rem] text-vanilla/40">
                  {cdrMessage.length}/2000 Zeichen
                </span>
                <button
                  type="button"
                  disabled={
                    !cdrProposedDate.trim() ||
                    !cdrPrice.trim() ||
                    contentdrehReplyMut.isPending
                  }
                  onClick={() => {
                    if (
                      confirm(
                        "Content-Dreh-Antwort jetzt an den Gast senden?",
                      )
                    ) {
                      contentdrehReplyMut.mutate({
                        proposedDate: cdrProposedDate.trim(),
                        price: cdrPrice.trim(),
                        depositAmount: cdrDeposit.trim() || undefined,
                        message: cdrMessage.trim() || undefined,
                      });
                    }
                  }}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30 inline-flex items-center gap-1"
                >
                  <Mail size={12} />{" "}
                  {contentdrehReplyMut.isPending ? "Wird gesendet…" : "Antwort senden"}
                </button>
              </div>
            </div>
          )}
          </>)}

          {activeTab === "schedule" && (<>
          {/* INTERNE NOTIZ — editierbar */}

          <div className="bg-card border border-champagne/15 p-6 mb-6">
            <div className="eyebrow mb-3 flex items-center justify-between gap-2">
              <span>Interne Notiz (nur für dich sichtbar)</span>
              {noteSaved && (
                <span className="text-[0.6rem] text-green-300 normal-case tracking-normal">
                  ✓ gespeichert
                </span>
              )}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Eigene Notizen zum Gast, Vorlieben, Absprachen, Wiederholungsbuchung …"
              rows={5}
              maxLength={2000}
              className="input-luxe w-full resize-y min-h-[120px] text-sm leading-relaxed"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[0.6rem] text-vanilla/40">
                {note.length}/2000 Zeichen
              </span>
              <button
                type="button"
                disabled={
                  noteMut.isPending ||
                  (note ?? "") === (booking.admin_note ?? "")
                }
                onClick={() => noteMut.mutate()}
                className="text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"
              >
                {noteMut.isPending ? "Speichere…" : "Notiz speichern"}
              </button>
            </div>
            {noteMut.error && (
              <p className="mt-3 text-xs text-bordeaux">
                {(noteMut.error as Error).message}
              </p>
            )}
          </div>
{/* TERMINART */}
<div className="bg-card border border-champagne/15 p-6 mb-6">
  <div className="eyebrow mb-3 flex items-center justify-between gap-2">
    <span>Terminart</span>
    {bookingTypeSaved && (
      <span className="text-[0.6rem] text-green-300 normal-case tracking-normal">
        ✓ gespeichert
      </span>
    )}
  </div>

  <div className="grid grid-cols-3 gap-2">
    {[
      { value: "single" as const, label: "Single" },
      { value: "duo" as const, label: "Duo" },
      { value: "content" as const, label: "Content" },
    ].map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => setBookingType(option.value)}
        className={`text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border transition ${
          bookingType === option.value
            ? "border-champagne bg-champagne/15 text-champagne"
            : "border-champagne/25 text-vanilla/60 hover:border-champagne/60 hover:text-vanilla"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>

  {bookingType === "duo" && (
    <div className="mt-3">
      <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
        Duo-Partner
      </label>
      <input
        type="text"
        value={duoPartner}
        onChange={(e) => setDuoPartner(e.target.value)}
        placeholder="z. B. Ruby June"
        className="input-luxe w-full"
      />
    </div>
  )}

  <div className="mt-4 flex items-center justify-end">
    <button
      type="button"
      disabled={bookingTypeMut.isPending}
      onClick={() => bookingTypeMut.mutate()}
      className="text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"
    >
      {bookingTypeMut.isPending ? "Speichere…" : "Terminart speichern"}
    </button>
  </div>

  {bookingTypeMut.error && (
    <p className="mt-3 text-xs text-bordeaux">
      {(bookingTypeMut.error as Error).message}
    </p>
  )}
</div>

          {/* TERMIN-ÜBERSCHREIBUNG */}
          <div className="bg-card border border-champagne/15 p-6 mb-6">
            <div className="eyebrow mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Calendar size={12} /> Termin überschreiben
              </span>
              {scheduleSaved && (
                <span className="text-[0.6rem] text-green-300 normal-case tracking-normal">
                  ✓ gespeichert
                </span>
              )}
            </div>
            <p className="text-[0.7rem] text-vanilla/55 mb-4 leading-relaxed">
              Trage hier manuell Datum, Uhrzeit und Dauer ein — z. B. wenn ihr euch
              auf den Ausweichtermin oder einen ganz anderen Zeitpunkt geeinigt habt.
              Leer lassen entfernt die Überschreibung.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="input-luxe w-full"
                />
              </div>
              <div>
                <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                  Uhrzeit
                </label>
                <input
                  type="time"
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  className="input-luxe w-full"
                />
              </div>
              <div>
                <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                  Dauer (Minuten)
                </label>
                <input
                  type="number"
                  min={15}
                  max={1440}
                  step={15}
                  value={overrideDuration}
                  onChange={(e) => setOverrideDuration(e.target.value)}
                  placeholder="z. B. 90"
                  className="input-luxe w-full"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                disabled={scheduleMut.isPending}
                onClick={() => scheduleMut.mutate()}
                className="text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"
              >
                {scheduleMut.isPending ? "Speichere…" : "Termin speichern"}
              </button>
            </div>
            {scheduleMut.error && (
              <p className="mt-3 text-xs text-bordeaux">
                {(scheduleMut.error as Error).message}
              </p>
            )}
          </div>

          {/* ZAHLUNG — freie Beträge */}
          <div className="bg-card border border-champagne/15 p-6 mb-6">
            <div className="eyebrow mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Euro size={12} /> Zahlung
              </span>
              {paymentSaved && (
                <span className="text-[0.6rem] text-green-300 normal-case tracking-normal">
                  ✓ gespeichert
                </span>
              )}
            </div>
            <p className="text-[0.7rem] text-vanilla/55 mb-4 leading-relaxed">
              Trage die tatsächlich vereinbarten Beträge ein — Standard ist 300 €/Std.,
              aber du kannst hier frei überschreiben. Diese Werte fließen ins Kassenbuch
              und in die Bestätigungs-E-Mail an den Gast.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                  Anzahlung (€)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={anzahlungInput}
                  onChange={(e) => setAnzahlungInput(e.target.value)}
                  placeholder="0"
                  className="input-luxe w-full"
                />
              </div>
              <div>
                <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                  Bar vor Ort (€)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={barInput}
                  onChange={(e) => setBarInput(e.target.value)}
                  placeholder="0"
                  className="input-luxe w-full"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1">
                Zahlungsart der Anzahlung
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {["Bank", "PayPal", "Bar", "Sonstige"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnzahlungMethod(opt)}
                    className={`text-[0.65rem] uppercase tracking-[0.15em] px-3 py-1.5 border transition ${
                      anzahlungMethod === opt
                        ? "border-champagne bg-champagne/15 text-champagne"
                        : "border-champagne/30 text-vanilla/60 hover:border-champagne/60 hover:text-vanilla"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={anzahlungMethod}
                onChange={(e) => setAnzahlungMethod(e.target.value)}
                placeholder="z. B. Bank, PayPal, Revolut …"
                className="input-luxe w-full"
              />
              <p className="mt-1.5 text-[0.6rem] text-vanilla/40 leading-relaxed">
                Optional — nur für deine interne Übersicht (wird nicht an den Gast gesendet).
              </p>
            </div>
            {total ? (
              <p className="mt-4 text-[0.65rem] text-vanilla/40 leading-relaxed">
                Standard-Rechnung: {total.toLocaleString("de-DE")} € gesamt
                ({deposit!.toLocaleString("de-DE")} € Anzahlung + {rest!.toLocaleString("de-DE")} € Rest bar) —
                überschreibe die Felder oben bei Sondervereinbarungen.
              </p>
            ) : (
              <p className="mt-4 text-[0.65rem] text-vanilla/40 leading-relaxed">
                Keine Dauer hinterlegt — Betrag wird individuell vereinbart.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {(booking.anzahlung || 0) > 0 && (
                <span className={`text-[0.65rem] uppercase tracking-[0.15em] px-3 py-1.5 ${booking.anzahlung_paid ? "bg-green-700/30 text-green-200" : "bg-champagne/15 text-champagne"}`}>
                  {booking.anzahlung_paid
                    ? "✓ Anzahlung eingegangen"
                    : `Anzahlung offen: ${Number(booking.anzahlung).toLocaleString("de-DE")} €`}
                </span>
              )}
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {(booking.anzahlung || 0) > 0 && !booking.anzahlung_paid && booking.status === "confirmed" && (
                  <button
                    type="button"
                    disabled={reminderMut.isPending}
                    onClick={() => {
                      if (confirm("Zahlungserinnerung an den Gast senden?")) {
                        reminderMut.mutate();
                      }
                    }}
                    className="text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-champagne/60 text-champagne hover:bg-champagne/10 disabled:opacity-30"
                  >
                    {reminderMut.isPending ? "Sende…" : "Zahlungserinnerung senden"}
                  </button>
                )}
                {(booking.anzahlung || 0) > 0 && !booking.anzahlung_paid && booking.status === "confirmed" && (
                  <button
                    type="button"
                    disabled={depositPaidMut.isPending}
                    onClick={() => {
                      if (confirm("Anzahlung als eingegangen markieren? Der Gast bekommt dann die finale Bestätigung mit Hinweis auf den Restbetrag bar vor Ort.")) {
                        depositPaidMut.mutate();
                      }
                    }}
                    className="text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-green-600/60 text-green-300 hover:bg-green-700/20 disabled:opacity-30"
                  >
                    {depositPaidMut.isPending ? "Wird markiert…" : "Anzahlung eingegangen"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={paymentMut.isPending}
                  onClick={() => paymentMut.mutate()}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"
                >
                  {paymentMut.isPending ? "Speichere…" : "Zahlung speichern"}
                </button>
              </div>
            </div>
            {depositPaidMut.error && (
              <p className="mt-3 text-xs text-bordeaux">
                {(depositPaidMut.error as Error).message}
              </p>
            )}
            {paymentMut.error && (
              <p className="mt-3 text-xs text-bordeaux">
                {(paymentMut.error as Error).message}
              </p>
            )}
          </div>
          </>)}

          {activeTab === "history" && (<>
          {/* HISTORIE */}

          <div className="bg-card border border-champagne/15 p-6">
            <div className="eyebrow mb-4 flex items-center gap-2">
              <History size={12} /> Verlauf
            </div>
            <ol className="space-y-3 text-sm">
              {(() => {
                type Entry =
                  | { kind: "created"; at: string }
                  | { kind: "status"; at: string }
                  | {
                      kind: "email";
                      at: string;
                      id: string;
                      template_name: string;
                      recipient_email: string;
                      status: string;
                      error_message: string | null;
                    };
                const entries: Entry[] = [
                  { kind: "created", at: booking.created_at },
                  ...emails.map((e) => ({
                    kind: "email" as const,
                    at: e.created_at,
                    id: e.id,
                    template_name: e.template_name,
                    recipient_email: e.recipient_email,
                    status: e.status,
                    error_message: e.error_message,
                  })),
                ];
                if (booking.updated_at !== booking.created_at) {
                  entries.push({ kind: "status", at: booking.updated_at });
                }
                entries.sort(
                  (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
                );
                return entries.map((entry, idx) => {
                  if (entry.kind === "created") {
                    return (
                      <li key={`created-${idx}`} className="flex gap-3">
                        <span className="text-champagne mt-1">●</span>
                        <div>
                          <div className="text-vanilla">Anfrage eingegangen</div>
                          <div className="text-[0.65rem] text-vanilla/45">
                            {format(new Date(entry.at), "dd.MM.yyyy 'um' HH:mm", { locale: de })}
                          </div>
                        </div>
                      </li>
                    );
                  }
                  if (entry.kind === "status") {
                    return (
                      <li key={`status-${idx}`} className="flex gap-3">
                        <span className="text-champagne mt-1">●</span>
                        <div>
                          <div className="text-vanilla">
                            Status zuletzt geändert auf{" "}
                            <span className="text-champagne">{booking.status}</span>
                          </div>
                          <div className="text-[0.65rem] text-vanilla/45">
                            {format(new Date(entry.at), "dd.MM.yyyy 'um' HH:mm", { locale: de })}
                          </div>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={entry.id} className="flex gap-3">
                      <span
                        className={`mt-1 ${
                          entry.status === "sent"
                            ? "text-green-400"
                            : entry.status === "dlq" || entry.status === "failed" || entry.status === "bounced"
                              ? "text-bordeaux"
                              : "text-vanilla/40"
                        }`}
                      >
                        ●
                      </span>
                      <div className="flex-1">
                        <div className="text-vanilla">
                          E-Mail: {prettyTemplate(entry.template_name)}{" "}
                          <span className="text-[0.6rem] text-vanilla/60 normal-case tracking-normal ml-1">
                            {prettyEmailStatus(entry.status)}
                          </span>
                        </div>
                        <div className="text-[0.65rem] text-vanilla/45">
                          an {entry.recipient_email} ·{" "}
                          {format(new Date(entry.at), "dd.MM.yyyy HH:mm", { locale: de })}
                          {" · "}
                          <Link
                            to="/admin/email-vorschau/$logId"
                            params={{ logId: entry.id }}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-champagne hover:underline"
                          >
                            Nachricht ansehen
                          </Link>
                        </div>
                        {entry.error_message && (
                          <div className="text-[0.65rem] text-bordeaux mt-1">
                            {entry.error_message}
                          </div>
                        )}
                      </div>

                    </li>
                  );
                });
              })()}
            </ol>
          </div>
          </>)}
        </div>

      </section>
    </>
  );
}

function prettyTemplate(name: string) {
  switch (name) {
    case "booking-confirmation":
      return "Eingangsbestätigung (an Gast)";
    case "booking-notification":
      return "Benachrichtigung (an dich)";
    case "booking-confirmed":
      return "Termin-Bestätigung (an Gast)";
    case "booking-declined":
      return "Absage (an Gast)";
    default:
      return name;
  }
}

function prettyEmailStatus(status: string) {
  switch (status) {
    case "sent":
      return "✓ zugestellt";
    case "pending":
      return "wird versendet…";
    case "failed":
    case "dlq":
      return "fehlgeschlagen";
    case "bounced":
      return "unzustellbar";
    case "suppressed":
      return "blockiert";
    case "complained":
      return "als Spam markiert";
    default:
      return status;
  }
}

function StatusBadge({
  status,
}: {
  status: "pending" | "confirmed" | "declined" | "cancelled" | "rescheduling" | "waiting_deposit" | "open";
}) {
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
  return (
    <span
      className={`text-xs uppercase tracking-[0.2em] px-3 py-1.5 ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

type DeclineReason = "services_not_offered" | "slot_taken" | "not_yet_offered" | "no_response";

const DECLINE_REASONS_DETAIL: { value: DeclineReason; label: string }[] = [
  { value: "services_not_offered", label: "Leistungen biete ich nicht an" },
  { value: "slot_taken", label: "Termin schon belegt" },
  { value: "not_yet_offered", label: "Praktik noch nicht im Angebot" },
  { value: "no_response", label: "Keine Antwort erhalten" },
];

function DeclineButtonDetail({
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
            {DECLINE_REASONS_DETAIL.map((r) => (
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

function DeleteInline({
  guestName,
  pending,
  error,
  onConfirm,
}: {
  guestName: string;
  pending: boolean;
  error: string | null;
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
        <Trash2 size={12} /> Endgültig löschen
      </button>
    );
  }
  return (
    <div className="border border-bordeaux/40 bg-bordeaux/10 p-3 space-y-2">
      <p className="text-xs text-vanilla/85 leading-relaxed">
        Anfrage von <strong>{guestName}</strong> wirklich endgültig löschen?
        Dieser Vorgang kann nicht rückgängig gemacht werden.
      </p>
      {error && <p className="text-xs text-bordeaux">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux bg-bordeaux/30 text-vanilla hover:bg-bordeaux/50 disabled:opacity-40 inline-flex items-center gap-1"
        >
          <Trash2 size={12} /> {pending ? "Lösche…" : "Ja, löschen"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setArmed(false)}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-vanilla/30 text-vanilla/70 hover:bg-vanilla/5 disabled:opacity-40"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

