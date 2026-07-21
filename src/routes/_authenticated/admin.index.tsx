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
} from "lucide-react";
import { format } from "date-fns";
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
        intro="Wähle einen Bereich aus, den du gerade pflegen möchtest."
      />

      <section className="py-16">
        <div className="container-luxe">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <Link to="/" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">Zur Website</Link>
            <button onClick={onLogout} className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <LogOut size={12} /> Abmelden
            </button>
          </div>

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
