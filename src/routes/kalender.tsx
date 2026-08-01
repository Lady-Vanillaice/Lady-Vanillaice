import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listUpcomingSlots,
  proposeBookingTime,
  submitBooking,
  getSlotAvailability,
} from "@/lib/public-booking.functions";
import { PageHeader } from "../components/site/PageHeader";
import { ChevronLeft, ChevronRight, MapPin, Clock, Crown, CheckCircle2, Sparkles } from "lucide-react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTr, useLang } from "@/i18n";

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  buffer_minutes: number | null;
  is_duo: boolean;
  is_content_shoot: boolean;
  duo_partner: string | null;
  is_fully_booked: boolean;
  has_booking?: boolean;
  is_reserved?: boolean;
  reserved_until?: string | null;
  windows?: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    location: string;
    buffer_minutes: number | null;
    is_duo: boolean;
    is_content_shoot: boolean;
    duo_partner: string | null;
    is_fully_booked?: boolean;
  }>;
};

const CALENDAR_TIME_ZONE = "Europe/Berlin";

function formatMunichTime(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: CALENDAR_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function formatMunichDate(value: string | Date, lang: "de" | "en") {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "de-DE", {
    timeZone: CALENDAR_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

function formatMunichCalendarKey(value: string | Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getMunichOffsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return (asUtc - date.getTime()) / 60_000;
}

function munichWallTimeToIso(slotDateIso: string, hm: string) {
  const dateParts = formatMunichCalendarKey(slotDateIso).split("-").map(Number);
  const timeParts = hm.split(":").map(Number);
  const wallAsUtc = Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0, 0);
  const offset = getMunichOffsetMinutes(new Date(wallAsUtc));
  return new Date(wallAsUtc - offset * 60_000).toISOString();
}

function formatReservedRemaining(untilIso: string): string | null {
  const untilMs = new Date(untilIso).getTime();
  const diff = untilMs - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 1) return `${h} h ${m.toString().padStart(2, "0")} min`;
  return `${m} min`;
}

type DurationOpt = { value: number | "custom" | "ganztags"; label: string };
function getDurations(lang: "de" | "en"): DurationOpt[] {
  const en = lang === "en";
  return [
    { value: 30, label: en ? "30 minutes (0.5 h)" : "30 Minuten (0,5 Std.)" },
    { value: 60, label: en ? "60 minutes (1 h)" : "60 Minuten (1 Std.)" },
    { value: 90, label: en ? "90 minutes (1.5 h)" : "90 Minuten (1,5 Std.)" },
    { value: 120, label: en ? "120 minutes (2 h)" : "120 Minuten (2 Std.)" },
    { value: 180, label: en ? "180 minutes (3 h)" : "180 Minuten (3 Std.)" },
    { value: 240, label: en ? "240 minutes (4 h)" : "240 Minuten (4 Std.)" },
    { value: 300, label: en ? "300 minutes (5 h)" : "300 Minuten (5 Std.)" },
    { value: 360, label: en ? "360 minutes (6 h)" : "360 Minuten (6 Std.)" },
    { value: 420, label: en ? "420 minutes (7 h)" : "420 Minuten (7 Std.)" },
    { value: "ganztags", label: en ? "All day — entire available window" : "Ganztags — gesamtes verfügbares Zeitfenster" },
    { value: "custom", label: en ? "Custom — please specify in the message" : "Individuell — bitte in der Nachricht angeben" },
  ];
}

export const Route = createFileRoute("/kalender")({
  head: () => ({
    meta: [
      { title: "Termin buchen – Domina München & Umgebung | Lady Vanilla Ice" },
      { name: "description", content: "Freie Termine für Domina-Sessions in München und Umgebung. Online Kalender ansehen und diskret anfragen." },
      { property: "og:title", content: "Termin buchen – Domina München & Umgebung" },
      { property: "og:description", content: "Verfügbare Session-Termine in München & Umgebung. Diskret und direkt anfragen." },
      { property: "og:url", content: "https://lady-vanillaice.com/kalender" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/kalender" }],
  }),
  component: KalenderPage,
});

function KalenderPage() {
  const list = useServerFn(listUpcomingSlots);
  const tr = useTr();
  const { lang } = useLang();
  const slotsQ = useQuery({
    queryKey: ["public-slots"],
    queryFn: () => list(),
    staleTime: 30_000,
  });

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const slotByDay = useMemo(() => {
    const map = new Map<string, Slot>();
    (slotsQ.data ?? []).forEach((s) => {
      const k = formatMunichCalendarKey(s.starts_at);
      map.set(k, s as Slot);
    });
    return map;
  }, [slotsQ.data]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const selectedSlot = selectedDay ? slotByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? null : null;

  return (
    <>
      <PageHeader
        eyebrow={tr("Kalender", "Calendar")}
        title={<>{tr("Freie ", "Available ")}<em className="font-script gold-text not-italic">{tr("Termine", "dates")}</em></>}
        intro={tr("Wähle einen Tag, deine Wunsch-Startzeit und die gewünschte Dauer. Zwischen den Buchungen liegt automatisch eine kleine Pause — du musst dich um nichts kümmern.", "Pick a day, your preferred start time and the desired duration. A small buffer between bookings is added automatically — you don't need to worry about it.")}
      />

      <section className="py-20">
        <div className="container-luxe grid lg:grid-cols-12 gap-10">
          {/* Calendar */}
          <div className="lg:col-span-7">
            <div className="bg-card border border-champagne/15 p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCursor(subMonths(cursor, 1))}
                  className="w-9 h-9 border border-champagne/30 text-champagne flex items-center justify-center hover:bg-champagne/10"
                  aria-label={tr("Voriger Monat", "Previous month")}
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 className="font-display text-2xl gold-text capitalize">
                  {format(cursor, "LLLL yyyy", { locale: lang === "en" ? enUS : de })}
                </h2>
                <button
                  onClick={() => setCursor(addMonths(cursor, 1))}
                  className="w-9 h-9 border border-champagne/30 text-champagne flex items-center justify-center hover:bg-champagne/10"
                  aria-label={tr("Nächster Monat", "Next month")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/40 mb-2">
                {(lang === "en" ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] : ["Mo","Di","Mi","Do","Fr","Sa","So"]).map((d) => <div key={d}>{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const has = slotByDay.has(key);
                  const slot = slotByDay.get(key);
                  const isFullyBooked = slot?.is_fully_booked ?? false;
                  const hasBooking = slot?.has_booking ?? false;
                  const partiallyBooked = hasBooking && !isFullyBooked;
                  const isOther = !isSameMonth(day, cursor);
                  const isSel = selectedDay && isSameDay(day, selectedDay);
                  const isPast = day < new Date(new Date().toDateString());
                  return (
                    <button
                      key={key}
                      onClick={() => has && !isFullyBooked && setSelectedDay(day)}
                      disabled={!has || isPast || isFullyBooked}
                      className={`aspect-square flex flex-col items-center justify-center border text-sm transition relative ${
                        isSel
                          ? "border-champagne bg-champagne/20 text-vanilla"
                          : isFullyBooked
                          ? "border-bordeaux/50 bg-bordeaux/30 text-vanilla/80 cursor-default"
                          : partiallyBooked && !isPast
                          ? "border-champagne/50 bg-champagne/10 text-vanilla hover:border-champagne hover:bg-champagne/15 cursor-pointer"
                          : has && !isPast
                          ? "border-champagne/30 text-vanilla hover:border-champagne hover:bg-champagne/10 cursor-pointer"
                          : "border-transparent text-vanilla/25 cursor-default"
                      } ${isOther ? "opacity-40" : ""}`}
                    >
                      <span>{format(day, "d")}</span>
                      {isFullyBooked && !isPast ? (
                        <span className="absolute bottom-1.5 text-[0.48rem] uppercase tracking-[0.12em] text-vanilla/90">
                          {tr("belegt", "booked")}
                        </span>
                      ) : null}
                      {slot?.is_duo && !isPast && !isFullyBooked && (
                        <span className="absolute top-1 right-1 text-[0.48rem] uppercase tracking-[0.12em] text-champagne">
                          Duo
                        </span>
                      )}
                      {slot?.is_content_shoot && !isPast && !isFullyBooked && (
                        <span className="absolute top-1 left-1 text-[0.48rem] uppercase tracking-[0.12em] text-champagne">
                          Content
                        </span>
                      )}
                      {has && !isPast && !isFullyBooked && (
                        <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-champagne" />
                      )}
                    </button>

                  );
                })}
              </div>


            </div>
          </div>

          {/* Booking panel */}
          <div className="lg:col-span-5">
            <div className="bg-card border border-champagne/15 p-6 min-h-[300px]">
              {slotsQ.isLoading && <p className="text-vanilla/50 text-sm">{tr("Lade Termine…", "Loading dates…")}</p>}

              {!slotsQ.isLoading && !selectedSlot && (
                <>
                  <div className="eyebrow mb-3">{tr("Verfügbare Tage", "Available days")}</div>
                  <h3 className="font-display text-2xl text-vanilla mb-3">{tr("Wähle einen Tag", "Pick a day")}</h3>
                  <p className="text-vanilla/55 text-sm leading-relaxed">
                    {tr("Klick im Kalender auf einen Tag mit goldenem Punkt — du wählst dann deine Wunsch-Startzeit und Dauer.", "Click a day with a golden dot in the calendar — then you choose your preferred start time and duration.")}
                  </p>
                </>
              )}

              {selectedSlot && (
                <BookingPanel
                  slot={selectedSlot}
                  onBooked={() => slotsQ.refetch()}
                />
              )}

              {!slotsQ.isLoading && slotsQ.data?.length === 0 && (
                <p className="text-vanilla/55 text-sm leading-relaxed mt-4">
                  {tr("Aktuell sind keine Termine eingestellt. Schreib mir gerne direkt eine Nachricht für eine individuelle Vereinbarung.", "No dates are set at the moment. Feel free to write to me directly for an individual arrangement.")}
                </p>
              )}
            </div>

            <div className="mt-6 border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed">
              <div className="eyebrow mb-1.5 text-champagne">{tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")}</div>
              <p>
                {tr("Buchbar, solange ein entsprechender Slot im Kalender frei ist. Falls kein Slot ab 4 Stunden im gewünschten Zeitraum verfügbar ist, melde dich gerne — wir finden einen passenden Termin.", "Bookable as long as a suitable slot is free in the calendar. If no slot of 4 h or more is available in your preferred window, get in touch — we'll find a suitable date.")}{" "}
                <Link to="/buchung" className="text-champagne hover:underline">
                  {tr("Anfrage stellen", "Send request")}
                </Link>
              </p>
            </div>

            <div className="mt-4 border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed">
              <div className="eyebrow mb-1.5 text-champagne">{tr("Duo Sessions", "Duo sessions")}</div>
              {tr(<>Duo-Termine biete ich nur gelegentlich an — sie sind im Kalender mit <span className="text-champagne">Duo</span> markiert. Mehr Infos und Interesse hinterlegen auf der{" "}<a href="/duo-sessions" className="text-champagne hover:underline">Duo Sessions</a>-Seite.</>, <>I only offer duo dates occasionally — they are marked as <span className="text-champagne">Duo</span> in the calendar. More info and register interest on the{" "}<a href="/duo-sessions" className="text-champagne hover:underline">duo sessions</a> page.</>)}
            </div>

            <div className="mt-4 border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed">
              <div className="eyebrow mb-1.5 text-champagne">{tr("Content-Dreh", "Content shoot")}</div>
              {tr(<>Gelegentlich suche ich Leute, die zusammen mit mir Content für meine Seiten drehen. Diese Termine sind im Kalender mit <span className="text-champagne">Content</span> markiert. Bei Interesse einfach auf den Termin klicken und eine Nachricht hinterlassen.</>, <>Occasionally I look for people to shoot content with me for my platforms. These dates are marked as <span className="text-champagne">Content</span> in the calendar. If interested, just click the date and leave a message.</>)}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function BookingPanel({ slot, onBooked }: { slot: Slot; onBooked: () => void }) {
  const tr = useTr();
  const { lang } = useLang();
  const DURATIONS = getDurations(lang);
  const propose = useServerFn(proposeBookingTime);
  const submit = useServerFn(submitBooking);
  const qc = useQueryClient();

  const [durationChoice, setDurationChoice] = useState<number | "custom" | "ganztags">(60);
  const [earliest, setEarliest] = useState("10:00");
  const [latest, setLatest] = useState("20:00");
  const [proposed, setProposed] = useState<{ start: string; end: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionType, setSessionType] = useState<"duo" | "single">("duo");
  const applyingProposalRef = useRef(false);

  const slotStartHm = formatMunichTime(slot.starts_at);
  const slotEndHm = formatMunichTime(slot.ends_at);
  const windows = useMemo(() => {
    const rows = slot.windows?.length ? slot.windows : [slot];
    return [...rows].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [slot]);
  const windowDurations = windows.map((w) => Math.round((new Date(w.ends_at).getTime() - new Date(w.starts_at).getTime()) / 60_000));
  const longestWindowMinutes = Math.max(...windowDurations, 30);

  const slotDurationMinutes = useMemo(() => {
    if (windows.length > 1) return longestWindowMinutes;
    return Math.round((new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60_000);
  }, [longestWindowMinutes, slot.ends_at, slot.starts_at, windows.length]);

  // Reset proposal when inputs change
  useEffect(() => {
    if (applyingProposalRef.current) {
      applyingProposalRef.current = false;
      return;
    }
    setProposed(null);
    setError(null);
  }, [slot.id, durationChoice, earliest, latest]);

  // For "ganztags", lock the time window to the full available slot.
  useEffect(() => {
    if (durationChoice === "ganztags") {
      setEarliest(slotStartHm);
      setLatest(slotEndHm);
    }
  }, [durationChoice, slotStartHm, slotEndHm]);

  const effectiveDuration = durationChoice === "ganztags"
    ? slotDurationMinutes
    : durationChoice === "custom"
    ? 60
    : durationChoice;

  const proposeMut = useMutation({
    mutationFn: () => {
      // Anchor the customer's HH:mm window to the slot's calendar day in
      // the BROWSER's local timezone, then send as ISO so the server (UTC)
      // doesn't shift the hours.
      const toIso = (hm: string) => {
        return munichWallTimeToIso(slot.starts_at, hm);
      };
      return propose({
        data: {
          slot_id: slot.id,
          duration_minutes: effectiveDuration,
          earliest_start_iso: toIso(earliest),
          latest_end_iso: toIso(latest),
        },
      });
    },
    onSuccess: (res) => {
      if (res.ok) {
        applyingProposalRef.current = true;
        setEarliest(formatMunichTime(res.start));
        setLatest(formatMunichTime(res.end));
        setProposed({ start: res.start, end: res.end });
        setError(null);
      } else {
        setProposed(null);
        setError(res.reason);
      }
    },
    onError: (e: Error) => { setProposed(null); setError(e.message); },
  });

  const submitMut = useMutation({
    mutationFn: (vars: { name: string; email: string; phone: string; message: string; proposedStart: string }) => {
      return submit({
        data: {
          slot_id: slot.id,
          guest_name: vars.name,
          guest_email: vars.email,
          guest_phone: vars.phone || null,
          duration_minutes: effectiveDuration,
          duration_label: DURATIONS.find((d) => d.value === durationChoice)!.label,
          requested_start: vars.proposedStart,
          message: vars.message,
          age_confirmed: true,
        },
      });
    },
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["public-slots"] });
      onBooked();
    },
    onError: (e: Error) => setError(e.message),
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const altDate = String(fd.get("alt_date") ?? "").trim();
    const altTime = String(fd.get("alt_time") ?? "").trim();
    const altNote = String(fd.get("alt_note") ?? "").trim();
    const experience = String(fd.get("experience") ?? "").trim();
    const preferences = String(fd.get("preferences") ?? "").trim();
    const taboos = String(fd.get("taboos") ?? "").trim();
    const health = String(fd.get("health") ?? "").trim();
    const safeword = String(fd.get("safeword") ?? "").trim();
    const note = String(fd.get("message") ?? "").trim();
    const baseMessage = [
      experience ? `Erfahrung:\n${experience}` : null,
      preferences ? `Vorlieben & Wünsche:\n${preferences}` : null,
      taboos ? `Tabus & Grenzen:\n${taboos}` : null,
      health ? `Gesundheitliche Hinweise:\n${health}` : null,
      safeword ? `Safeword:\n${safeword}` : null,
      note ? `Weitere Nachricht:\n${note}` : null,
    ].filter(Boolean).join("\n\n");
    const altParts: string[] = [];
    if (altDate) altParts.push(`Datum: ${altDate}${altTime ? ` um ${altTime}` : ""}`);
    if (altNote) altParts.push(altNote);
    const duoPrefix = slot.is_duo
      ? `— Session-Art —\n${sessionType === "duo" ? `Duo Session${slot.duo_partner ? ` (mit ${slot.duo_partner})` : ""}` : "Single Session (nur mit Lady Vanilla Ice)"}\n\n`
      : "";
    const withAlt = altParts.length
      ? `${baseMessage}\n\n— Ausweichtermin —\n${altParts.join("\n")}`
      : baseMessage;
    const fullMessage = `${duoPrefix}${withAlt}`;

    // If no time has been proposed yet, auto-run the proposal so the button
    // never silently "does nothing".
    let effectiveProposed = proposed;
    if (!effectiveProposed) {
      try {
        const res = await proposeMut.mutateAsync();
        if (!res.ok) {
          setError(res.reason);
          return;
        }
        effectiveProposed = { start: res.start, end: res.end };
      } catch (err) {
        setError(err instanceof Error ? err.message : tr("Zeitvorschlag fehlgeschlagen.", "Time suggestion failed."));
        return;
      }
    }

    submitMut.mutate({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? "").trim(),
      message: fullMessage,
      proposedStart: effectiveProposed.start,
    });
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 size={48} className="mx-auto text-champagne mb-4" strokeWidth={1.2} />
        <h3 className="font-display text-3xl gold-text mb-3">{tr("Anfrage gesendet", "Request sent")}</h3>
        <p className="text-vanilla/70 leading-relaxed">
          {tr("Vielen Dank — deine Anfrage liegt mir vor. Ich melde mich diskret per E-Mail zur Bestätigung des Termins zurück.", "Thank you — I have your request. I will get back to you discreetly by email to confirm the appointment.")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="eyebrow mb-2">{tr("Buchungsanfrage", "Booking request")}</div>
      <h3 className="font-display text-2xl text-vanilla mb-1">
        {slot.is_duo && <span className="mr-2 align-middle text-[0.6rem] uppercase tracking-[0.22em] text-champagne border border-champagne/40 px-2 py-1">Duo</span>}
        {slot.is_content_shoot && <span className="mr-2 align-middle text-[0.6rem] uppercase tracking-[0.22em] text-champagne border border-champagne/40 px-2 py-1">Content</span>}
        {formatMunichDate(slot.starts_at, lang)}
        {slot.is_duo && slot.duo_partner && (
          <span className="block font-script gold-text text-3xl mt-2">
            {tr("mit", "with")} {slot.duo_partner}
          </span>
        )}
      </h3>
      <div className="text-xs text-vanilla/60 mb-5 flex flex-wrap items-start gap-3">
        <span className="flex items-start gap-1.5"><Clock size={11} className="text-champagne mt-0.5 shrink-0" />
          <span className="flex flex-col gap-1">
            <span>{tr("Verfügbar", "Available")}</span>
            {windows.map((window) => (
              <span key={window.id}>
                {formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}
              </span>
            ))}
          </span>
        </span>
        <span className="flex items-center gap-1.5"><MapPin size={11} className="text-champagne" />{slot.location}</span>
      </div>

      {slot.is_duo && (
        <div className="mb-5 border border-champagne/30 bg-champagne/[0.04] p-4">
          <div className="eyebrow mb-2 text-champagne">{tr("Session-Art wählen", "Choose session type")}</div>
          <p className="text-[0.7rem] text-vanilla/60 leading-relaxed mb-3">
            {tr(`An diesem Termin ist eine Duo-Session möglich${slot.duo_partner ? ` (mit ${slot.duo_partner})` : ""}. Du kannst aber auch eine Single-Session nur mit mir buchen.`, `A duo session is possible on this date${slot.duo_partner ? ` (with ${slot.duo_partner})` : ""}. You can also book a single session with me only.`)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className={`cursor-pointer border p-3 text-center text-xs transition ${
              sessionType === "duo"
                ? "border-champagne bg-champagne/15 text-vanilla"
                : "border-champagne/25 text-vanilla/70 hover:border-champagne/50"
            }`}>
              <input
                type="radio" name="session-type" className="sr-only"
                checked={sessionType === "duo"}
                onChange={() => setSessionType("duo")}
              />
              <div className="eyebrow text-champagne mb-1">Duo</div>
              <div>{tr(`mit ${slot.duo_partner ?? "Partnerin"} & mir`, `with ${slot.duo_partner ?? "partner"} & me`)}</div>
            </label>
            <label className={`cursor-pointer border p-3 text-center text-xs transition ${
              sessionType === "single"
                ? "border-champagne bg-champagne/15 text-vanilla"
                : "border-champagne/25 text-vanilla/70 hover:border-champagne/50"
            }`}>
              <input
                type="radio" name="session-type" className="sr-only"
                checked={sessionType === "single"}
                onChange={() => setSessionType("single")}
              />
              <div className="eyebrow text-champagne mb-1">Single</div>
              <div>{tr("nur mit mir", "just with me")}</div>
            </label>
          </div>
        </div>
      )}

      <AvailabilityTimeline slotId={slot.id} />

      <div className="space-y-4">
        <div>
          <label className="eyebrow block mb-1.5">{tr("Gewünschte Dauer", "Desired duration")}</label>
          <select
            className="input-luxe"
            value={String(durationChoice)}
            onChange={(e) => {
              const v = e.target.value;
              setDurationChoice(v === "custom" || v === "ganztags" ? v : Number(v));
            }}
          >
            {DURATIONS.map((d) => (
              <option key={String(d.value)} value={String(d.value)}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className={durationChoice === "ganztags" ? "opacity-60" : ""}>
          <label className="eyebrow block mb-1.5">{tr("Dein Zeitfenster an diesem Tag", "Your time window on this day")}</label>
          {durationChoice === "ganztags" && (
            <p className="text-[0.7rem] text-vanilla/55 mb-2 leading-relaxed">
              {windows.length > 1
                ? tr("Bei mehreren Zeitfenstern wird automatisch das längste durchgehend freie Zeitfenster genutzt.", "With multiple time windows, the longest continuous available window is used automatically.")
                : tr(`Bei "Ganztags" wird automatisch das gesamte verfügbare Zeitfenster (${slotStartHm} – ${slotEndHm}) genutzt.`, `With "all day" the entire available window (${slotStartHm} – ${slotEndHm}) is used automatically.`)}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1">{tr("Von", "From")}</label>
              <input
                type="time" step={900} min={slotStartHm} max={slotEndHm}
                value={earliest} onChange={(e) => setEarliest(e.target.value)}
                disabled={durationChoice === "ganztags"}
                data-earliest
                className="input-luxe transition-shadow"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1">{tr("Bis", "Until")}</label>
              <input
                type="time" step={900} min={slotStartHm} max={slotEndHm}
                value={latest} onChange={(e) => setLatest(e.target.value)}
                disabled={durationChoice === "ganztags"}
                className="input-luxe"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => proposeMut.mutate()}
          disabled={proposeMut.isPending}
          className="btn-outline-gold w-full"
        >
          <Sparkles size={14} />
          {proposeMut.isPending ? tr("Suche freie Zeit…", "Finding free time…") : proposed ? tr("Andere Zeit vorschlagen", "Suggest another time") : tr("Freie Zeit vorschlagen", "Suggest free time")}
        </button>

        {proposed && (
          <div className="border border-champagne/40 bg-champagne/10 p-4 text-center">
            <div className="text-[0.65rem] uppercase tracking-[0.25em] text-champagne/80 mb-1">{tr("Vorgeschlagener Termin", "Proposed time")}</div>
            <div className="font-display text-2xl gold-text">
              {formatMunichTime(proposed.start)} – {formatMunichTime(proposed.end)}{lang === "en" ? "" : " Uhr"}
            </div>
            {durationChoice === "custom" && (
              <p className="text-[0.7rem] text-vanilla/65 mt-2">
                {tr("(Vorab 60 Min reserviert — bitte gewünschte Dauer in der Nachricht angeben.)", "(60 min reserved for now — please state the desired duration in the message.)")}
              </p>
            )}
            {durationChoice === "ganztags" && (
              <p className="text-[0.7rem] text-vanilla/65 mt-2">
                {windows.length > 1
                  ? tr("(Reserviert das passende zusammenhängende Zeitfenster.)", "(Reserves the matching continuous time window.)")
                  : tr("(Ganztags — reserviert für das gesamte verfügbare Zeitfenster.)", "(All day — reserved for the entire available window.)")}
              </p>
            )}
          </div>
        )}

        {error && !done && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 p-3">{error}</div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4 mt-6 pt-6 border-t border-champagne/15">
        <div>
          <label className="eyebrow block mb-1.5">{tr("Name oder Pseudonym", "Name or pseudonym")}</label>
          <input name="name" required maxLength={120} className="input-luxe" placeholder={tr("Wie darf ich dich nennen?", "What should I call you?")} />
        </div>
        <div>
          <label className="eyebrow block mb-1.5">{tr("E-Mail", "Email")}</label>
          <input name="email" type="email" required maxLength={255} className="input-luxe" placeholder={tr("diskret@beispiel.de", "discreet@example.com")} />
        </div>
        <div>
          <label className="eyebrow block mb-1.5">{tr("Handynummer", "Mobile number")}</label>
          <input name="phone" type="tel" required minLength={6} maxLength={40} className="input-luxe" placeholder="+49 151 23456789" />
        </div>
        <div className="border border-champagne/20 bg-champagne/[0.03] p-4 space-y-4">
          <div>
            <div className="eyebrow text-champagne">{tr("Vorlieben & Grenzen", "Preferences & boundaries")}</div>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-vanilla/55">{tr("Diese Angaben helfen mir, deine Anfrage schnell und sicher einzuordnen.", "These details help me assess your request quickly and safely.")}</p>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">{tr("Erfahrung", "Experience")}</label>
            <select name="experience" required defaultValue="" className="input-luxe">
              <option value="" disabled>{tr("Bitte auswählen", "Please select")}</option>
              <option value={tr("Erste Session", "First session")}>{tr("Erste Session", "First session")}</option>
              <option value={tr("Etwas Erfahrung", "Some experience")}>{tr("Etwas Erfahrung", "Some experience")}</option>
              <option value={tr("Erfahren", "Experienced")}>{tr("Erfahren", "Experienced")}</option>
            </select>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">{tr("Vorlieben & Wünsche", "Preferences & wishes")}</label>
            <textarea name="preferences" rows={3} required minLength={3} maxLength={450} className="input-luxe resize-y" placeholder={tr("Was wünschst du dir für die Session?", "What would you like for the session?")} />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">{tr("Tabus & klare Grenzen", "Taboos & hard limits")}</label>
            <textarea name="taboos" rows={3} required minLength={2} maxLength={450} className="input-luxe resize-y" placeholder={tr("Was darf auf keinen Fall passieren?", "What must not happen under any circumstances?")} />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">{tr("Gesundheitliche Hinweise (optional)", "Health information (optional)")}</label>
            <textarea name="health" rows={2} maxLength={150} className="input-luxe resize-y" placeholder={tr("Verletzungen, Allergien oder andere wichtige Hinweise", "Injuries, allergies or other important information")} />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">{tr("Safeword (optional)", "Safeword (optional)")}</label>
            <input name="safeword" maxLength={40} className="input-luxe" placeholder={tr("Zum Beispiel: Rot", "For example: Red")} />
          </div>
          <div>
          <label className="eyebrow block mb-1.5">{tr("Weitere Nachricht (optional)", "Additional message (optional)")}</label>
          <textarea
            name="message" rows={3} maxLength={250}
            className="input-luxe resize-y"
            placeholder={durationChoice === "custom"
              ? tr("Bitte schreibe deine gewünschte Dauer und worauf du dich freust…", "Please write your desired duration and what you're looking forward to…")
              : tr("Gibt es noch etwas, das ich wissen sollte?", "Is there anything else I should know?")}
          />
          </div>
        </div>

        <div className="border border-champagne/20 bg-champagne/[0.03] p-4 space-y-3">
          <div>
            <label className="eyebrow block mb-1.5 text-champagne">{tr("Ausweichtermin (empfohlen)", "Alternative date (recommended)")}</label>
            <p className="text-[0.7rem] text-vanilla/55 leading-relaxed mb-2">
              {tr("Falls dein Wunschtermin bei mir nicht klappt, schlage mir bitte einen Ausweichtermin vor — so können wir schneller verbindlich planen.", "If your preferred date doesn't work for me, please suggest an alternative — so we can lock things in faster.")}
            </p>
            <p className="text-[0.7rem] text-vanilla/70 leading-relaxed border-l-2 border-champagne/40 pl-3">
              {tr(<><span className="text-champagne">Tipp:</span> Falls dein Wunschtermin in einen Zeitraum fällt, der gerade als <em className="not-italic text-vanilla/90">„reserviert"</em> angezeigt wird, schreibe ihn mir bitte trotzdem hier hinein. Sollte der Termin nicht bestätigt werden, kann ich ihn an dich weitergeben.</>, <><span className="text-champagne">Tip:</span> If your preferred date falls in a period currently shown as <em className="not-italic text-vanilla/90">"reserved"</em>, please still enter it here. If that reservation isn't confirmed, I can pass it on to you.</>)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1">{tr("Datum", "Date")}</label>
              <input name="alt_date" type="date" className="input-luxe" />
            </div>
            <div>
              <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1">{tr("Uhrzeit", "Time")}</label>
              <input name="alt_time" type="time" step={900} className="input-luxe" />
            </div>
          </div>
          <div>
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1">{tr("Hinweis (optional)", "Note (optional)")}</label>
            <input
              name="alt_note"
              type="text"
              maxLength={200}
              className="input-luxe"
              placeholder={tr("z. B. 'auch am Wochenende möglich'", "e.g. 'weekends also possible'")}
            />
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-vanilla/65 cursor-pointer">
          <input type="checkbox" required className="mt-0.5 accent-[var(--color-champagne)]" />
          <span>{tr("Ich bin volljährig (18+) und stimme der vertraulichen Verarbeitung meiner Daten zur Terminvereinbarung zu.", "I am 18+ and consent to the confidential processing of my data for scheduling.")}</span>
        </label>

        <button type="submit" disabled={submitMut.isPending || proposeMut.isPending} className="btn-gold w-full">
          <Crown size={14} />
          {submitMut.isPending || proposeMut.isPending ? tr("Wird gesendet…", "Sending…") : tr("Termin unverbindlich anfragen", "Request appointment (non-binding)")}
        </button>
      </form>
    </>
  );
}

function AvailabilityTimeline({ slotId }: { slotId: string }) {
  const tr = useTr();
  const load = useServerFn(getSlotAvailability);
  const q = useQuery({
    queryKey: ["slot-availability", slotId],
    queryFn: () => load({ data: { slot_id: slotId } }),
    staleTime: 15_000,
  });

  const [zoom, setZoom] = useState(1);

  if (q.isLoading) {
    return (
      <div className="mb-5 h-14 border border-champagne/15 bg-champagne/[0.03] animate-pulse" />
    );
  }
  if (!q.data) return null;

  const winStart = new Date(q.data.starts_at).getTime();
  const winEnd = new Date(q.data.ends_at).getTime();
  const totalMs = winEnd - winStart;
  if (totalMs <= 0) return null;

  // Booking and reservation ranges include their safety buffer. Gaps between
  // explicitly opened windows are neutral and must never be extended or shown
  // as bookings.
  const raw = q.data.busy
    .map((b) => {
      const kind = b.kind ?? "booked";
      const rangeBuffer = (b.buffer_minutes ?? q.data.buffer_minutes) * 60_000;
      return {
        s: Math.max(winStart, new Date(b.start).getTime() - rangeBuffer),
        e: Math.min(winEnd, new Date(b.end).getTime() + rangeBuffer),
        kind,
      };
    })
    .filter((r) => r.e > r.s)
    .sort((a, b) => a.s - b.s);

  const merged: Array<{ s: number; e: number; kind: "booked" | "reserved" | "unavailable" }> = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && r.s <= last.e && last.kind === r.kind) last.e = Math.max(last.e, r.e);
    else merged.push({ ...r });
  }
  // Build free segments as the complement of merged busy ranges.
  const freeSegs: Array<{ s: number; e: number }> = [];
  let cursor = winStart;
  for (const b of merged) {
    if (b.s > cursor) freeSegs.push({ s: cursor, e: b.s });
    cursor = Math.max(cursor, b.e);
  }
  if (cursor < winEnd) freeSegs.push({ s: cursor, e: winEnd });

  // Hour ticks (every full hour between win start/end).
  const ticks: number[] = [];
  const firstHour = new Date(winStart);
  firstHour.setMinutes(0, 0, 0);
  if (firstHour.getTime() < winStart) firstHour.setHours(firstHour.getHours() + 1);
  for (let t = firstHour.getTime(); t <= winEnd; t += 60 * 60_000) ticks.push(t);

  // Thin out visible labels so they don't overlap; more zoom → mehr Labels.
  const effHours = (totalMs / 3_600_000) / zoom;
  const labelStep = effHours > 12 ? 3 : effHours > 6 ? 2 : 1;
  const labelTicks = ticks.filter((t) => new Date(t).getHours() % labelStep === 0);

  const pct = (t: number) => ((t - winStart) / totalMs) * 100;
  const fmtHm = (t: number) => formatMunichTime(new Date(t));

  return (
    <div className="mb-5">
      <div className="text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45 mb-2 flex items-center justify-between gap-3">
        <span>{tr("Belegung des Tages", "Occupancy of the day")}</span>
        <div className="flex items-center gap-2 normal-case tracking-normal">
          <div className="flex items-center gap-1 border border-champagne/25 bg-anthracite/40">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
              disabled={zoom <= 1}
              className="px-2 py-0.5 text-vanilla/80 hover:text-champagne disabled:opacity-30"
              aria-label={tr("Zoom raus", "Zoom out")}
            >−</button>
            <span className="text-vanilla/60 tabular-nums text-[0.7rem] min-w-[2.2rem] text-center">{zoom.toFixed(1)}×</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(6, +(z + 0.5).toFixed(1)))}
              disabled={zoom >= 6}
              className="px-2 py-0.5 text-vanilla/80 hover:text-champagne disabled:opacity-30"
              aria-label={tr("Zoom rein", "Zoom in")}
            >+</button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
      <div className="relative h-10 border border-champagne/20 bg-champagne/[0.04]">
        {/* Blocked segments — rendered first so free buttons sit on top */}
        {merged.map((seg) => {
          const left = pct(seg.s);
          const width = pct(seg.e) - left;
          const isReserved = seg.kind === "reserved";
          const isUnavailable = seg.kind === "unavailable";
          return (
            <div
              key={`b-${seg.s}`}
              title={`${isUnavailable ? tr("Nicht freigegeben","Unavailable") : isReserved ? tr("Reserviert","Reserved") : tr("Belegt","Booked")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}
              className={`absolute top-0 bottom-0 pointer-events-none ${
                isUnavailable
                  ? "bg-anthracite/80 border-x border-vanilla/15"
                  : isReserved
                  ? "bg-vanilla/35 border-x border-vanilla/45"
                  : "bg-bordeaux/60 border-x border-bordeaux/70"
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {/* Free segments */}
        {freeSegs.map((seg) => {
          const left = pct(seg.s);
          const width = pct(seg.e) - left;
          if (width < 0.5) return null;
          return (
            <div
              key={`f-${seg.s}`}
              title={`${tr("Frei","Free")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}
              className="absolute top-0 bottom-0 z-10 bg-champagne/50"
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {/* Hour ticks */}
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-vanilla/10 pointer-events-none"
            style={{ left: `${pct(t)}%` }}
          />
        ))}
      </div>
      {/* Hour labels */}
      <div className="relative h-5 mt-1.5 text-[0.7rem] font-medium text-vanilla/75">
        {labelTicks.map((t) => {
          const p = pct(t);
          // Keep first/last labels inside the bar edges so nothing gets clipped.
          const align =
            p < 4 ? "translate-x-0 left-0" : p > 96 ? "-translate-x-full" : "-translate-x-1/2";
          return (
            <span
              key={t}
              className={`absolute tabular-nums ${align}`}
              style={p > 96 ? { left: `${p}%` } : p < 4 ? { left: 0 } : { left: `${p}%` }}
            >
              {fmtHm(t)}
            </span>
          );
        })}
      </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-vanilla/60">
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>
      </div>
    </div>
  );
}
