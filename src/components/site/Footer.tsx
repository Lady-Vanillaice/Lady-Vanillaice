import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { useT } from "@/i18n";

export function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-champagne/15 bg-anthracite mt-24">
      <div className="container-luxe py-16 grid gap-12 md:grid-cols-3">
        <div>
          <div className="font-display text-2xl gold-text mb-4 tracking-wide">Lady Vanilla Ice</div>
          <p className="text-sm text-vanilla/55 leading-relaxed max-w-xs">
            {t<string>("footer.tagline")}
          </p>
          <div className="mt-6"><span className="hairline" /></div>
        </div>

        <div>
          <div className="eyebrow mb-5">{t<string>("footer.navigation")}</div>
          <ul className="space-y-2.5 text-sm text-vanilla/70">
            <li><Link to="/ueber-mich" className="hover:text-champagne transition">{t<string>("nav.about")}</Link></li>
            <li><Link to="/leistungen" className="hover:text-champagne transition">{t<string>("nav.services")}</Link></li>
            <li><Link to="/preise" className="hover:text-champagne transition">{t<string>("nav.prices")}</Link></li>
            <li><Link to="/kalender" className="hover:text-champagne transition">{t<string>("nav.calendar")}</Link></li>
            <li><Link to="/online" className="hover:text-champagne transition">{t<string>("nav.online")}</Link></li>
            <li><Link to="/faq" className="hover:text-champagne transition">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-5">{t<string>("footer.contact")}</div>
          <ul className="space-y-2.5 text-sm text-vanilla/70">
            <li>
              <span className="text-vanilla/40 text-xs uppercase tracking-widest block mb-1">{t<string>("footer.email")}</span>
              <a href="mailto:Lady-vanillaice@gmx.net" className="hover:text-champagne transition">
                Lady-vanillaice@gmx.net
              </a>
            </li>
            <li>
              <span className="text-vanilla/40 text-xs uppercase tracking-widest block mb-1">{t<string>("footer.telegram")}</span>
              <a href="https://t.me/ladyvanillaice" target="_blank" rel="noopener noreferrer" className="hover:text-champagne transition">
                @ladyvanillaice
              </a>
            </li>
            <li>
              <span className="text-vanilla/40 text-xs uppercase tracking-widest block mb-1">{t<string>("footer.instagram")}</span>
              <a href="https://www.instagram.com/lady_vanillaice" target="_blank" rel="noopener noreferrer" className="hover:text-champagne transition inline-flex items-center gap-1.5">
                <Instagram size={12} />
                @lady_vanillaice
              </a>
            </li>
            <li>
              <span className="text-vanilla/40 text-xs uppercase tracking-widest block mb-1">{t<string>("footer.location")}</span>
              <span>{t<string>("footer.locationValue")}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-champagne/15">
        <div className="container-luxe py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-vanilla/40">
          <div>© {new Date().getFullYear()} Lady Vanilla Ice · {t<string>("footer.rights")}</div>
          <div className="flex gap-6">
            <Link to="/datenschutz" className="hover:text-champagne transition">{t<string>("footer.privacy")}</Link>
            <Link to="/agb" className="hover:text-champagne transition">{t<string>("footer.agb")}</Link>
            <Link to="/impressum" className="hover:text-champagne transition">{t<string>("footer.imprint")}</Link>
            <Link to="/auth" search={{}} className="hover:text-champagne transition opacity-60">{t<string>("footer.admin")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
