import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Calendar, Crown, Instagram, Mail } from "lucide-react";
import heroImage from "../assets/CARL0938-2.jpeg";
import { AdminLoginWidget } from "@/components/site/AdminLoginWidget";
import { useT } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lady Vanilla Ice – Domina in München & Umgebung | Sessions & BDSM" },
      { name: "description", content: "Stilvolle Domina-Sessions in München und Umgebung. Diskret, intensiv, individuell auf deine Fantasien abgestimmt. Termin online buchen." },
      { property: "og:title", content: "Lady Vanilla Ice – Domina in München & Umgebung | Sessions & BDSM" },
      { property: "og:description", content: "Stilvolle Domina-Sessions in München und Umgebung. Diskret, intensiv, individuell auf deine Fantasien abgestimmt. Termin online buchen." },
      { property: "og:url", content: "https://lady-vanillaice.com/" },
      { property: "og:image", content: "https://www.lady-vanillaice.com/og-image.jpg" },
{ property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/" }],
  }),
  component: Index,
});

type ExpectStep = { title: string; text: string };

function Index() {
  const beholdRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (!beholdRef.current) return;

    if (!document.querySelector('script[src="https://w.behold.so/widget.js"]')) {
      const s = document.createElement("script");
      s.type = "module";
      s.src = "https://w.behold.so/widget.js";
      document.head.appendChild(s);
    }

    if (!beholdRef.current.querySelector("behold-widget")) {
      const widget = document.createElement("behold-widget") as HTMLElement;
      widget.setAttribute("feed-id", "3Zc4c6wwZsXTG57RIQFB");
      widget.className = "w-full";
      beholdRef.current.appendChild(widget);
    }
  }, []);

  const steps = t<ExpectStep[]>("home.expect.steps");

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Lady Vanilla Ice — Domina in München & Umgebung, Portraitaufnahme in eleganter Fetisch-Ästhetik"
            className="w-full h-full object-cover object-right"
            width={1280}
            height={1600}
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-anthracite via-anthracite/85 to-anthracite/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-anthracite via-transparent to-anthracite/40" />
        </div>

        <div className="container-luxe relative pt-32 pb-20">
          <div className="max-w-2xl">
            <div className="eyebrow mb-6">{t<string>("home.hero.welcome")}</div>

            <h1 className="font-display leading-[0.92] mb-8">
              <span className="block text-6xl md:text-8xl gold-text">Lady</span>
              <span className="block text-6xl md:text-8xl">
                <span className="gold-text">Vanilla </span>
                <span className="silver-text italic">Ice</span>
              </span>
              <span className="sr-only">{t<string>("home.hero.srSubtitle")}</span>
            </h1>


            <div className="flex items-center gap-4 mb-8">
              <span className="hairline" />
              <Crown size={16} className="text-champagne" />
              <span className="hairline" />
            </div>

            <p className="font-display text-xl md:text-2xl text-vanilla/90 mb-6 tracking-wide">
              {t<string>("home.hero.tagline")}
            </p>

            <p className="text-sm md:text-base text-vanilla/65 leading-relaxed max-w-lg mb-4">
              {t<string>("home.hero.intro")}
            </p>

            <p className="eyebrow mb-10">
              {t<string>("home.hero.note")}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/kalender" className="btn-gold">
                {t<string>("home.hero.ctaCalendar")}
                <Calendar size={14} />
              </Link>
              <Link to="/leistungen" className="btn-outline-gold">
                {t<string>("home.hero.ctaServices")}
              </Link>
            </div>
          </div>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-vanilla/40 text-[0.6rem] tracking-[0.3em] uppercase animate-pulse">
          {t<string>("home.hero.scroll")}
        </div>
      </section>


      {/* WAS DICH ERWARTET */}
      <section className="py-28">
        <div className="container-luxe text-center max-w-3xl">
          <div className="eyebrow mb-4">{t<string>("home.expect.kicker")}</div>
          <h2 className="font-display text-4xl md:text-5xl gold-text mb-3 leading-[1.25] pb-2">
            {t<string>("home.expect.title")}
          </h2>
          <p className="font-script italic text-vanilla/60 text-lg mb-6">
            {t<string>("home.expect.subtitle")}
          </p>
          <div className="flex justify-center mb-12"><span className="hairline" /></div>

          <div className="grid gap-px bg-champagne/15">
            {steps.map((item, i) => (
              <div key={item.title} className="bg-background p-10 text-left">
                <div className="font-display text-5xl gold-text/70 gold-text mb-4 opacity-50">
                  0{i + 1}
                </div>
                <h3 className="font-display text-2xl text-vanilla mb-3">{item.title}</h3>
                <p className="text-sm md:text-base text-vanilla/65 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA BAND */}
      <section className="border-y border-champagne/15">
        <div className="container-luxe py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="eyebrow mb-4">{t<string>("home.cta.kicker")}</div>
            <h2 className="font-display text-4xl md:text-5xl text-vanilla leading-tight">
              {t<string>("home.cta.title1")}<span className="gold-text">{t<string>("home.cta.titleAccent")}</span>{t<string>("home.cta.title2")}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row md:justify-end gap-4">
            <Link to="/buchung" className="btn-gold whitespace-nowrap">
              <Crown size={14} />
              {t<string>("home.cta.request")}
            </Link>
            <a href="mailto:Lady-vanillaice@gmx.net" className="btn-gold whitespace-nowrap">
              <Mail size={14} />
              {t<string>("home.cta.email")}
            </a>
          </div>
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="py-24 border-t border-champagne/15">
        <div className="container-luxe text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Instagram size={20} className="text-champagne" />
            <div className="eyebrow">{t<string>("home.instagram.follow")}</div>
          </div>
          <h2 className="font-display text-3xl md:text-4xl gold-text mb-3">
            @lady_vanillaice
          </h2>
          <p className="text-sm text-vanilla/55 max-w-md mx-auto mb-10">
            {t<string>("home.instagram.caption")}
          </p>

          <div ref={beholdRef} className="mb-10" />

          <a
            href="https://www.instagram.com/lady_vanillaice"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-gold inline-flex items-center gap-2"
          >
            <Instagram size={14} />
            {t<string>("home.instagram.visit")}
          </a>
        </div>
      </section>

      <AdminLoginWidget />
    </>
  );
}
