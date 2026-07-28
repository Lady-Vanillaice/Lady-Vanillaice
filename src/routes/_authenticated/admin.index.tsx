import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAdminAccessRequests,
  decideAdminAccessRequest,
} from "@/lib/admin-access.functions";
import { PageHeader } from "@/components/site/PageHeader";
import {
  LogOut,
  Calendar,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Quote,
  Camera,
  Sparkles,
  Wallet,
  RotateCcw,
  CalendarClock,
  Users,
  Clock3,
  BadgeEuro,
  CircleAlert,
  ArrowRight,
} from "lucide-react";
import {
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Lady Vanilla Ice" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminHubPage,
});

type HubCard = {
  to:
    | "/admin/kalender"
    | "/admin/terminplan"
    | "/admin/termine"
    | "/admin/duo"
    | "/admin/contentdreh"
    | "/admin/custom"
    | "/admin/fotoshooting"
    | "/admin/kassenbuch"
    | "/admin/erfahrungsberichte"
    | "/admin/umplanen"
    | "/admin/kunden"
    | "/admin/agb";
  title: string;
  description: string;
  Icon: typeof Calendar;
};

type HubGroup = {
  label: string;
  hint: string;
  cards: HubCard[];
};

type DashboardBooking = {
  id: string;
  guest_name: string;
  requested_start: string | null;
  status: string;
  anzahlung_paid: boolean | null;
  anzahlung: number | null;
  bar: number | null;
  availability_slots:
    | { starts_at: string }[]
    | { starts_at: string }
    | null;
};

const HUB_GROUPS: HubGroup[] = [
  {
    label: "Termine & Kalender",
    hint: "Tagesgeschäft — Planung und Übersicht",
    cards: [
      { to: "/admin/terminplan", title: "Mein Terminplan", description: "Alle bestätigten Termine chronologisch nach Uhrzeit.", Icon: CalendarClock },
      { to: "/admin/kalender", title: "Kalender", description: "Termine anlegen, sperren und löschen.", Icon: Calendar },
      { to: "/admin/umplanen", title: "Storniert · Umplanen", description: "Fristgerecht stornierte Gäste — Anzahlung bleibt gültig.", Icon: RotateCcw },
    ],
  },
  {
    label: "Anfragen",
    hint: "Eingehende Buchungen prüfen und beantworten",
    cards: [
      { to: "/admin/termine", title: "Termin-Anfragen", description: "Reguläre Buchungsanfragen aus dem Kalender.", Icon: Mail },
      { to: "/admin/duo", title: "Duo-Anfragen", description: "Anfragen für Duo Sessions.", Icon: Mail },
      { to: "/admin/contentdreh", title: "Content-Dreh", description: "Anfragen für Content-Dreh-Termine.", Icon: Mail },
      { to: "/admin/custom", title: "Custom", description: "Anfragen für Custom Content (Bilder, Videos).", Icon: Sparkles },
      { to: "/admin/fotoshooting", title: "Fotoshooting", description: "Anfragen von Fotografen (TFP / Pay).", Icon: Camera },
    ],
  },
  {
    label: "Kunden & Finanzen",
    hint: "Gästedaten und Buchhaltung",
    cards: [
      { to: "/admin/kunden", title: "Kunden", description: "Gäste mit bestätigten Terminen — Kontakt, Vorlieben & Tabus.", Icon: Users },
      { to: "/admin/kassenbuch", title: "Kassenbuch", description: "Einnahmen, Anzahlungen und Bar-Beträge.", Icon: Wallet },
    ],
  },
  {
    label: "Inhalte",
    hint: "Website-Inhalte pflegen",
    cards: [
      { to: "/admin/erfahrungsberichte", title: "Erfahrungsberichte", description: "Eingereichte Erfahrungsberichte freigeben.", Icon: Quote },
      { to: "/admin/agb", title: "AGB", description: "AGB-Text bearbeiten und einfügen.", Icon: MessageSquare },
    ],
  },
];

function bookingStart(booking: DashboardBooking) {
  const slot = Array.isArray(booking.availability_slots)
    ? booking.availability_slots[0]
    : booking.availability_slots;
  return booking.requested_start ?? slot?.starts_at ?? null;
}

