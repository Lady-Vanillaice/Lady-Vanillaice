import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Calendar, Crown, Instagram, Mail } from "lucide-react";
import heroImage from "../assets/CARL0938-2.jpeg";
import { AdminLoginWidget } from "@/components/site/AdminLoginWidget";
import { useT, useTr } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lady Vanilla Ice – Domina in München & Umgebung | Sessions & BDSM" },
      {
        name: "description",
        content:
          "Hart, weich und unberechenbar: individuelle Domina-Sessions in München und Umgebung mit Kopfkino, Stil und klaren Grenzen.",
      },
      {
        property: "og:title",
        content: "Lady Vanilla Ice – Hart. Weich. Unberechenbar.",
      },
      {
        property: "og:description",
        content:
          "Individuelle Domina-Sessions in München und Umgebung. Psychologisches Spiel, sinnliche Macht und klare Führung – ganz auf meine Art.",
      },
      { property: "og:url", content: "https://lady-vanillaice.com/" },
      {
        property: "og:image",
        content: "https://www.lady-vanillaice.com/og-image.jpg",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/" }],
  }),
  component: Index,
});

type Card = { title: string; text: string };

type ExpectStep = { title: string; text: string };

function Index() {
  const beholdRef = useRef<HTMLDivElement>(null);
  const t = useT();
  const tr = useTr();

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

  const reasons: Card[] = [
    {
      title: tr("Ich spiele mit deinem Kopf", "I play with your mind"),
      text: tr(
        "Spannung beginnt für mich lange vor der ersten Berührung.",
        "For me, tension begins long before the first touch."
      ),
    },
    {
      title: tr("Hart und weich", "Hard and soft"),
      text: tr(
        "Ich kann fordern, verführen und im nächsten Moment alles verändern.",
        "I can demand, seduce and change everything in the next moment."
      ),
    },
    {
      title: tr("Keine Standardsession", "No standard session"),
      text: tr(
        "Ich beobachte, reagiere und gestalte jede Begegnung individuell.",
        "I observe, react and shape every encounter individually."
      ),
    },
    {
      title: tr("Echt und direkt", "Real and direct"),
      text: tr(
        "Mit Persönlichkeit, Humor und manchmal einer bayerischen Note.",
        "With personality, humour and sometimes a Bavarian touch."
      ),
    },
  ];

  const fitPoints = [
    tr("Du mehr als eine Standardsession suchst.", "You want more than a standard session."),
    tr(
      "Du dich auf mein Spiel mit deinem Kopf einlassen kannst.",
      "You can surrender to my mind games."
    ),
    tr(
      "Du meine harte und meine weiche Seite erleben möchtest.",
      "You want to experience both my hard and soft sides."
    ),
    tr(
      "Du Respekt, Diskretion und klare Grenzen ernst nimmst.",
      "You take respect, discretion and clear limits seriously."
    ),
  ];

  const steps: ExpectStep[] = [
    {
      title: tr("Deine Anfrage", "Your request"),
      text: tr(
        "Du wählst einen Termin. Ich prüfe deine Anfrage persönlich und melde mich bei dir.",
        "You choose a date. I personally review your request and get back to you."
      ),
    },
    {
      title: tr("Deine Wünsche", "Your wishes"),
      text: tr(
        "Du erzählst mir von deinen Fantasien, Vorlieben und klaren Grenzen.",
        "You tell me about your fantasies, preferences and clear limits."
      ),
    },
    {
      title: tr("Unser Vorgespräch", "Our conversation"),
      text: tr(
        "Wir klären vertraulich, was dich reizt und was du dir wünschst.",
        "We discreetly clarify what excites you and what you desire."
      ),
    },
    {
      title: tr("Mein Spiel mit dir", "My game with you"),
      text: tr(
        "Dann übernehme ich: mal hart, mal weich und immer auf meine Art.",
        "Then I take over: sometimes hard, sometimes soft and always my way."
      ),
    },
    {
      title: tr("Der Nachklang", "The aftermath"),
      text: tr(
        "Danach bleibt Zeit, ruhig und respektvoll wieder anzukommen.",
        "Afterwards, there is time to return calmly and respectfully."
      ),
    },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Lady Vanilla Ice — Domina in München & Umgebung, Portraitaufnahme in eleganter Fetisch-Ästhetik"
            className="w-full h-full object-cover object-[72%_28%] md:object-[72%_24%]"
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
              {tr(
                "Hart. Weich. Unberechenbar. Ganz auf meine Art.",
                "Hard. Soft. Unpredictable. Entirely my way."
              )}
            </p>

            <p className="text-sm md:text-base text-vanilla/65 leading-relaxed max-w-lg mb-4">
              {tr(
                "Ich spiele mit deinem Kopf, deinen Erwartungen und der Spannung zwischen Kontrolle und Nähe.",
                "I play with your mind, your expectations and the tension between control and closeness."
              )}
            </p>

            <p className="eyebrow mb-10">
              {tr(
                "Keine Standardsession. Jede Begegnung entsteht individuell.",
                "No standard session. Every encounter is created individually."
              )}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/buchung" className="btn-gold">
                {tr("Termin anfragen", "Request appointment")}
                <Calendar size={14} />
              </Link>
              <Link to="/leistungen" className="btn-outline-gold">
                {tr("Meine Welt entdecken", "Discover my world")}
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-vanilla/40 text-[0.6rem] tracking-[0.3em] uppercase animate-pulse">
          {t<string>("home.hero.scroll")}
        </div>
      </section>

      {/* WARUM ICH */}
      <section className="py-24 border-b border-champagne/15">
        <div className="container-luxe max-w-5xl">
          <div className="text-center mb-12">
            <div className="eyebrow mb-4">{tr("Meine Art", "My way")}</div>
            <h2 className="font-display text-4xl md:text-5xl gold-text">
              {tr("Warum Lady Vanilla Ice?", "Why Lady Vanilla Ice?")}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-champagne/15">
            {reasons.map((reason) => (
              <article key={reason.title} className="bg-background p-7">
                <h3 className="font-display text-xl text-vanilla mb-3">{reason.title}</h3>
                <p className="text-sm text-vanilla/60 leading-relaxed">{reason.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PASST ZU MIR */}
      <section className="py-20 border-b border-champagne/15">
        <div className="container-luxe max-w-3xl">
          <div className="eyebrow mb-4 text-center">{tr("Passt das zu dir?", "Is this for you?")}</div>
          <h2 className="font-display text-3xl md:text-4xl text-center gold-text mb-10">
            {tr("Bei mir bist du richtig, wenn …", "You are right for me if …")}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {fitPoints.map((point) => (
              <div key={point} className="bg-card border border-champagne/10 p-5 flex gap-3">
                <Crown size={15} className="text-champagne mt-1 shrink-0" />
                <p className="text-sm text-vanilla/75 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WAS DICH ERWARTET */}
      <section className="py-24">
        <div className="container-luxe text-center max-w-4xl">
          <div className="eyebrow mb-4">{tr("Was dich erwartet", "What awaits you")}</div>
          <h2 className="font-display text-4xl md:text-5xl gold-text mb-4 leading-[1.25]">
            {tr("Dein Weg in meine Welt", "Your path into my world")}
          </h2>
          <p className="font-script italic text-vanilla/60 text-lg mb-10">
            {tr("Klar, diskret und persönlich.", "Clear, discreet and personal.")}
          </p>

          <div className="grid md:grid-cols-5 gap-px bg-champagne/15">
            {steps.map((item, i) => (
              <div key={item.title} className="bg-background p-6 text-left">
                <div className="font-display text-3xl gold-text mb-3 opacity-60">
                  0{i + 1}
                </div>
                <h3 className="font-display text-xl text-vanilla mb-2">{item.title}</h3>
                <p className="text-sm text-vanilla/60 leading-relaxed">{item.text}</p>
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
              {t<string>("home.cta.title1")}
              <span className="gold-text">{t<string>("home.cta.titleAccent")}</span>
              {t<string>("home.cta.title2")}
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
