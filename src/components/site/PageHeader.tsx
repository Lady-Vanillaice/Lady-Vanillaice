import { Link, useLocation } from "@tanstack/react-router";
import { CalendarPlus, Sparkles, Wallet } from "lucide-react";
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
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                to="/admin/kassenbuch"
                className="group border border-champagne/35 bg-card/90 p-4 transition hover:border-champagne hover:bg-card"
              >
                <Wallet size={19} className="mb-2 text-champagne" />
                <div className="font-display text-lg text-vanilla transition group-hover:text-champagne">
                  Zahlsklave
                </div>
                <p className="mt-1 text-xs leading-relaxed text-vanilla/50">
                  Zahlung direkt ins Kassenbuch eintragen.
                </p>
              </Link>
              <Link
                to="/admin/custom"
                className="group border border-champagne/35 bg-card/90 p-4 transition hover:border-champagne hover:bg-card"
              >
                <Sparkles size={19} className="mb-2 text-champagne" />
                <div className="font-display text-lg text-vanilla transition group-hover:text-champagne">
                  Custom
                </div>
                <p className="mt-1 text-xs leading-relaxed text-vanilla/50">
                  Custom-Auftrag und Zahlung erfassen.
                </p>
              </Link>
              <Link
                to="/admin/terminplan"
                className="group border border-champagne/35 bg-card/90 p-4 transition hover:border-champagne hover:bg-card"
              >
                <CalendarPlus size={19} className="mb-2 text-champagne" />
                <div className="font-display text-lg text-vanilla transition group-hover:text-champagne">
                  Externer Termin
                </div>
                <p className="mt-1 text-xs leading-relaxed text-vanilla/50">
                  Termin von Telegram, E-Mail oder Telefon eintragen.
                </p>
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center"><span className="hairline" /></div>
      </div>
    </section>
  );
}
