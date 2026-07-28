import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Menu, X } from "lucide-react";
import { LanguageSwitcher, useT } from "@/i18n";

function Monogram() {
  return (
    <Link to="/" className="flex items-center gap-3 group">
      <div className="relative flex items-center justify-center w-12 h-12 text-champagne/40 group-hover:text-champagne transition-colors">
        <Crown size={32} strokeWidth={1.2} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-sm gold-text tracking-[0.18em] uppercase whitespace-nowrap">Lady Vanilla Ice</div>
      </div>
    </Link>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const t = useT();

  const nav = [
    { to: "/ueber-mich", label: t<string>("nav.about") },
    { to: "/leistungen", label: t<string>("nav.services") },
    { to: "/preise", label: t<string>("nav.prices") },
    { to: "/kalender", label: t<string>("nav.calendar") },
    { to: "/online", label: t<string>("nav.online") },
    { to: "/faq", label: t<string>("nav.faq") },
  ] as const;

  const mobileNav = [
    { to: "/", label: t<string>("nav.home") },
    { to: "/ueber-mich", label: t<string>("nav.about") },
    { to: "/leistungen", label: t<string>("nav.services") },
    { to: "/preise", label: t<string>("nav.prices") },
    { to: "/kalender", label: t<string>("nav.calendar") },
    { to: "/online", label: t<string>("nav.online") },
    { to: "/duo-sessions", label: t<string>("nav.duo") },
    { to: "/content-dreh", label: t<string>("nav.contentDreh") },
    { to: "/custom", label: t<string>("nav.custom") },
    { to: "/fotoshooting", label: t<string>("nav.photoshoot") },
    { to: "/erfahrungsberichte", label: t<string>("nav.reviews") },
    { to: "/journal", label: t<string>("nav.journal") },
    { to: "/buchung", label: t<string>("nav.booking") },
    { to: "/kontakt", label: t<string>("nav.contact") },
  ] as const;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-anthracite/92 backdrop-blur-md border-b border-champagne/15"
          : "bg-gradient-to-b from-anthracite/70 to-transparent"
      }`}
    >
      <div className="container-luxe flex items-center justify-between py-4">
        <Monogram />

        <nav className="hidden lg:flex items-center gap-6 xl:gap-10 ml-auto">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative text-[0.7rem] uppercase tracking-[0.2em] xl:tracking-[0.24em] text-vanilla/75 hover:text-champagne transition-colors py-2 whitespace-nowrap"
              activeProps={{ className: "text-champagne after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-champagne" }}
            >
              {item.label}
            </Link>
          ))}
          <LanguageSwitcher />
          <button
            aria-label={t<string>("nav.openMenu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-vanilla p-2 hover:text-champagne transition"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <button
            aria-label={t<string>("nav.openMenu")}
            onClick={() => setOpen((v) => !v)}
            className="text-vanilla p-2 hover:text-champagne transition"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="bg-anthracite/98 backdrop-blur-md border-t border-champagne/20">
          <nav className="container-luxe flex flex-col py-4">
            {mobileNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-4 text-sm uppercase tracking-[0.24em] text-vanilla/80 hover:text-champagne border-b border-champagne/10"
                activeProps={{ className: "text-champagne" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
