import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listAdminAccessRequests, decideAdminAccessRequest } from "@/lib/admin-access.functions";
import {
  getPushConfiguration,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push-notifications.functions";
import { PageHeader } from "@/components/site/PageHeader";
import {
  LogOut, Calendar, Mail, ShieldCheck, CheckCircle2, XCircle, MessageSquare, Quote,
  Camera, Sparkles, Wallet, RotateCcw, CalendarClock, Users, Clock3, BadgeEuro,
  CircleAlert, ArrowRight, ChevronDown, Download, Share, Bell, BellOff, Send,
} from "lucide-react";
import { endOfMonth, endOfWeek, format, isWithinInterval, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Lady Vanilla Ice" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminHubPage,
});

type HubCard = {
  to: "/admin/kalender" | "/admin/terminplan" | "/admin/termine" | "/admin/duo" | "/admin/contentdreh" | "/admin/custom" | "/admin/fotoshooting" | "/admin/kassenbuch" | "/admin/erfahrungsberichte" | "/admin/umplanen" | "/admin/kunden" | "/admin/agb" | "/admin/newsletter";
  title: string;
  description: string;
  Icon: typeof Calendar;
};

type HubGroup = { label: string; hint: string; cards: HubCard[] };

type DashboardBooking = {
  id: string;
  guest_name: string;
  requested_start: string | null;
  status: string;
  anzahlung_paid: boolean | null;
  anzahlung: number | null;
  anzahlung_method: string | null;
  anzahlung_paid_at: string | null;
  deposit_exemption_reason: string | null;
  bar: number | null;
  cash_received_at: string | null;
  completed_at: string | null;
  fully_paid: boolean | null;
  created_at: string;
  availability_slots: { starts_at: string }[] | { starts_at: string } | null;
};

type PaymentRow = { booking: DashboardBooking; start: string };
type RevenueRow = { booking: DashboardBooking; kind: "Anzahlung" | "Barzahlung"; amount: number; paidAt: string };
type DetailKind = "deposit" | "cash" | "revenue" | null;

const HUB_GROUPS: HubGroup[] = [
  { label: "Termine & Kalender", hint: "Tagesgeschäft — Planung und Übersicht", cards: [
    { to: "/admin/terminplan", title: "Mein Terminplan", description: "Alle bestätigten Termine chronologisch nach Uhrzeit.", Icon: CalendarClock },
    { to: "/admin/kalender", title: "Kalender", description: "Termine anlegen, sperren und löschen.", Icon: Calendar },
    { to: "/admin/umplanen", title: "Storniert · Umplanen", description: "Fristgerecht stornierte Gäste — Anzahlung bleibt gültig.", Icon: RotateCcw },
  ]},
  { label: "Anfragen", hint: "Eingehende Buchungen prüfen und beantworten", cards: [
    { to: "/admin/termine", title: "Termin-Anfragen", description: "Reguläre Buchungsanfragen aus dem Kalender.", Icon: Mail },
    { to: "/admin/duo", title: "Duo-Anfragen", description: "Anfragen für Duo Sessions.", Icon: Mail },
    { to: "/admin/contentdreh", title: "Content-Dreh", description: "Anfragen für Content-Dreh-Termine.", Icon: Mail },
    { to: "/admin/custom", title: "Custom", description: "Anfragen für Custom Content (Bilder, Videos).", Icon: Sparkles },
    { to: "/admin/fotoshooting", title: "Fotoshooting", description: "Anfragen von Fotografen (TFP / Pay).", Icon: Camera },
  ]},
  { label: "Kunden & Finanzen", hint: "Gästedaten und Buchhaltung", cards: [
    { to: "/admin/kunden", title: "Kunden", description: "Gäste mit bestätigten Terminen — Kontakt, Vorlieben & Tabus.", Icon: Users },
    { to: "/admin/kassenbuch", title: "Kassenbuch", description: "Einnahmen, Anzahlungen und Bar-Beträge.", Icon: Wallet },
  ]},
  { label: "Inhalte", hint: "Website-Inhalte pflegen", cards: [
    { to: "/admin/newsletter", title: "Neue Termine versenden", description: "Newsletter an bestätigte Empfänger senden.", Icon: Send },
    { to: "/admin/erfahrungsberichte", title: "Erfahrungsberichte", description: "Eingereichte Erfahrungsberichte freigeben.", Icon: Quote },
    { to: "/admin/agb", title: "AGB", description: "AGB-Text bearbeiten und einfügen.", Icon: MessageSquare },
  ]},
];