function AdminHubPage() {
  const navigate = useNavigate();
  async function onLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }
  return (
    <>
      <PageHeader
        eyebrow="Admin-Bereich"
        title={<>Dein <em className="font-script gold-text not-italic">Cockpit</em></>}
        intro="Alle wichtigen Termine, Zahlungen und Verwaltungsbereiche auf einen Blick."
      />

      <section className="py-16">
        <div className="container-luxe">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <Link to="/" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">Zur Website</Link>
            <button onClick={onLogout} className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <LogOut size={12} /> Abmelden
            </button>
          </div>

          <DashboardOverview />

          <div className="space-y-14 mb-12">
            {HUB_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5 pb-3 border-b border-champagne/15">
                  <h2 className="font-display text-2xl gold-text">{group.label}</h2>
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45">{group.hint}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.cards.map(({ to, title, description, Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="group bg-card border border-champagne/15 p-6 hover:border-champagne/50 transition flex flex-col gap-3"
                    >
                      <Icon size={24} className="text-champagne" />
                      <div className="font-display text-xl text-vanilla group-hover:text-champagne transition">{title}</div>
                      <p className="text-sm text-vanilla/65 leading-relaxed">{description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <AdminAccessRequestsPanel />
        </div>
      </section>
    </>
  );
}

function DashboardOverview() {
  const q = useQuery({
    queryKey: ["admin-dashboard-bookings"],
    queryFn: async (): Promise<DashboardBooking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_name, requested_start, status, anzahlung_paid, anzahlung, bar, availability_slots(starts_at)")
        .in("status", ["confirmed", "pending"]);
      if (error) throw error;
      return (data ?? []) as DashboardBooking[];
    },
  });

  const now = new Date();
  const today = startOfDay(now);
  const week = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  const month = { start: startOfMonth(now), end: endOfMonth(now) };
  const bookings = (q.data ?? [])
    .map((booking) => ({ booking, start: bookingStart(booking) }))
    .filter((row): row is { booking: DashboardBooking; start: string } => Boolean(row.start));
  const confirmed = bookings.filter(({ booking }) => booking.status === "confirmed");
  const todayBookings = confirmed.filter(({ start }) => startOfDay(new Date(start)).getTime() === today.getTime());
  const weekBookings = confirmed.filter(({ start }) => isWithinInterval(new Date(start), week));
  const monthBookings = confirmed.filter(({ start }) => isWithinInterval(new Date(start), month));
  const openDeposits = bookings.filter(({ booking }) => !booking.anzahlung_paid).length;
  const openCash = confirmed.filter(({ booking, start }) => new Date(start) <= now && Number(booking.bar ?? 0) <= 0).length;
  const monthRevenue = monthBookings.reduce(
    (sum, { booking }) => sum + Number(booking.anzahlung ?? 0) + Number(booking.bar ?? 0),
    0,
  );
  const nextBookings = confirmed
    .filter(({ start }) => new Date(start) >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  const metrics = [
    { label: "Termine heute", value: todayBookings.length, Icon: Clock3 },
    { label: "Termine diese Woche", value: weekBookings.length, Icon: CalendarClock },
    { label: "Offene Anzahlungen", value: openDeposits, Icon: CircleAlert },
    { label: "Offene Barzahlungen", value: openCash, Icon: Wallet },
    { label: "Umsatz diesen Monat", value: monthRevenue.toLocaleString("de-DE", { style: "currency", currency: "EUR" }), Icon: BadgeEuro },
  ];

  return (
    <div className="mb-14">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5 pb-3 border-b border-champagne/15">
        <h2 className="font-display text-2xl gold-text">Heute im Blick</h2>
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45">
          Stand {format(now, "dd.MM.yyyy · HH:mm", { locale: de })} Uhr
        </span>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-vanilla/50">Dashboard wird geladen…</p>
      ) : q.isError ? (
        <p className="text-sm text-bordeaux">Dashboard-Daten konnten nicht geladen werden.</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
            {metrics.map(({ label, value, Icon }) => (
              <div key={label} className="bg-card border border-champagne/15 p-5">
                <Icon size={18} className="text-champagne mb-3" />
                <div className="font-display text-2xl text-vanilla">{value}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-vanilla/50">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-champagne/15 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-display text-xl text-vanilla">Die nächsten Termine</h3>
              <Link to="/admin/terminplan" className="text-xs uppercase tracking-[0.16em] text-champagne hover:text-vanilla transition">
                Terminplan <ArrowRight size={12} className="inline" />
              </Link>
            </div>
            {nextBookings.length === 0 ? (
              <p className="text-sm text-vanilla/50">Keine kommenden bestätigten Termine.</p>
            ) : (
              <div className="divide-y divide-champagne/10">
                {nextBookings.map(({ booking, start }) => (
                  <Link
                    key={booking.id}
                    to="/admin/buchung/$id"
                    params={{ id: booking.id }}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 group"
                  >
                    <div>
                      <div className="text-vanilla group-hover:text-champagne transition">{booking.guest_name}</div>
                      <div className="text-xs text-vanilla/50">
                        {format(new Date(start), "EEEE, dd.MM.yyyy · HH:mm 'Uhr'", { locale: de })}
                      </div>
                    </div>
                    <span className={`text-[0.55rem] uppercase tracking-[0.16em] px-2 py-1 ${booking.anzahlung_paid ? "bg-green-700/30 text-green-200" : "bg-amber-700/30 text-amber-200"}`}>
                      {booking.anzahlung_paid ? "Anzahlung erhalten" : "Anzahlung offen"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AdminAccessRequestsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminAccessRequests);
  const decideFn = useServerFn(decideAdminAccessRequest);

  const reqQ = useQuery({
    queryKey: ["admin-access-requests"],
    queryFn: () => listFn(),
  });

  const decideMut = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected" }) => decideFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-access-requests"] }),
  });

  const pending = reqQ.data?.filter((r) => r.status === "pending") ?? [];
  const others = reqQ.data?.filter((r) => r.status !== "pending") ?? [];

  if (!reqQ.data || reqQ.data.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="font-display text-3xl gold-text flex items-center gap-3 mb-5">
        <ShieldCheck size={22} /> Admin-Freischaltungen
      </h2>

      {pending.length === 0 ? (
        <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center mb-4">
          Keine offenen Anfragen.
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {pending.map((r) => (
            <div key={r.id} className="bg-card border border-champagne/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-display text-lg text-vanilla">{r.requester_email}</div>
                  <div className="text-[0.65rem] text-vanilla/45 font-mono mt-1">{r.requester_user_id}</div>
                </div>
                <div className="text-[0.65rem] text-vanilla/45">
                  {format(new Date(r.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                </div>
              </div>
              {r.message && (
                <p className="text-sm text-vanilla/75 leading-relaxed bg-anthracite/40 p-3 border border-champagne/10 mb-3 whitespace-pre-line">
                  <MessageSquare size={11} className="inline mr-1 text-champagne" />
                  {r.message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={decideMut.isPending}
                  onClick={() => decideMut.mutate({ id: r.id, decision: "approved" })}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"
                >
                  <CheckCircle2 size={12} className="inline mr-1" /> Annehmen
                </button>
                <button
                  disabled={decideMut.isPending}
                  onClick={() => decideMut.mutate({ id: r.id, decision: "rejected" })}
                  className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux/60 text-bordeaux hover:bg-bordeaux/10 disabled:opacity-30"
                >
                  <XCircle size={12} className="inline mr-1" /> Ablehnen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-vanilla/55 hover:text-champagne text-xs uppercase tracking-[0.2em]">
            Erledigte Anfragen ({others.length})
          </summary>
          <div className="mt-3 space-y-2">
            {others.map((r) => (
              <div key={r.id} className="bg-card/60 border border-champagne/10 p-3 flex items-center justify-between gap-3 text-xs">
                <div className="text-vanilla/70">{r.requester_email}</div>
                <span
                  className={`uppercase tracking-[0.2em] px-2 py-0.5 text-[0.6rem] ${
                    r.status === "approved" ? "bg-green-700/30 text-green-200" : "bg-bordeaux/40 text-vanilla"
                  }`}
                >
                  {r.status === "approved" ? "Angenommen" : "Abgelehnt"}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
