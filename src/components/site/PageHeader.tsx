import { Link, useLocation } from "@tanstack/react-router";
import { CalendarClock, CalendarDays, CalendarPlus, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
}) {
  const location = useLocation();
  const showAdminQuickEntries = location.pathname === "/admin" || location.pathname === "/admin/";

  return (
    <section className="relative pt-40 pb-20 border-b border-champagne/10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, var(--color-champagne) 0%, transparent 60%)",
        }}
      />
      <div className="container-luxe text-center max-w-3xl relative">
        <div className="eyebrow mb-5">{eyebrow}</div>
        <h1 className="font-display text-5xl md:text-6xl leading-[1.05] text-vanilla">{title}</h1>
        {intro && (
          <p className="mt-6 text-base md:text-lg text-vanilla/65 leading-relaxed">{intro}</p>
        )}

        {showAdminQuickEntries && (
          <div className="mt-8 text-left">
            <div className="mb-3 text-center text-[0.65rem] uppercase tracking-[0.22em] text-champagne/75">
              Sofort eintragen
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {([
                { to: "/admin/terminplan" as const, title: "Externer Termin", text: "Termin von Telegram, E-Mail oder Telefon eintragen.", Icon: CalendarPlus },
                { to: "/admin/kassenbuch" as const, title: "Zahlsklave", text: "Zahlung direkt ins Kassenbuch eintragen.", Icon: Wallet },
                { to: "/admin/custom" as const, title: "Custom", text: "Custom-Auftrag und Zahlung erfassen.", Icon: Sparkles },
              ]).map(({ to, title, text, Icon }) => (
                <Link
                  key={title}
                  to={to}
                  className="group border border-champagne/35 bg-card/90 p-3 sm:p-4 transition hover:border-champagne hover:bg-card"
                >
                  <Icon size={19} className="mb-2 text-champagne" />
                  <div className="font-display text-base sm:text-lg leading-tight text-vanilla transition group-hover:text-champagne">
                    {title}
                  </div>
                  <p className="mt-1 hidden text-xs leading-relaxed text-vanilla/50 sm:block">{text}</p>
                </Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
              {([
                { to: "/admin/terminplan" as const, title: "Mein Terminplan", text: "Bestätigte Termine nach Datum und Uhrzeit.", Icon: CalendarClock },
                { to: "/admin/kalender" as const, title: "Kalender & Verfügbarkeiten", text: "Zeitfenster, Urlaub, Specials und Warteliste.", Icon: CalendarDays },
              ]).map(({ to, title, text, Icon }) => (
                <Link
                  key={title}
                  to={to}
                  className="group border border-champagne/35 bg-card/90 p-3 sm:p-4 transition hover:border-champagne hover:bg-card"
                >
                  <Icon size={19} className="mb-2 text-champagne" />
                  <div className="font-display text-base sm:text-lg leading-tight text-vanilla transition group-hover:text-champagne">
                    {title}
                  </div>
                  <p className="mt-1 hidden text-xs leading-relaxed text-vanilla/50 sm:block">{text}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center"><span className="hairline" /></div>
      </div>
    </section>
  );
}