function bookingStart(booking: DashboardBooking) {
  const slot = Array.isArray(booking.availability_slots) ? booking.availability_slots[0] : booking.availability_slots;
  return booking.requested_start ?? slot?.starts_at ?? null;
}

const eur = (value: number) => value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const statusLabel = (status: string) => ({ confirmed: "Bestätigt", pending: "Anfrage", cancelled: "Storniert", rescheduling: "Umplanen" }[status] ?? status);

function AdminHubPage() {
  const navigate = useNavigate();
  async function onLogout() { await supabase.auth.signOut(); navigate({ to: "/" }); }
  return <>
    <PageHeader eyebrow="Admin-Bereich" title={<>Dein <em className="font-script gold-text not-italic">Cockpit</em></>} intro="Termine, Anfragen und Zahlungen schnell finden und bearbeiten." />
    <section className="py-10 sm:py-14"><div className="container-luxe">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <Link to="/" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">Zur Website</Link>
        <button onClick={onLogout} className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]"><LogOut size={12} /> Abmelden</button>
      </div>

      <InstallAdminApp />
      <PushNotificationsCard />

      <DashboardOverview />

      <section className="mb-10">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-champagne/15">
          <h2 className="font-display text-2xl gold-text">Schnellzugriff</h2>
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45">Häufig verwendet</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/admin/terminplan" className="group bg-card border border-champagne/25 p-4 hover:border-champagne/60 transition">
            <CalendarClock size={19} className="text-champagne mb-2" />
            <div className="font-display text-lg text-vanilla group-hover:text-champagne transition">Terminplan</div>
            <div className="text-xs text-vanilla/45 mt-1">Bestätigte Termine</div>
          </Link>
          <Link to="/admin/kalender" className="group bg-card border border-champagne/25 p-4 hover:border-champagne/60 transition">
            <Calendar size={19} className="text-champagne mb-2" />
            <div className="font-display text-lg text-vanilla group-hover:text-champagne transition">Kalender</div>
            <div className="text-xs text-vanilla/45 mt-1">Verfügbarkeit eintragen</div>
          </Link>
          <Link to="/admin/termine" className="group bg-card border border-champagne/25 p-4 hover:border-champagne/60 transition">
            <Mail size={19} className="text-champagne mb-2" />
            <div className="font-display text-lg text-vanilla group-hover:text-champagne transition">Anfragen</div>
            <div className="text-xs text-vanilla/45 mt-1">Neue Anfragen prüfen</div>
          </Link>
          <Link to="/admin/kassenbuch" className="group bg-card border border-champagne/25 p-4 hover:border-champagne/60 transition">
            <Wallet size={19} className="text-champagne mb-2" />
            <div className="font-display text-lg text-vanilla group-hover:text-champagne transition">Kassenbuch</div>
            <div className="text-xs text-vanilla/45 mt-1">Zahlungen verwalten</div>
          </Link>
        </div>
      </section>

      <div className="space-y-9 mb-12">{HUB_GROUPS.map(group => <div key={group.label}>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5 pb-3 border-b border-champagne/15">
          <h2 className="font-display text-2xl gold-text">{group.label}</h2><span className="text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/45">{group.hint}</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{group.cards.map(({ to, title, description, Icon }) => <Link key={to} to={to} className="group bg-card border border-champagne/15 p-4 hover:border-champagne/50 transition grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1">
          <Icon size={19} className="text-champagne mt-0.5 row-span-2" /><div className="font-display text-lg text-vanilla group-hover:text-champagne transition">{title}</div><p className="text-xs text-vanilla/55 leading-relaxed">{description}</p>
        </Link>)}</div>
      </div>)}</div>
      <AdminAccessRequestsPanel />
    </div></section>
  </>;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function PushNotificationsCard() {
  const getConfig = useServerFn(getPushConfiguration);
  const saveSubscription = useServerFn(savePushSubscription);
  const removeSubscription = useServerFn(removePushSubscription);
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(available);
    if (!available) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription)))
      .catch(() => setSupported(false));
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const config = await getConfig();
      if (!config.configured || !config.publicKey) throw new Error("Push ist noch nicht konfiguriert.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Benachrichtigungen wurden nicht erlaubt.");
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }));
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Das Gerät hat keine vollständige Push-Anmeldung geliefert.");
      }
      await saveSubscription({
        data: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
      });
      setEnabled(true);
      setMessage("Push-Mitteilungen sind aktiv.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Push konnte nicht aktiviert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removeSubscription({ data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setMessage("Push-Mitteilungen sind ausgeschaltet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Push konnte nicht ausgeschaltet werden.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <section className="mb-8 border border-champagne/30 bg-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-champagne">
            {enabled ? <Bell size={17} /> : <BellOff size={17} />}
            <h2 className="font-display text-xl">Buchungs-Push</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-vanilla/55">
            {enabled
              ? "Du wirst auf diesem Gerät über neue Buchungsanfragen informiert."
              : "Aktiviere Mitteilungen für neue Buchungsanfragen auf diesem Gerät."}
          </p>
          {message && <p className="mt-2 text-xs text-vanilla/75">{message}</p>}
        </div>
        <button
          type="button"
          onClick={enabled ? disable : enable}
          disabled={busy}
          className={enabled ? "btn-outline-gold shrink-0 !py-2.5 !px-5 !text-[0.65rem]" : "btn-gold shrink-0 !py-2.5 !px-5 !text-[0.65rem]"}
        >
          {enabled ? <BellOff size={13} /> : <Bell size={13} />}
          {busy ? "Bitte warten…" : enabled ? "Ausschalten" : "Aktivieren"}
        </button>
      </div>
    </section>
  );
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstallAdminApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setStandalone(standaloneMode);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setPrompt(null);
      setShowIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;

  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setPrompt(null);
      return;
    }
    setShowIosHelp(true);
  }

  return (
    <section className="mb-8 border border-champagne/30 bg-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-champagne">
            <Download size={17} />
            <h2 className="font-display text-xl">LVI Admin als App installieren</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-vanilla/55">
            Öffnet dieses Cockpit künftig direkt vom Home-Bildschirm – ohne Browserleiste.
          </p>
        </div>
        <button type="button" onClick={install} className="btn-gold shrink-0 !py-2.5 !px-5 !text-[0.65rem]">
          <Download size={13} />
          App installieren
        </button>
      </div>
      {showIosHelp && (
        <div className="mt-4 border-t border-champagne/15 pt-4 text-sm text-vanilla/70">
          {isIos ? (
            <p className="flex items-start gap-2">
              <Share size={17} className="mt-0.5 shrink-0 text-champagne" />
              Tippe in Safari auf „Teilen“ und anschließend auf „Zum Home-Bildschirm“.
            </p>
          ) : (
            <p>Öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p>
          )}
        </div>
      )}
    </section>
  );
}

