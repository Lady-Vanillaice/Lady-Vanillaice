import { createFileRoute, Link } from "@tanstack/react-router";
import { formatMinHours, listSlotMinDurations, minMinutesForDay } from "@/lib/slot-min-duration.functions";
import { isPrivateLocation, PRIVATE_LOCATION_PUBLIC_TEXT } from "@/lib/slot-location";
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
import { ChevronLeft, ChevronRight, MapPin, Clock, Crown, CheckCircle2, Sparkles, Video } from "lucide-react";
import { listCalendarCamTimes, type CalendarCamTime } from "@/lib/calendar-cam.functions";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTr, useLang } from "@/i18n";
import { getTimelineLabelTicks } from "@/lib/calendar-timeline";
import { formatSpecialCondition, listCalendarSpecials, type CalendarSpecial } from "@/lib/calendar-special.functions";
import { joinCalendarWaitlist } from "@/lib/calendar-waitlist.functions";

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
  is_vacation?: boolean;
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
  const listMinDurations = useServerFn(listSlotMinDurations);
  const minDurationsQ = useQuery({
    queryKey: ["public-slot-min-durations"],
    queryFn: () => listMinDurations(),
    staleTime: 30_000,
  });
  const listSpecials = useServerFn(listCalendarSpecials);
  const specialsQ = useQuery({
    queryKey: ["calendar-specials"],
    queryFn: () => listSpecials(),
    staleTime: 30_000,
  });

  const listCamTimes = useServerFn(listCalendarCamTimes);
  const camQ = useQuery({
    queryKey: ["calendar-cam-times"],
    queryFn: () => listCamTimes(),
    staleTime: 30_000,
  });

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [linkedStartTime, setLinkedStartTime] = useState<string | null>(null);
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    const startParam = params.get("start");
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return;

    const linkedDay = new Date(dateParam + "T12:00:00");
    if (Number.isNaN(linkedDay.getTime())) return;

    setSelectedDay(linkedDay);
    setCursor(startOfMonth(linkedDay));
    if (startParam && /^\d{2}:\d{2}$/.test(startParam)) {
      setLinkedStartTime(startParam);
    }
  }, []);

  const slotByDay = useMemo(() => {
    const map = new Map<string, Slot>();
    (slotsQ.data ?? []).forEach((s) => {
      const k = formatMunichCalendarKey(s.starts_at);
      map.set(k, s as Slot);
    });
    return map;
  }, [slotsQ.data]);

  const specialByDay = useMemo(() => {
    const map = new Map<string, CalendarSpecial>();
    (specialsQ.data ?? []).forEach((special) => map.set(special.date, special));
    return map;
  }, [specialsQ.data]);

  const camByDay = useMemo(() => {
    const map = new Map<string, CalendarCamTime[]>();
    (camQ.data ?? []).forEach((cam) => map.set(cam.date, [...(map.get(cam.date) ?? []), cam]));
    return map;
  }, [camQ.data]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedDaySlot = selectedKey ? slotByDay.get(selectedKey) ?? null : null;
  const selectedSlot =
    selectedDaySlot && !selectedDaySlot.is_fully_booked && !selectedDaySlot.is_vacation
      ? selectedDaySlot
      : null;
  const selectedSpecial = selectedKey ? specialByDay.get(selectedKey) ?? null : null;
  const selectedMinMinutes = minMinutesForDay(minDurationsQ.data, selectedDaySlot);
  const selectedCams = selectedKey ? camByDay.get(selectedKey) ?? [] : [];
  const selectedIsFullyBooked = Boolean(
    selectedDaySlot?.is_fully_booked && !selectedDaySlot?.is_vacation,
  );

  return (
    <>
      <PageHeader
        eyebrow={tr("Kalender", "Calendar")}
        title={<>{tr("Freie ", "Available ")}<em className="font-script gold-text not-italic">{tr("Termine", "dates")}</em></>}
        intro={tr("Wähle einen Tag, deine Wunsch-Startzeit und die gewünschte Dauer. Zwischen den Buchungen liegt automatisch eine kleine Pause — du musst dich um nichts kümmern.", "Pick a day, your preferred start time and the desired duration. A small buffer between bookings is added automatically — you don't need to worry about it.")}
      />

      <section className="py-20">
        <div className="container-luxe space-y-10">
          {/* Calendar */}
          <div>
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
                  const special = specialByDay.get(key);
                  const cams = camByDay.get(key);
                  const isFullyBooked = slot?.is_fully_booked ?? false;
                  const isVacation = slot?.is_vacation ?? false;
                  const dayMinMinutes = minMinutesForDay(minDurationsQ.data, slot);
                  const hasBooking = slot?.has_booking ?? false;
                  const partiallyBooked = hasBooking && !isFullyBooked;
                  const isOther = !isSameMonth(day, cursor);
                  const isSel = selectedDay && isSameDay(day, selectedDay);
                  const isPast = day < new Date(new Date().toDateString());
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!isPast && !isVacation && (special || has || cams)) {
                          setSelectedDay(day);
                        }
                      }}
                      disabled={isPast || isVacation || (!special && !has && !cams)}
                      className={`aspect-square flex flex-col items-center justify-center border text-sm transition relative ${
                        isSel
                          ? "border-champagne bg-champagne/20 text-vanilla"
                          : isVacation && !isPast
                          ? "border-orange-500/75 bg-orange-950/30 text-vanilla shadow-[inset_0_0_0_1px_rgba(249,115,22,0.14)] cursor-default"
                          : isFullyBooked
                          ? "border-bordeaux/50 bg-bordeaux/30 text-vanilla/80 hover:border-bordeaux/80 cursor-pointer"
                          : partiallyBooked && !isPast
                          ? "border-champagne/50 bg-champagne/10 text-vanilla hover:border-champagne hover:bg-champagne/15 cursor-pointer"
                          : has && !isPast
                          ? "border-champagne/30 text-vanilla hover:border-champagne hover:bg-champagne/10 cursor-pointer"
                          : cams && !isPast
                          ? "border-purple-400/50 bg-purple-500/10 text-vanilla hover:border-purple-300 hover:bg-purple-500/15 cursor-pointer"
                          : "border-transparent text-vanilla/25 cursor-default"
                      } ${isOther ? "opacity-40" : ""}`}
                    >
                      <span>{format(day, "d")}</span>
                      {isVacation && !isPast ? (
                        <span className="absolute bottom-1.5 rounded-sm border border-orange-500/70 bg-orange-950/55 px-1.5 py-0.5 text-[0.46rem] font-semibold uppercase tracking-[0.12em] text-vanilla">
                          {tr("Urlaub", "Away")}
                        </span>
                      ) : isFullyBooked && !isPast ? (
                        <span className="absolute bottom-1.5 text-[0.48rem] uppercase tracking-[0.12em] text-vanilla/90">
                          {tr("belegt", "booked")}
                        </span>
                      ) : null}
                      {!isPast && (
                        <span className="absolute top-0.5 inset-x-1 flex items-center justify-center gap-1.5 pointer-events-none">
                          {special && (
                            <span className="text-[0.48rem] uppercase tracking-[0.12em] text-champagne">
                              SPECIAL
                            </span>
                          )}
                          {slot?.is_duo && !isFullyBooked && (
                            <span className="text-[0.48rem] uppercase tracking-[0.12em] text-champagne">
                              {slot.duo_partner?.startsWith("OPTIONAL_DUO::") ? "Flex" : "Duo"}
                            </span>
                          )}
                          {slot?.is_content_shoot && !isFullyBooked && (
                            <span className="text-[0.48rem] uppercase tracking-[0.12em] text-champagne">
                              Content
                            </span>
                          )}
                          {cams && (
                            <span className="text-[0.48rem] uppercase tracking-[0.12em] text-purple-300">
                              Cam
                            </span>
                          )}
                          {dayMinMinutes != null && !isFullyBooked && !isVacation && (
                            <span className="text-[0.48rem] uppercase tracking-[0.12em] text-champagne">
                              Extra
                            </span>
                          )}
                        </span>
                      )}
                      {!isPast && !isVacation && ((has && !isFullyBooked) || cams) && (
                        <span className="absolute bottom-1 flex items-center gap-1 pointer-events-none">
                          {has && !isFullyBooked && <span className="w-1 h-1 rounded-full bg-champagne" />}
                          {has && !isFullyBooked && dayMinMinutes != null && (
                            // Mindestbuchung unten neben dem Punkt – getrennt vom „Extra“ oben.
                            <span className="text-[0.5rem] font-semibold leading-none text-champagne">
                              {tr(`ab ${(dayMinMinutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })}h`, `${(dayMinMinutes / 60).toLocaleString("en-US", { maximumFractionDigits: 1 })}h+`)}
                            </span>
                          )}
                          {cams && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />}
                        </span>
                      )}
                    </button>

                  );
                })}
              </div>


            </div>
          </div>

          {/* Booking panel */}
          <div>
            <div className="bg-card border border-champagne/15 p-6 min-h-[300px] public-booking-card">
              {slotsQ.isLoading && <p className="text-vanilla/50 text-sm">{tr("Lade Termine…", "Loading dates…")}</p>}

              {!slotsQ.isLoading && !selectedDay && !selectedSlot && (
                <>
                  <div className="eyebrow mb-3">{tr("Verfügbare Tage", "Available days")}</div>
                  <h3 className="font-display text-2xl text-vanilla mb-3">{tr("Wähle einen Tag", "Pick a day")}</h3>
                  <p className="text-vanilla/55 text-sm leading-relaxed">
                    {tr("Klick im Kalender auf einen Tag mit goldenem Punkt — du wählst dann deine Wunsch-Startzeit und Dauer.", "Click a day with a golden dot in the calendar — then you choose your preferred start time and duration.")}
                  </p>
                </>
              )}

              {selectedCams.length > 0 && (
                <div className="mb-5 border border-purple-400/60 bg-purple-500/10 p-4">
                  <div className="mb-1 flex items-center gap-2 text-purple-300">
                    <Video size={16} />
                    <span className="eyebrow !text-purple-300">{tr("Camsession", "Cam session")}</span>
                  </div>
                  {selectedCams.map((cam) => (
                    <div key={cam.id} className="mt-1">
                      <div className="font-display text-xl text-vanilla">{cam.from} – {cam.to} {lang === "en" ? "" : "Uhr"}</div>
                      {cam.note && <p className="text-sm text-vanilla/70">{cam.note}</p>}
                    </div>
                  ))}
                  <p className="mt-3 text-sm leading-relaxed text-vanilla/75">
                    {tr("An diesem Tag biete ich Cam-Sessions an – Online-Erziehung live per Cam. ", "On this day I offer cam sessions – online training live via cam. ")}
                    <Link to="/cam" className="text-purple-300 hover:underline">{tr("Mehr erfahren & Interesse eintragen", "Learn more & register interest")}</Link>
                  </p>
                </div>
              )}

              {selectedDay && selectedMinMinutes != null && !selectedIsFullyBooked && (
                <div className="mb-5 border-2 border-champagne bg-champagne/15 p-4">
                  <div className="eyebrow mb-1 text-champagne">{tr("Extra-Zeit · Mindestbuchung", "Extra time · minimum booking")}</div>
                  {selectedDaySlot && (
                    <p className="mb-1 text-sm text-vanilla/85">
                      {tr("Frei", "Free")}{" "}
                      {((selectedDaySlot as any).windows?.length ? (selectedDaySlot as any).windows : [selectedDaySlot])
                        .map((w: { starts_at: string; ends_at: string }) => `${formatMunichTime(w.starts_at)}–${formatMunichTime(w.ends_at)}`)
                        .join(", ")}
                      {lang === "en" ? "" : " Uhr"}
                    </p>
                  )}
                  <p className="font-display text-xl text-vanilla">
                    {tr(`Mindestens ${formatMinHours(selectedMinMinutes, "de")} Session`, `Minimum ${formatMinHours(selectedMinMinutes, "en")} session`)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-vanilla/70">
                    {tr("An diesem Tag können nur Sessions ab dieser Dauer gebucht werden.", "On this day, only sessions of at least this length can be booked.")}
                  </p>
                </div>
              )}
              {selectedSpecial && (
                <div className="mb-5 border border-champagne/50 bg-champagne/10 p-4">
                  <div className="mb-1 flex items-center gap-2 text-champagne">
                    <Sparkles size={16} />
                    <span className="eyebrow">SPECIAL</span>
                  </div>
                  <h3 className="font-display text-xl text-vanilla">{selectedSpecial.title}</h3>
                  {selectedSpecial.minHours != null && (
                    <p className="mt-2 text-sm text-champagne">
                      <span className="font-medium">{tr("Bedingung", "Condition")}:</span>{" "}
                      {tr(formatSpecialCondition(selectedSpecial.minHours, "de"), formatSpecialCondition(selectedSpecial.minHours, "en"))}
                    </p>
                  )}
                  {selectedSpecial.outfit && (
                    <p className="mt-2 text-sm text-champagne">
                      <span className="font-medium">{tr("Outfit", "Outfit")}:</span>{" "}
                      {selectedSpecial.outfit}
                    </p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-vanilla/75">
                    {selectedSpecial.description}
                  </p>
                </div>
              )}

              {selectedDay && !selectedSlot && selectedSpecial && !selectedIsFullyBooked && (
                <p className="text-sm leading-relaxed text-vanilla/55">
                  {tr("Für dieses SPECIAL ist aktuell kein freies Zeitfenster mehr verfügbar.", "There is currently no free time window left for this special.")}
                </p>
              )}

              {selectedDay && selectedKey && selectedIsFullyBooked && (
                <WaitlistForm
                  date={selectedKey}
                  dateLabel={format(selectedDay, "dd.MM.yyyy")}
                />
              )}

              {selectedSlot && (
                <BookingPanel
                  slot={selectedSlot}
                  initialStartTime={linkedStartTime}
                  onBooked={() => slotsQ.refetch()}
                  specialMinHours={selectedSpecial?.minHours ?? null}
                  minMinutes={selectedMinMinutes}
                />
              )}

              {!slotsQ.isLoading && slotsQ.data?.length === 0 && (
                <p className="text-vanilla/55 text-sm leading-relaxed mt-4">
                  {tr("Aktuell sind keine Termine eingestellt. Schreib mir gerne direkt eine Nachricht für eine individuelle Vereinbarung.", "No dates are set at the moment. Feel free to write to me directly for an individual arrangement.")}
                </p>
              )}
            
              {selectedSlot && (
                <div className="lg:hidden mt-6">
                  {/* FINAL mobile info boxes inside booking card */}
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
              )}
            </div>

            {/* FINAL: info boxes after visible booking card */}
<div className="hidden lg:block">
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
        </div>
      </section>
    </>
  );
}

function WaitlistForm({ date, dateLabel }: { date: string; dateLabel: string }) {
  const tr = useTr();
  const join = useServerFn(joinCalendarWaitlist);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [availableFrom, setAvailableFrom] = useState("10:00");
  const [availableTo, setAvailableTo] = useState("20:00");
  const [done, setDone] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      join({
        data: {
          date,
          name: name.trim(),
          email: email.trim(),
          available_from: availableFrom,
          available_to: availableTo,
        },
      }),
    onSuccess: (result) => {
      setAlreadyRegistered(Boolean(result.alreadyRegistered));
      setDone(true);
    },
  });

  if (done) {
    return (
      <div className="border border-champagne/35 bg-champagne/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-champagne">
          <CheckCircle2 size={16} />
          <span className="eyebrow">{tr("Warteliste", "Waitlist")}</span>
        </div>
        <p className="text-sm leading-relaxed text-vanilla/75">
          {alreadyRegistered
            ? tr(
                "Du stehst für diesen Tag bereits auf der Warteliste.",
                "You are already on the waitlist for this date.",
              )
            : tr(
                "Danke. Du bist jetzt auf der Warteliste. Wenn etwas frei wird, kann ich dich anhand deines angegebenen Zeitfensters kontaktieren.",
                "Thank you. You are now on the waitlist. If something becomes available, I can contact you based on your availability window.",
              )}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-champagne/35 bg-champagne/5 p-4">
      <div className="eyebrow mb-2 text-champagne">{tr("Warteliste", "Waitlist")}</div>
      <h3 className="font-display text-xl text-vanilla">
        {tr("Dieser Tag ist belegt", "This date is fully booked")}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-vanilla/60">
        {tr(
          "Trag dich ein, wenn du am " + dateLabel + " einspringen könntest. Gib bitte auch an, von wann bis wann du an diesem Tag verfügbar wärst.",
          "Join the waitlist if you could make " + dateLabel + ". Please also tell me what time window you would be available that day.",
        )}
      </p>

      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !email.trim() || availableFrom >= availableTo) return;
          mutation.mutate();
        }}
      >
        <label className="grid gap-1 text-xs text-vanilla/65">
          {tr("Name", "Name")}
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-luxe"
          />
        </label>

        <label className="grid gap-1 text-xs text-vanilla/65">
          {tr("E-Mail", "Email")}
          <input
            required
            type="email"
            maxLength={200}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input-luxe"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs text-vanilla/65">
            {tr("Verfügbar ab", "Available from")}
            <input
              required
              type="time"
              value={availableFrom}
              onChange={(event) => setAvailableFrom(event.target.value)}
              className="input-luxe"
            />
          </label>
          <label className="grid gap-1 text-xs text-vanilla/65">
            {tr("Verfügbar bis", "Available until")}
            <input
              required
              type="time"
              value={availableTo}
              onChange={(event) => setAvailableTo(event.target.value)}
              className="input-luxe"
            />
          </label>
        </div>

        {availableFrom >= availableTo && (
          <p className="text-xs text-bordeaux">
            {tr("Die Endzeit muss nach der Startzeit liegen.", "The end time must be after the start time.")}
          </p>
        )}

        {mutation.error && (
          <p className="text-xs text-bordeaux">{(mutation.error as Error).message}</p>
        )}

        <button
          type="submit"
          disabled={
            mutation.isPending ||
            !name.trim() ||
            !email.trim() ||
            availableFrom >= availableTo
          }
          className="btn-gold w-fit disabled:opacity-40"
        >
          {mutation.isPending
            ? tr("Wird eingetragen…", "Joining…")
            : tr("Auf Warteliste setzen", "Join waitlist")}
        </button>
      </form>
    </div>
  );
}

