import { useQuery } from "@tanstack/react-query";
import { realLocation } from "@/lib/slot-location";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { BarChart3, Calendar, CheckCircle2, MapPin, Percent, Timer, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listCashBookEntries } from "@/lib/cashbook.functions";
import { listCalendarSpecials } from "@/lib/calendar-special.functions";

type StatisticsBooking = {
  id: string;
  requested_start: string | null;
  duration_minutes: number | null;
  status: string;
  completed_at: string | null;
  studio_override: string | null;
  availability_slots:
    | { location?: string | null; is_duo?: boolean | null }[]
    | { location?: string | null; is_duo?: boolean | null }
    | null;
};

const eur = (value: number) =>
  value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

function berlinDateKey(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function BusinessStatisticsDashboard() {
  const listCashbook = useServerFn(listCashBookEntries);
  const listSpecials = useServerFn(listCalendarSpecials);

  const cashbookQ = useQuery({
    queryKey: ["admin-statistics-cashbook"],
    queryFn: () => listCashbook(),
  });
  const specialsQ = useQuery({
    queryKey: ["admin-statistics-specials"],
    queryFn: () => listSpecials(),
  });
  const bookingsQ = useQuery({
    queryKey: ["admin-statistics-bookings"],
    queryFn: async (): Promise<StatisticsBooking[]> => {
      const db = supabase as any;
      const { data, error } = await db
        .from("bookings")
        .select("id, requested_start, duration_minutes, status, completed_at, studio_override, availability_slots(location, is_duo)")
        .in("status", ["confirmed", "cancelled"]);
      if (error) throw error;
      return (data ?? []) as StatisticsBooking[];
    },
  });

  if (cashbookQ.isLoading || specialsQ.isLoading || bookingsQ.isLoading) {
    return (
      <section className="mb-8 border border-champagne/20 bg-card p-5">
        <p className="text-xs text-vanilla/50">Statistik-Dashboard wird geladen…</p>
      </section>
    );
  }

  if (cashbookQ.isError || specialsQ.isError || bookingsQ.isError) {
    return (
      <section className="mb-8 border border-champagne/20 bg-card p-5">
        <p className="text-xs text-bordeaux">Statistik-Dashboard konnte nicht vollständig geladen werden.</p>
      </section>
    );
  }

  const bookings = bookingsQ.data ?? [];
  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  const cancelled = bookings.filter((booking) => booking.status === "cancelled");
  const finalCount = confirmed.length + cancelled.length;
  const cancellationRate = finalCount > 0 ? (cancelled.length / finalCount) * 100 : 0;

  const durationCounts = new Map<number, number>();
  const weekdayCounts = new Map<string, number>();
  const studioCounts = new Map<string, number>();
  let duoSessions = 0;

  for (const booking of confirmed) {
    if (booking.duration_minutes && booking.duration_minutes > 0) {
      durationCounts.set(
        booking.duration_minutes,
        (durationCounts.get(booking.duration_minutes) ?? 0) + 1,
      );
    }

    if (booking.requested_start) {
      const weekday = new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        weekday: "long",
      }).format(new Date(booking.requested_start));
      weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
    }

    const slot = Array.isArray(booking.availability_slots)
      ? booking.availability_slots[0]
      : booking.availability_slots;
    const studio = (booking.studio_override || realLocation(slot?.location) || "").trim();
    if (studio && studio !== "__URLAUB__") {
      studioCounts.set(studio, (studioCounts.get(studio) ?? 0) + 1);
    }
    if (slot?.is_duo) duoSessions += 1;
  }

  const topDuration = [...durationCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topWeekday = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topStudio = [...studioCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(15);
    date.setMonth(date.getMonth() - (5 - index));
    const key = format(date, "yyyy-MM");

    const amount = (cashbookQ.data ?? [])
      .filter((entry) => entry.entry_type === "income")
      .reduce((sum, entry) => {
        if (entry.source === "manual") {
          return entry.payment_date?.startsWith(key)
            ? sum + Number(entry.gesamt ?? 0)
            : sum;
        }
        const deposit = entry.anzahlung_datum?.startsWith(key)
          ? Number(entry.anzahlung ?? 0)
          : 0;
        const cash = entry.bar_datum?.startsWith(key)
          ? Number(entry.bar ?? 0)
          : 0;
        return sum + deposit + cash;
      }, 0);

    return {
      key,
      label: format(date, "MMM yy", { locale: de }),
      amount,
    };
  });

  const maxRevenue = Math.max(1, ...monthlyRevenue.map((row) => row.amount));

  // Verteilung nach Wochentag und Startzeit (bestätigte Termine).
  const weekdayOrder = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const weekdayRows = weekdayOrder.map((day) => ({ label: day.slice(0, 2), count: weekdayCounts.get(day) ?? 0 }));
  const hourBuckets = [
    { label: "vor 12", from: 0, to: 12 },
    { label: "12–15", from: 12, to: 15 },
    { label: "15–18", from: 15, to: 18 },
    { label: "18–21", from: 18, to: 21 },
    { label: "ab 21", from: 21, to: 24 },
  ].map((bucket) => ({ ...bucket, count: 0 }));
  for (const booking of confirmed) {
    if (!booking.requested_start) continue;
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23" }).format(new Date(booking.requested_start)));
    const bucket = hourBuckets.find((b) => hour >= b.from && hour < b.to);
    if (bucket) bucket.count += 1;
  }
  const maxWeekday = Math.max(1, ...weekdayRows.map((r) => r.count));
  const maxHour = Math.max(1, ...hourBuckets.map((r) => r.count));

  // Einnahmen nach Art (letzte 6 Monate, nach Zahlungseingang).
  const firstMonthKey = monthlyRevenue[0]?.key ?? "0000-00";
  const categoryOf = (entry: { source: string; studio: string; notiz: string | null; art: string }) => {
    if (entry.source === "booking") return "Sessions";
    if (entry.studio === "Langzeiterziehung") return "Langzeiterziehung";
    if (entry.studio === "Camsession") return "Cam";
    if (entry.studio === "Zahlsklave" || entry.notiz === "Zahlsklave") return "Zahlsklave";
    if (entry.studio === "Custom Content" || entry.art === "Custom Content") return "Custom";
    if (entry.studio === "Telefon-Session") return "Telefon";
    return "Sonstiges";
  };
  const categoryTotals = new Map<string, number>();
  for (const entry of cashbookQ.data ?? []) {
    if (entry.entry_type !== "income") continue;
    let amount = 0;
    if (entry.source === "manual") {
      if ((entry.payment_date ?? "").slice(0, 7) >= firstMonthKey) amount = Number(entry.gesamt ?? 0);
    } else {
      if ((entry.anzahlung_datum ?? "").slice(0, 7) >= firstMonthKey) amount += Number(entry.anzahlung ?? 0);
      if ((entry.bar_datum ?? "").slice(0, 7) >= firstMonthKey) amount += Number(entry.bar ?? 0);
    }
    if (amount <= 0) continue;
    const cat = categoryOf(entry as any);
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + amount);
  }
  const categoryRows = [...categoryTotals.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
  const categorySum = categoryRows.reduce((sum, r) => sum + r.amount, 0);

  const specialsByDate = new Map(
    (specialsQ.data ?? []).map((special) => [special.date, special]),
  );
  const specialCounts = new Map<string, { title: string; count: number }>();

  for (const booking of confirmed) {
    if (!booking.requested_start) continue;
    const dayKey = berlinDateKey(booking.requested_start);
    const special = specialsByDate.get(dayKey);
    if (!special) continue;
    const current = specialCounts.get(dayKey) ?? { title: special.title, count: 0 };
    current.count += 1;
    specialCounts.set(dayKey, current);
  }

  const specialRanking = [...specialCounts.entries()]
    .map(([date, row]) => ({ date, ...row }))
    .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date))
    .slice(0, 5);

  const durationLabel = topDuration
    ? topDuration[0] % 60 === 0
      ? String(topDuration[0] / 60) + " Std."
      : String(topDuration[0]) + " Min."
    : "–";

  return (
    <section className="mb-8 border border-champagne/25 bg-card p-4 sm:p-5">
      <div className="mb-5 flex items-start gap-3">
        <BarChart3 className="mt-0.5 text-champagne" size={20} />
        <div>
          <h2 className="font-display text-2xl gold-text">Statistik-Dashboard</h2>
          <p className="mt-1 text-xs leading-relaxed text-vanilla/50">
            Aus bestätigten und stornierten Buchungen sowie tatsächlichen Zahlungseingängen im Kassenbuch.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <div className="border border-champagne/15 bg-anthracite/30 p-3">
          <Timer size={15} className="mb-2 text-champagne" />
          <div className="font-display text-2xl text-vanilla">{durationLabel}</div>
          <div className="mt-1 text-[0.55rem] uppercase tracking-[0.15em] text-vanilla/45">
            Meistgebuchte Dauer{topDuration ? " · " + topDuration[1] + "×" : ""}
          </div>
        </div>

        <div className="border border-champagne/15 bg-anthracite/30 p-3">
          <Calendar size={15} className="mb-2 text-champagne" />
          <div className="font-display text-2xl capitalize text-vanilla">{topWeekday?.[0] ?? "–"}</div>
          <div className="mt-1 text-[0.55rem] uppercase tracking-[0.15em] text-vanilla/45">
            Beliebtester Tag{topWeekday ? " · " + topWeekday[1] + "×" : ""}
          </div>
        </div>

        <div className="border border-champagne/15 bg-anthracite/30 p-3">
          <Percent size={15} className="mb-2 text-champagne" />
          <div className="font-display text-2xl text-vanilla">
            {cancellationRate.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %
          </div>
          <div className="mt-1 text-[0.55rem] uppercase tracking-[0.15em] text-vanilla/45">
            Stornoquote · {cancelled.length} storniert
          </div>
        </div>

        <div className="border border-champagne/15 bg-anthracite/30 p-3">
          <MapPin size={15} className="mb-2 text-champagne" />
          <div className="font-display text-lg leading-tight text-vanilla">{topStudio?.[0] ?? "–"}</div>
          <div className="mt-1 text-[0.55rem] uppercase tracking-[0.15em] text-vanilla/45">
            Meistgenutztes Studio{topStudio ? " · " + topStudio[1] + "×" : ""}
          </div>
        </div>

        <div className="border border-champagne/15 bg-anthracite/30 p-3">
          <Users size={15} className="mb-2 text-champagne" />
          <div className="font-display text-2xl text-vanilla">{duoSessions}</div>
          <div className="mt-1 text-[0.55rem] uppercase tracking-[0.15em] text-vanilla/45">
            Duo-Sessions
          </div>
        </div>

        <div className="border border-champagne/15 bg-anthracite/30 p-3">
          <CheckCircle2 size={15} className="mb-2 text-champagne" />
          <div className="font-display text-2xl text-vanilla">{confirmed.length}</div>
          <div className="mt-1 text-[0.55rem] uppercase tracking-[0.15em] text-vanilla/45">
            Bestätigte Buchungen
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="eyebrow text-champagne">Umsatz · letzte 6 Monate</h3>
            <span className="text-[0.6rem] text-vanilla/40">nach Zahlungseingang</span>
          </div>

          <div className="space-y-2 border border-champagne/15 p-3">
            {monthlyRevenue.map((row) => (
              <div key={row.key} className="grid grid-cols-[58px_1fr_auto] items-center gap-2">
                <span className="text-xs capitalize text-vanilla/55">{row.label}</span>
                <div className="h-2 overflow-hidden bg-champagne/10">
                  <div
                    className="h-full bg-champagne/70"
                    style={{
                      width:
                        String(
                          Math.max(
                            row.amount > 0 ? 4 : 0,
                            (row.amount / maxRevenue) * 100,
                          ),
                        ) + "%",
                    }}
                  />
                </div>
                <span className="min-w-[78px] text-right text-xs text-vanilla">
                  {eur(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="eyebrow text-champagne">Einnahmen nach Art · 6 Monate</h3>
            <span className="text-[0.6rem] text-vanilla/40">{eur(categorySum)}</span>
          </div>
          <div className="space-y-2 border border-champagne/15 p-3">
            {categoryRows.length === 0 ? <p className="text-xs text-vanilla/45">Noch keine Einnahmen.</p> : categoryRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-2">
                <span className="text-xs text-vanilla/70">{row.label}</span>
                <div className="h-2 overflow-hidden bg-champagne/10"><div className="h-full bg-champagne/70" style={{ width: String(Math.max(4, (row.amount / Math.max(1, categorySum)) * 100)) + "%" }} /></div>
                <span className="min-w-[78px] text-right text-xs text-vanilla">{eur(row.amount)} <span className="text-vanilla/40">· {Math.round((row.amount / Math.max(1, categorySum)) * 100)} %</span></span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="eyebrow mb-3 text-champagne">Termine nach Wochentag</h3>
          <div className="flex h-32 items-end gap-2 border border-champagne/15 p-3">
            {weekdayRows.map((row) => (
              <div key={row.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[0.6rem] text-vanilla/60">{row.count}</span>
                <div className="w-full bg-champagne/70" style={{ height: String(Math.max(row.count > 0 ? 6 : 2, (row.count / maxWeekday) * 70)) + "px" }} />
                <span className="text-[0.6rem] uppercase text-vanilla/50">{row.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="eyebrow mb-3 text-champagne">Termine nach Uhrzeit (Beginn)</h3>
          <div className="flex h-32 items-end gap-2 border border-champagne/15 p-3">
            {hourBuckets.map((row) => (
              <div key={row.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[0.6rem] text-vanilla/60">{row.count}</span>
                <div className="w-full bg-champagne/70" style={{ height: String(Math.max(row.count > 0 ? 6 : 2, (row.count / maxHour) * 70)) + "px" }} />
                <span className="text-[0.6rem] text-vanilla/50">{row.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="eyebrow mb-3 text-champagne">Specials mit den meisten Buchungen</h3>
          <div className="border border-champagne/15">
            {specialRanking.length === 0 ? (
              <p className="p-4 text-xs leading-relaxed text-vanilla/45">
                Noch keine bestätigten Buchungen auf einem gespeicherten SPECIAL-Tag.
              </p>
            ) : (
              <div className="divide-y divide-champagne/10">
                {specialRanking.map((special, index) => (
                  <div key={special.date} className="flex items-center justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <div className="text-sm text-vanilla">
                        <span className="mr-2 text-champagne">#{index + 1}</span>
                        {special.title}
                      </div>
                      <div className="mt-0.5 text-[0.6rem] text-vanilla/40">
                        {format(new Date(special.date + "T12:00:00"), "dd.MM.yyyy", { locale: de })}
                      </div>
                    </div>
                    <strong className="font-display text-xl text-champagne">{special.count}×</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