function DashboardOverview() {
  const [detail, setDetail] = useState<DetailKind>(null);
  const q = useQuery({
    queryKey: ["admin-dashboard-bookings"],
    queryFn: async (): Promise<DashboardBooking[]> => {
      const { data, error } = await supabase.from("bookings")
        .select("id, guest_name, requested_start, status, anzahlung_paid, anzahlung, anzahlung_method, anzahlung_paid_at, deposit_exemption_reason, bar, cash_received_at, completed_at, fully_paid, created_at, availability_slots(starts_at)")
        .in("status", ["confirmed", "pending", "cancelled", "rescheduling"]);
      if (error) throw error;
      return (data ?? []) as DashboardBooking[];
    },
  });

  const pendingRequests = (q.data ?? [])
    .map(booking => ({ booking, start: bookingStart(booking) }))
    .filter((row): row is PaymentRow => Boolean(row.start))
    .filter(({ booking }) => {
      if (booking.completed_at || booking.fully_paid || booking.cash_received_at) return false;
      if (!["pending", "rescheduling", "open"].includes(booking.status)) return false;
      return Date.now() - new Date(booking.created_at).getTime() <= 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const now = new Date();
  const currentMonth = { start: startOfMonth(now), end: endOfMonth(now) };
  const monthRevenue = (q.data ?? []).reduce((sum, booking) => {
    let received = 0;
    if (booking.anzahlung_paid && Number(booking.anzahlung ?? 0) > 0 && booking.anzahlung_paid_at && isWithinInterval(new Date(booking.anzahlung_paid_at), currentMonth)) {
      received += Number(booking.anzahlung);
    }
    const cashDate = booking.cash_received_at ?? (booking.fully_paid ? booking.completed_at : null);
    if (Number(booking.bar ?? 0) > 0 && cashDate && isWithinInterval(new Date(cashDate), currentMonth)) {
      received += Number(booking.bar);
    }
    return sum + received;
  }, 0);
  return <div className="mb-10">
    {q.isLoading ? <p className="text-sm text-vanilla/50">Offene Anfragen werden geladen…</p> : q.isError ? <p className="text-sm text-bordeaux">Offene Anfragen konnten nicht geladen werden.</p> : (
      <div className="space-y-4">
        <Link to="/admin/termine" className="block bg-card border border-champagne/35 p-5 hover:border-champagne/70 transition">
          <Mail size={20} className="text-champagne mb-4" />
          <div className="font-display text-3xl text-vanilla">{pendingRequests.length}</div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-vanilla/50">Unbeantwortete Anfragen</div>
        </Link>
        <Link to="/admin/kassenbuch" className="block bg-card border border-champagne/20 p-5 hover:border-champagne/60 transition">
          <BadgeEuro size={20} className="text-champagne mb-4" />
          <div className="font-display text-3xl text-vanilla">{eur(monthRevenue)}</div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-vanilla/50">Umsatz {format(now, "MMMM yyyy", { locale: de })}</div>
        </Link>
      </div>
    )}
  </div>;
}

function PaymentDetails({ title, empty, rows, amount, note }: { title: string; empty: string; rows: PaymentRow[]; amount: (row: PaymentRow) => number; note: (row: PaymentRow) => string }) {
  return <div className="bg-card border border-champagne/30 p-5 mb-5">
    <h3 className="font-display text-xl text-vanilla mb-4">{title}</h3>
    {rows.length === 0 ? <p className="text-sm text-vanilla/50">{empty}</p> : <div className="divide-y divide-champagne/10">{rows.map(row => <Link key={row.booking.id} to="/admin/buchung/$id" params={{ id: row.booking.id }} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 group">
      <div><div className="text-vanilla group-hover:text-champagne transition">{row.booking.guest_name}</div><div className="text-xs text-vanilla/50">{format(new Date(row.start), "dd.MM.yyyy · HH:mm 'Uhr'", { locale: de })}</div><div className="text-xs text-vanilla/40 mt-1">{note(row)}</div></div>
      <div className="text-right"><div className="font-display text-xl text-champagne">{eur(amount(row))}</div><div className="text-[0.55rem] uppercase tracking-[0.16em] text-vanilla/40">Buchung öffnen</div></div>
    </Link>)}</div>}
  </div>;
}

function RevenueDetails({ rows, total }: { rows: RevenueRow[]; total: number }) {
  return <div className="bg-card border border-champagne/30 p-5 mb-5">
    <h3 className="font-display text-xl text-vanilla mb-1">Eingegangene Zahlungen diesen Monat</h3>
    <p className="text-xs text-vanilla/45 mb-4">Nach tatsächlichem Zahlungseingang – einschließlich stornierter und umgeplanter Buchungen.</p>
    {rows.length === 0 ? <p className="text-sm text-vanilla/50">Keine eingegangenen Zahlungen in diesem Monat.</p> : <>
      <div className="divide-y divide-champagne/10">{rows.map((row, index) => <Link key={`${row.booking.id}-${row.kind}-${index}`} to="/admin/buchung/$id" params={{ id: row.booking.id }} className="flex items-center justify-between gap-4 py-3 first:pt-0 group">
        <div><div className="text-vanilla group-hover:text-champagne transition">{row.booking.guest_name}</div><div className="text-xs text-vanilla/50">{row.kind} · Eingang {format(new Date(row.paidAt), "dd.MM.yyyy", { locale: de })}</div><div className="text-xs text-vanilla/40 mt-1">Status: {statusLabel(row.booking.status)}</div></div>
        <div className="text-right"><div className="font-display text-xl text-champagne">{eur(row.amount)}</div><div className="text-[0.55rem] uppercase tracking-[0.16em] text-vanilla/40">Buchung öffnen</div></div>
      </Link>)}</div>
      <div className="mt-4 pt-4 border-t border-champagne/25 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.18em] text-vanilla/55">Gesamt</span><strong className="font-display text-2xl text-champagne">{eur(total)}</strong></div>
    </>}
  </div>;
}

function AdminAccessRequestsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminAccessRequests);
  const decideFn = useServerFn(decideAdminAccessRequest);
  const reqQ = useQuery({ queryKey: ["admin-access-requests"], queryFn: () => listFn() });
  const decideMut = useMutation({ mutationFn: (v: { id: string; decision: "approved" | "rejected" }) => decideFn({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-access-requests"] }) });
  const pending = reqQ.data?.filter(r => r.status === "pending") ?? [];
  const others = reqQ.data?.filter(r => r.status !== "pending") ?? [];
  if (!reqQ.data || reqQ.data.length === 0) return null;
  return <div className="mb-10">
    <h2 className="font-display text-3xl gold-text flex items-center gap-3 mb-5"><ShieldCheck size={22} /> Admin-Freischaltungen</h2>
    {pending.length === 0 ? <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center mb-4">Keine offenen Anfragen.</p> : <div className="space-y-3 mb-4">{pending.map(r => <div key={r.id} className="bg-card border border-champagne/15 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3"><div><div className="font-display text-lg text-vanilla">{r.requester_email}</div><div className="text-[0.65rem] text-vanilla/45 font-mono mt-1">{r.requester_user_id}</div></div><div className="text-[0.65rem] text-vanilla/45">{format(new Date(r.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</div></div>
      {r.message && <p className="text-sm text-vanilla/75 leading-relaxed bg-anthracite/40 p-3 border border-champagne/10 mb-3 whitespace-pre-line"><MessageSquare size={11} className="inline mr-1 text-champagne" />{r.message}</p>}
      <div className="flex flex-wrap gap-2"><button disabled={decideMut.isPending} onClick={() => decideMut.mutate({ id: r.id, decision: "approved" })} className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"><CheckCircle2 size={12} className="inline mr-1" /> Annehmen</button><button disabled={decideMut.isPending} onClick={() => decideMut.mutate({ id: r.id, decision: "rejected" })} className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux/60 text-bordeaux hover:bg-bordeaux/10 disabled:opacity-30"><XCircle size={12} className="inline mr-1" /> Ablehnen</button></div>
    </div>)}</div>}
    {others.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-vanilla/55 hover:text-champagne text-xs uppercase tracking-[0.2em]">Erledigte Anfragen ({others.length})</summary><div className="mt-3 space-y-2">{others.map(r => <div key={r.id} className="bg-card/60 border border-champagne/10 p-3 flex items-center justify-between gap-3 text-xs"><div className="text-vanilla/70">{r.requester_email}</div><span className={`uppercase tracking-[0.2em] px-2 py-0.5 text-[0.6rem] ${r.status === "approved" ? "bg-green-700/30 text-green-200" : "bg-bordeaux/40 text-vanilla"}`}>{r.status === "approved" ? "Angenommen" : "Abgelehnt"}</span></div>)}</div></details>}
  </div>;
}