const OPTIONAL_DUO_PREFIX = "OPTIONAL_DUO::";

function BookingPanel({
  slot,
  initialStartTime,
  onBooked,
  specialMinHours = null,
  minMinutes = null,
}: {
  slot: Slot;
  initialStartTime?: string | null;
  onBooked: () => void;
  specialMinHours?: number | null;
  minMinutes?: number | null;
}) {
  const tr = useTr();
  const { lang } = useLang();
  const DURATIONS = getDurations(lang).filter(
    (d) => minMinutes == null || typeof d.value !== "number" || d.value >= minMinutes,
  );
  const propose = useServerFn(proposeBookingTime);
  const submit = useServerFn(submitBooking);
  const qc = useQueryClient();

  const [durationChoice, setDurationChoice] = useState<number | "custom" | "ganztags">(60);
  useEffect(() => {
    if (minMinutes != null && typeof durationChoice === "number" && durationChoice < minMinutes) {
      const first = DURATIONS.find((d) => typeof d.value === "number");
      setDurationChoice(first ? first.value : "custom");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minMinutes, slot.id]);
  const [earliest, setEarliest] = useState(initialStartTime || "10:00");
  const [latest, setLatest] = useState("20:00");
  const [proposed, setProposed] = useState<{ start: string; end: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionType, setSessionType] = useState<"duo" | "single">("duo");
  const duoIsOptional = Boolean(slot.duo_partner?.startsWith(OPTIONAL_DUO_PREFIX));
  const duoPartner = duoIsOptional ? slot.duo_partner?.slice(OPTIONAL_DUO_PREFIX.length) || null : slot.duo_partner;
  const applyingProposalRef = useRef(false);

  const slotStartHm = formatMunichTime(slot.starts_at);
  const slotEndHm = formatMunichTime(slot.ends_at);

  useEffect(() => {
    if (initialStartTime && /^\d{2}:\d{2}$/.test(initialStartTime)) {
      setEarliest(initialStartTime);
      setProposed(null);
    }
  }, [initialStartTime, slot.id]);
  const windows = useMemo(() => {
    const rows = slot.windows?.length ? slot.windows : [slot];
    const uniqueRows = rows.filter((row, index) =>
      rows.findIndex((candidate) =>
        candidate.starts_at === row.starts_at &&
        candidate.ends_at === row.ends_at &&
        candidate.is_duo === row.is_duo &&
        candidate.duo_partner === row.duo_partner &&
        candidate.is_content_shoot === row.is_content_shoot
      ) === index
    );
    return [...uniqueRows].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [slot]);
  const windowAvailabilityLabel = (window: (typeof windows)[number]) =>
    window.is_duo
      ? window.duo_partner?.startsWith(OPTIONAL_DUO_PREFIX)
        ? tr("Single verfügbar – Duo verfügbar", "Single available – Duo available")
        : tr("Duo verfügbar", "Duo available")
      : tr("Single verfügbar", "Single available");
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
    ? Math.max(60, minMinutes ?? 0)
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
    mutationFn: (vars: { name: string; email: string; phone: string; message: string; proposedStart: string; marketingConsent: boolean }) => {
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
          marketing_consent: vars.marketingConsent,
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
    const liegezeitDuration = String(fd.get("liegezeit_duration") ?? "").trim();
    const liegezeitType = String(fd.get("liegezeit_type") ?? "").trim();
    const liegezeitNote = String(fd.get("liegezeit_note") ?? "").trim();
    const marketingConsent = fd.get("marketing_consent") === "on";
    const playWorld = String(fd.get("play_world") ?? "").trim();
    const experience = String(fd.get("experience") ?? "").trim();
    const preferences = String(fd.get("preferences") ?? "").trim();
    const taboos = String(fd.get("taboos") ?? "").trim();
    const health = String(fd.get("health") ?? "").trim();
    const safeword = String(fd.get("safeword") ?? "").trim();
    const note = String(fd.get("message") ?? "").trim();
    const liegezeitText = liegezeitDuration ? `Liegezeit: ${liegezeitDuration === "custom" ? (liegezeitNote || "individuelle Dauer") : `${liegezeitDuration} Minuten`} · ${liegezeitType || "unbeaufsichtigt"}` : null;
    const baseMessage = [
      liegezeitText,
      playWorld ? `Spielwelt: ${playWorld}` : null,
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
      ? `— Session-Art —\n${sessionType === "duo" ? `Duo Session${duoPartner ? ` (mit ${duoPartner})` : ""}` : "Single Session (nur mit Lady Vanilla Ice)"}\n\n`
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
      marketingConsent,
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
        {slot.is_duo && <span className="mr-2 align-middle text-[0.6rem] uppercase tracking-[0.22em] text-champagne border border-champagne/40 px-2 py-1">{duoIsOptional ? "Flex" : "Duo"}</span>}
        {slot.is_content_shoot && <span className="mr-2 align-middle text-[0.6rem] uppercase tracking-[0.22em] text-champagne border border-champagne/40 px-2 py-1">Content</span>}
        {formatMunichDate(slot.starts_at, lang)}
        {slot.is_duo && slot.duo_partner && (
          <span className="block font-script gold-text text-3xl mt-2">
            {tr("mit", "with")} {duoPartner}
          </span>
        )}
      </h3>
      {/* Booking information stacked vertically */}
      <div className="text-xs text-vanilla/60 mb-5 flex flex-col items-start gap-2">
        <div className="flex flex-col gap-1 pl-[17px] text-vanilla/80">
          {windows.map((window) => (
            <span key={window.id}>
              {formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}
              {window.is_content_shoot ? " · " + tr("Content-Dreh verfügbar", "Content shoot available") : ""}
            </span>
          ))}
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin size={11} className="text-champagne mt-0.5 shrink-0" />
          <span>{isPrivateLocation(slot.location) ? tr(PRIVATE_LOCATION_PUBLIC_TEXT.de, PRIVATE_LOCATION_PUBLIC_TEXT.en) : slot.location}</span>
        </div>
      </div>

      {slot.is_duo && duoIsOptional && (
        <div className="mb-5 border border-champagne/30 bg-champagne/[0.04] p-4">
          <div className="eyebrow mb-2 text-champagne">{tr("Session-Art wählen", "Choose session type")}</div>
          <p className="text-[0.7rem] text-vanilla/60 leading-relaxed mb-3">
            {tr(`An diesem Termin ist eine Duo-Session möglich${duoPartner ? ` (mit ${duoPartner})` : ""}. Du kannst aber auch eine Single-Session nur mit mir buchen.`, `A duo session is possible on this date${duoPartner ? ` (with ${duoPartner})` : ""}. You can also book a single session with me only.`)}
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
              <div>{tr(`mit ${duoPartner ?? "Partnerin"} & mir`, `with ${duoPartner ?? "partner"} & me`)}</div>
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
          {specialMinHours != null && (() => {
            const conditionDe = formatSpecialCondition(specialMinHours, "de");
            const conditionEn = formatSpecialCondition(specialMinHours, "en");
            if (durationChoice === "custom") {
              return (
                <p className="mt-2 text-[0.75rem] leading-relaxed text-champagne/85">
                  {tr(`Zur Erinnerung: Das SPECIAL gilt nur bei einer Buchung ab ${conditionDe.replace("Mindestens ", "")}. Gib deine gewünschte Dauer bitte in der Nachricht an.`, `Reminder: The special only applies to bookings of at least ${conditionEn.replace("Minimum ", "")}. Please state your desired duration in the message.`)}
                </p>
              );
            }
            const qualifies = effectiveDuration >= specialMinHours * 60;
            return qualifies ? (
              <p className="mt-2 text-[0.75rem] leading-relaxed text-champagne/85">
                {tr("Mit dieser Dauer ist das SPECIAL inbegriffen.", "The special is included with this duration.")}
              </p>
            ) : (
              <p className="mt-2 border border-champagne/30 bg-champagne/5 p-2.5 text-[0.75rem] leading-relaxed text-vanilla/80">
                {tr(`Hinweis: Bei dieser Dauer ist das SPECIAL nicht inbegriffen. Das SPECIAL gibt es erst bei einer Buchung ab ${conditionDe.replace("Mindestens ", "")}.`, `Note: The special is not included with this duration. It only applies to bookings of at least ${conditionEn.replace("Minimum ", "")}.`)}
              </p>
            );
          })()}
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
          <label className="eyebrow block mb-1.5">{tr("WhatsApp (optional)", "WhatsApp (optional)")}</label>
          <input name="phone" type="tel" maxLength={40} className="input-luxe" placeholder="+49 151 23456789" />
        </div>
        <div className="border border-champagne/20 bg-champagne/[0.03] p-4 space-y-4">
          <div>
            <div className="eyebrow text-champagne">{tr("Vorlieben & Grenzen", "Preferences & boundaries")}</div>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-vanilla/55">{tr("Diese Angaben helfen mir, deine Anfrage schnell und sicher einzuordnen.", "These details help me assess your request quickly and safely.")}</p>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">{tr("Spielwelt (optional)", "World of play (optional)")}</label>
            <select name="play_world" defaultValue="" className="input-luxe">
              <option value="">{tr("Keine Auswahl", "No selection")}</option>
              <option value={tr("Dein erstes Loslassen", "Your first surrender")}>{tr("Dein erstes Loslassen", "Your first surrender")}</option>
              <option value={tr("Mein Spiel mit deinem Kopf", "My game with your mind")}>{tr("Mein Spiel mit deinem Kopf", "My game with your mind")}</option>
              <option value={tr("Sanfte Macht", "Soft power")}>{tr("Sanfte Macht", "Soft power")}</option>
              <option value={tr("Wenn ich hart werde", "When I turn hard")}>{tr("Wenn ich hart werde", "When I turn hard")}</option>
              <option value={tr("Deine Verwandlung", "Your transformation")}>{tr("Deine Verwandlung", "Your transformation")}</option>
              <option value={tr("Nur für dich inszeniert", "Created only for you")}>{tr("Nur für dich inszeniert", "Created only for you")}</option>
            </select>
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

        <details className="border border-champagne/20 bg-champagne/[0.03]">
          <summary className="cursor-pointer px-4 py-3 text-sm text-champagne hover:text-vanilla transition">
            {tr("+ Ausweichtermin hinzufügen (optional)", "+ Add an alternative date (optional)")}
          </summary>
          <div className="border-t border-champagne/15 p-4">
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
          </div>
        </details>


        {/* LIEGEZEIT_BOOKING_FEATURE */}
        <details className="border border-champagne/20 bg-champagne/[0.03]">
          <summary className="cursor-pointer px-4 py-3 text-sm text-champagne hover:text-vanilla transition">
            {tr("+ Liegezeit hinzufügen (optional)", "+ Add restraint time (optional)")}
          </summary>
          <div className="space-y-4 border-t border-champagne/15 p-4">
            <p className="text-[0.7rem] leading-relaxed text-vanilla/55">
              {tr("Die Liegezeit liegt innerhalb deiner gebuchten Sessiondauer. Ein möglicher Aufpreis wird anschließend individuell bestätigt.", "The restraint time is included within your booked session duration. Any surcharge will be confirmed individually afterwards.")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eyebrow block mb-1.5">{tr("Gewünschte Dauer", "Requested duration")}</label>
                <select name="liegezeit_duration" defaultValue="" className="input-luxe">
                  <option value="">{tr("Keine Liegezeit", "No restraint time")}</option>
                  <option value="30">30 {tr("Minuten", "minutes")}</option>
                  <option value="60">60 {tr("Minuten", "minutes")}</option>
                  <option value="90">90 {tr("Minuten", "minutes")}</option>
                  <option value="120">120 {tr("Minuten", "minutes")}</option>
                  <option value="custom">{tr("Andere Dauer", "Other duration")}</option>
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-1.5">{tr("Art", "Type")}</label>
                <select name="liegezeit_type" defaultValue="unbeaufsichtigt" className="input-luxe">
                  <option value="unbeaufsichtigt">{tr("Unbeaufsichtigt", "Unsupervised")}</option>
                  <option value="beaufsichtigt">{tr("Beaufsichtigt", "Supervised")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">{tr("Dauer-Hinweis (optional)", "Duration note (optional)")}</label>
              <input name="liegezeit_note" maxLength={120} className="input-luxe" placeholder={tr("z. B. 45 Minuten", "e.g. 45 minutes")} />
            </div>
          </div>
        </details>

        <label className="flex items-start gap-3 text-xs text-vanilla/45 cursor-pointer">
          <input name="marketing_consent" type="checkbox" className="mt-0.5 accent-[var(--color-champagne)]" />
          <span>{tr("Ich möchte per E-Mail über neue verfügbare Termine informiert werden. Die Abmeldung ist jederzeit möglich.", "I would like to receive emails about newly available appointments. I can unsubscribe at any time.")}</span>
        </label>

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

  // Session and reservation colours include their own buffer. When two
  // buffers overlap, the shared interval is divided exactly in the middle so
  // the timeline stays continuous without one colour covering another.
  const raw = q.data.busy
    .map((b) => {
      const kind = b.kind ?? "booked";
      const rangeBuffer = (b.buffer_minutes ?? q.data.buffer_minutes) * 60_000;
      const coreStart = new Date(b.start).getTime();
      const coreEnd = new Date(b.end).getTime();
      return {
        s: Math.max(winStart, coreStart - rangeBuffer),
        e: Math.min(winEnd, coreEnd + rangeBuffer),
        coreStart,
        coreEnd,
        kind,
      };
    })
    .filter((r) => r.e > r.s)
    .sort((a, b) => a.coreStart - b.coreStart);

  for (let i = 0; i < raw.length - 1; i += 1) {
    const current = raw[i];
    const next = raw[i + 1];
    if (current.e <= next.s) continue;

    const overlapStart = next.s;
    const overlapEnd = current.e;
    const split = overlapStart + (overlapEnd - overlapStart) / 2;
    current.e = Math.max(current.coreEnd, split);
    next.s = Math.min(next.coreStart, split);
  }

  const merged: Array<{ s: number; e: number; kind: "booked" | "reserved" | "unavailable" | "single_only" }> = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && r.s <= last.e && last.kind === r.kind) {
      last.e = Math.max(last.e, r.e);
    } else {
      merged.push({ s: r.s, e: r.e, kind: r.kind });
    }
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
  const hourMs = 3_600_000;
  for (let t = Math.ceil(winStart / hourMs) * hourMs; t <= winEnd; t += hourMs) ticks.push(t);

  // Leave room for readable mobile labels and always show the exact endpoints.
  const labelTicks = getTimelineLabelTicks(winStart, winEnd, zoom);

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
        <div style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 20}rem` }}>
      <div className="relative h-10 border border-champagne/20 bg-champagne/[0.04]">
        {/* Blocked segments — rendered first so free buttons sit on top */}
        {merged.map((seg) => {
          const left = pct(seg.s);
          const width = pct(seg.e) - left;
          const isReserved = seg.kind === "reserved";
          const isUnavailable = seg.kind === "unavailable";
          const isSingleOnly = seg.kind === "single_only";
          return (
            <div
              key={`b-${seg.s}`}
              title={`${isUnavailable ? tr("Nicht freigegeben","Unavailable") : isReserved ? tr("Reserviert","Reserved") : isSingleOnly ? tr("Nur Einzel belegt","Single session booked") : tr("Belegt","Booked")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}
              className={`absolute top-0 bottom-0 pointer-events-none ${
                isUnavailable
                  ? "bg-anthracite/80 border-x border-vanilla/15"
                  : isReserved
                  ? "bg-vanilla/35 border-x border-vanilla/45"
                  : isSingleOnly
                  ? "bg-orange-500/60 border-x border-orange-700/70"
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
      <div className="relative h-5 mt-1.5 text-sm font-medium text-vanilla/75">
        {labelTicks.map((t) => {
          const p = pct(t);
          // Keep first/last labels inside the bar edges so nothing gets clipped.
          const align =
            p < 4 ? "translate-x-0 left-0" : p > 96 ? "-translate-x-full" : "-translate-x-1/2";
          return (
            <span
              key={t}
              className={`absolute whitespace-nowrap tabular-nums ${align}`}
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
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> {tr("nur Einzel belegt", "single session booked")}</span>
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>
      </div>
    </div>
  );
}
