import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Crown, HandCoins, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listCashBookEntries } from "@/lib/cashbook.functions";
import { listLongtermClients } from "@/lib/longterm.functions";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const berlinDay = (value: string | Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const berlinTime = (value: string) =>
  new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const shortDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
};
const daysUntil = (key: string, todayKey: string) => Math.round((Date.parse(`${key}T12:00:00Z`) - Date.parse(`${todayKey}T12:00:00Z`)) / 86_400_000);

type UpcomingBooking = {
  id: string;
  guest_name: string;
  requested_start: string | null;
  status: string;
  anzahlung_paid: boolean | null;
  deposit_exemption_reason: string | null;
  anzahlung: number | null;
  availability_slots: { starts_at: string } | null;
};

/** „Heute wichtig“: nächste Termine, offene Zahlungen und auslaufende Langzeiterziehungen. */
export function TodayFocus() {
  const listCashbook = useServerFn(listCashBookEntries);
  const listLongterm = useServerFn(listLongtermClients);
  const todayKey = berlinDay(new Date());

  const bookingsQ = useQuery({
    queryKey: ["admin-today-focus-bookings"],
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<UpcomingBooking[]> => {
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_name, requested_start, status, anzahlung_paid, deposit_exemption_reason, anzahlung, availability_slots(starts_at)")
        .eq("status", "confirmed")
        .gte("requested_start", since)
        .order("requested_start", { ascending: true })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as unknown as UpcomingBooking[];
    },
  });
  const cashbookQ = useQuery({ queryKey: ["admin-dashboard-cashbook"], queryFn: () => listCashbook() });
  const longtermQ = useQuery({ queryKey: ["longterm-clients"], queryFn: () => listLongterm() });

  const upcoming = (bookingsQ.data ?? []).filter((b) => b.requested_start && Date.parse(b.requested_start) >= Date.now() - 2 * 60 * 60 * 1000);
  const todays = upcoming.filter((b) => berlinDay(b.requested_start!) === todayKey);
  const nextOnes = (todays.length ? todays : upcoming).slice(0, 4);
  const depositOpen = upcoming.filter((b) => !b.anzahlung_paid && !b.deposit_exemption_reason && Number(b.anzahlung ?? 0) > 0);

  const openRest = (cashbookQ.data ?? []).filter(
    (e) => e.entry_type === "income" && e.source === "booking" && e.status !== "cancelled" && e.termin_datum <= todayKey && Math.max(0, e.restbetrag_vorgemerkt - e.bar) > 0,
  );
  const openRestSum = openRest.reduce((sum, e) => sum + Math.max(0, e.restbetrag_vorgemerkt - e.bar), 0);

  const latestByClient = new Map<string, { kunde: string; bis: string }>();
  for (const c of longtermQ.data ?? []) {
    const key = c.kunde.trim().toLowerCase();
    const prev = latestByClient.get(key);
    if (!prev || c.bis > prev.bis) latestByClient.set(key, { kunde: c.kunde, bis: c.bis });
  }
  const expiring = [...latestByClient.values()]
    .map((c) => ({ ...c, days: daysUntil(c.bis, todayKey) }))
    .filter((c) => c.days <= 7 && c.days >= -3)
    .sort((a, b) => a.days - b.days);

  const tile = "block border bg-card p-4 transition hover:border-champagne/70";
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <Link to="/admin/terminplan" className={`${tile} border-champagne/40 sm:col-span-2`}>
        <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-champagne">
          <CalendarClock size={16} /> {todays.length ? `Heute · ${todays.length} Termin${todays.length === 1 ? "" : "e"}` : "Nächste Termine"}
        </div>
        {bookingsQ.isLoading ? (
          <p className="mt-2 text-sm text-vanilla/50">Lade…</p>
        ) : nextOnes.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {nextOnes.map((b) => (
              <li key={b.id} className="flex justify-between gap-3">
                <span className="text-vanilla">{b.guest_name}</span>
                <span className="text-vanilla/60">
                  {berlinDay(b.requested_start!) === todayKey ? "" : `${shortDay(berlinDay(b.requested_start!))} · `}
                  {berlinTime(b.requested_start!)} Uhr
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-vanilla/50">Keine bestätigten Termine geplant.</p>
        )}
      </Link>

      <Link to="/admin/kassenbuch" className={`${tile} ${openRest.length ? "border-bordeaux/60" : "border-champagne/20"}`}>
        <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-champagne">
          <HandCoins size={16} /> Restzahlung offen
        </div>
        <div className="mt-2 font-display text-2xl text-vanilla">{eur(openRestSum)}</div>
        <p className="text-xs text-vanilla/50">
          {openRest.length ? `${openRest.length} vergangene${openRest.length === 1 ? "r Termin" : " Termine"} · im Kassenbuch unter „Offen“` : "Alles bezahlt."}
        </p>
      </Link>

      <Link to="/admin/termine" className={`${tile} ${depositOpen.length ? "border-amber-500/50" : "border-champagne/20"}`}>
        <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-champagne">
          <Wallet size={16} /> Anzahlung offen
        </div>
        <div className="mt-2 font-display text-2xl text-vanilla">{depositOpen.length}</div>
        <p className="text-xs text-vanilla/50">
          {depositOpen.length ? depositOpen.slice(0, 3).map((b) => b.guest_name).join(", ") : "Bei kommenden Terminen ist alles da."}
        </p>
      </Link>

      {expiring.length > 0 && (
        <Link to="/admin/terminplan" className={`${tile} border-purple-400/50 sm:col-span-2`}>
          <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-champagne">
            <Crown size={16} /> Langzeiterziehung läuft aus
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {expiring.map((c) => (
              <li key={c.kunde} className="flex justify-between gap-3">
                <span className="text-vanilla">{c.kunde}</span>
                <span className={c.days <= 3 ? "text-bordeaux" : "text-vanilla/60"}>
                  {c.days < 0 ? `seit ${-c.days} Tag${c.days === -1 ? "" : "en"} abgelaufen` : c.days === 0 ? "endet heute" : `noch ${c.days} Tag${c.days === 1 ? "" : "e"}`} · bis {shortDay(c.bis)}
                </span>
              </li>
            ))}
          </ul>
        </Link>
      )}
    </div>
  );
}
