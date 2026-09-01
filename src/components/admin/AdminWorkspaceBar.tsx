import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Home,
  Mail,
  Users,
  Wallet,
  MessageSquare,
  RotateCcw,
  Camera,
  Sparkles,
  Send,
  Quote,
  FileText,
} from "lucide-react";

type AdminLink = {
  to: string;
  label: string;
  Icon: typeof Home;
};

type AdminArea = {
  label: string;
  description: string;
  match: (path: string) => boolean;
  links: AdminLink[];
};

const AREAS: AdminArea[] = [
  {
    label: "Planung",
    description: "Termine planen, verschieben und deinen Tag organisieren.",
    match: (path) => ["/admin/terminplan", "/admin/kalender", "/admin/umplanen"].some((p) => path.startsWith(p)),
    links: [
      { to: "/admin/terminplan", label: "Terminplan", Icon: CalendarClock },
      { to: "/admin/kalender", label: "Kalender", Icon: CalendarDays },
      { to: "/admin/umplanen", label: "Umplanen", Icon: RotateCcw },
    ],
  },
  {
    label: "Anfragen",
    description: "Neue Anfragen nach Art bearbeiten und direkt in Buchungen wechseln.",
    match: (path) => ["/admin/termine", "/admin/duo", "/admin/contentdreh", "/admin/custom", "/admin/fotoshooting"].some((p) => path.startsWith(p)),
    links: [
      { to: "/admin/termine", label: "Termine", Icon: Mail },
      { to: "/admin/duo", label: "Duo", Icon: Users },
      { to: "/admin/contentdreh", label: "Content", Icon: Camera },
      { to: "/admin/custom", label: "Custom", Icon: Sparkles },
      { to: "/admin/fotoshooting", label: "Fotoshooting", Icon: Camera },
    ],
  },
  {
    label: "Kunden",
    description: "Kunden finden, alte Termine öffnen und Daten pflegen.",
    match: (path) => path.startsWith("/admin/kunden") || path.startsWith("/admin/buchung/"),
    links: [
      { to: "/admin/kunden", label: "Kunden suchen", Icon: Users },
      { to: "/admin/terminplan", label: "Terminplan", Icon: CalendarClock },
      { to: "/admin/kassenbuch", label: "Zahlungen", Icon: Wallet },
    ],
  },
  {
    label: "Geld",
    description: "Einnahmen, Vorauszahlungen, Restzahlungen und Ausgaben verwalten.",
    match: (path) => path.startsWith("/admin/kassenbuch"),
    links: [
      { to: "/admin/kassenbuch", label: "Kassenbuch", Icon: Wallet },
      { to: "/admin/kunden", label: "Kunden", Icon: Users },
      { to: "/admin/terminplan", label: "Termine", Icon: CalendarClock },
    ],
  },
  {
    label: "Kommunikation & Website",
    description: "Newsletter, Erfahrungsberichte und Website-Inhalte verwalten.",
    match: (path) => ["/admin/newsletter", "/admin/erfahrungsberichte", "/admin/agb", "/admin/email-vorschau"].some((p) => path.startsWith(p)),
    links: [
      { to: "/admin/newsletter", label: "Newsletter", Icon: Send },
      { to: "/admin/erfahrungsberichte", label: "Erfahrungsberichte", Icon: Quote },
      { to: "/admin/agb", label: "AGB", Icon: FileText },
    ],
  },
];

const TOP_LEVEL: AdminLink[] = [
  { to: "/admin", label: "Übersicht", Icon: Home },
  { to: "/admin/terminplan", label: "Planung", Icon: CalendarClock },
  { to: "/admin/termine", label: "Anfragen", Icon: ClipboardList },
  { to: "/admin/kunden", label: "Kunden", Icon: Users },
  { to: "/admin/kassenbuch", label: "Kasse", Icon: Wallet },
  { to: "/admin/newsletter", label: "Kommunikation", Icon: MessageSquare },
];

function activeFor(path: string, to: string) {
  if (to === "/admin") return path === "/admin" || path === "/admin/";
  if (to === "/admin/termine") return ["/admin/termine", "/admin/duo", "/admin/contentdreh", "/admin/custom", "/admin/fotoshooting"].some((p) => path.startsWith(p));
  if (to === "/admin/kunden") return path.startsWith("/admin/kunden") || path.startsWith("/admin/buchung/");
  if (to === "/admin/newsletter") return ["/admin/newsletter", "/admin/erfahrungsberichte", "/admin/agb", "/admin/email-vorschau"].some((p) => path.startsWith(p));
  if (to === "/admin/terminplan") return ["/admin/terminplan", "/admin/kalender", "/admin/umplanen"].some((p) => path.startsWith(p));
  return path.startsWith(to);
}

export function AdminWorkspaceBar() {
  const location = useLocation();
  const path = location.pathname;
  if (path === "/admin" || path === "/admin/") return null;

  const area = AREAS.find((item) => item.match(path));

  return (
    <div className="relative z-30 mt-20 sm:mt-24 lg:mt-0 border-b border-champagne/15 bg-black/90 backdrop-blur-md">
      <div className="container-luxe max-w-6xl py-3 sm:py-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TOP_LEVEL.map(({ to, label, Icon }) => {
            const active = activeFor(path, to);
            return (
              <Link
                key={to}
                to={to as any}
                className={`relative z-10 shrink-0 inline-flex min-h-11 items-center gap-2 border px-3 py-2 text-[0.62rem] uppercase tracking-[0.15em] transition ${
                  active
                    ? "border-champagne bg-champagne/12 text-champagne"
                    : "border-champagne/15 text-vanilla/55 hover:border-champagne/45 hover:text-vanilla"
                }`}
              >
                <Icon size={13} /> {label}
              </Link>
            );
          })}
        </div>

        {area && (
          <div className="mt-3 grid gap-3 border-t border-champagne/10 pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="text-[0.6rem] uppercase tracking-[0.22em] text-champagne/75">Du bist in · {area.label}</div>
              <p className="mt-1 text-xs leading-relaxed text-vanilla/45">{area.description}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {area.links.map(({ to, label, Icon }) => {
                const exactActive = path === to || path.startsWith(`${to}/`);
                return (
                  <Link
                    key={to}
                    to={to as any}
                    className={`relative z-10 shrink-0 inline-flex min-h-11 items-center gap-2 px-3 py-2 text-xs transition ${
                      exactActive ? "bg-champagne text-black" : "bg-card border border-champagne/20 text-vanilla/70 hover:border-champagne/55"
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
