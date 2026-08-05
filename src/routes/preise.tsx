import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { Check } from "lucide-react";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/preise")({
  head: () => ({
    meta: [
      { title: "Preise – Domina Sessions München & Umgebung | Lady Vanilla Ice" },
      { name: "description", content: "Transparente Preise für Domina-Sessions in München und Umgebung. 60, 90 oder 120 Minuten — diskret und maßgeschneidert." },
      { property: "og:title", content: "Preise – Domina Sessions München & Umgebung" },
      { property: "og:description", content: "60, 90 oder 120 Minuten — maßgeschneiderte Sessions in exklusivem Ambiente." },
      { property: "og:url", content: "https://lady-vanillaice.com/preise" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/preise" }],
  }),
  component: Preise,
});

function Preise() {
  const tr = useTr();

  const tiers = [
    {
      duration: tr("30 Minuten", "30 minutes"),
      price: tr("ab 150 €", "from € 150"),
      desc: tr(
        "Ein kurzer, fokussierter Einstieg — ideal für ein klar umrissenes Anliegen.",
        "A short, focused entry — ideal for a clearly defined wish."
      ),
      perks: [
        tr("Kurzes Vorgespräch", "Brief preliminary talk"),
        tr("Fokussierte Inszenierung", "Focused staging"),
        tr("Diskretes Ambiente", "Discreet ambiance"),
      ],
    },
    {
      duration: tr("60 Minuten", "60 minutes"),
      price: tr("ab 300 €", "from € 300"),
      desc: tr(
        "Eine erste, intensive Begegnung — ideal für einen klar umrissenen Wunsch.",
        "A first, intense encounter — ideal for a clearly defined wish."
      ),
      perks: [
        tr("Vorgespräch", "Preliminary talk"),
        tr("Individuelle Inszenierung", "Individual staging"),
        tr("Diskretes Ambiente", "Discreet ambiance"),
      ],
    },
    {
      duration: tr("90 Minuten", "90 minutes"),
      price: tr("ab 450 €", "from € 450"),
      desc: tr(
        "Mehr Raum für Aufbau, Atmosphäre und einen ruhigen Nachklang.",
        "More space for build-up, atmosphere and a calm aftermath."
      ),
      perks: [
        tr("Erweitertes Vorgespräch", "Extended preliminary talk"),
        tr("Tiefere Inszenierung", "Deeper staging"),
        tr("Zeit für Reflexion", "Time for reflection"),
      ],
      featured: true,
    },
    {
      duration: tr("120 Minuten", "120 minutes"),
      price: tr("ab 600 €", "from € 600"),
      desc: tr(
        "Die volle Bühne — für komplexere Wünsche und intensive Erlebnisse.",
        "The full stage — for more complex wishes and intense experiences."
      ),
      perks: [
        tr("Ausführliches Vorgespräch", "In-depth preliminary talk"),
        tr("Komplexe Szenarien", "Complex scenarios"),
        tr("Begleiteter Nachklang", "Guided aftermath"),
      ],
    },
    {
      duration: tr("Doppelsession", "Double session"),
      price: tr("300 € pro Stunde pro Domina", "€ 300 per hour per domina"),
      priceRows: [
        {
          amount: tr("ab 300 €", "from € 300"),
          unit: tr("je Stunde & Domina", "per hour & domina"),
        },
      ],
      desc: tr(
        "Eine gemeinsame Session mit zwei Dominas. Der Preis gilt je angefangener Stunde und pro Domina.",
        "A shared session with two dominas. The rate applies per started hour and per domina.",
      ),
      perks: [
        tr("Zwei Dominas", "Two dominas"),
        tr("Gemeinsame Inszenierung", "Shared staging"),
        tr("Individuelle Absprache", "Individual arrangement"),
      ],
      linkTo: "/duo-sessions" as const,
      linkLabel: tr("Doppelsession ansehen", "View double sessions"),
      compactPrice: true,
    },
    {
      duration: tr("Custom Content", "Custom content"),
      price: tr(
        "10 € pro Bild · 30 € pro Minute Video",
        "€ 10 per image · € 30 per video minute",
      ),
      priceRows: [
        {
          amount: tr("ab 10 €", "from € 10"),
          unit: tr("pro Bild", "per image"),
        },
        {
          amount: tr("ab 30 €", "from € 30"),
          unit: tr("pro Minute Video", "per video minute"),
        },
      ],
      desc: tr(
        "Individuell nach deinen Wünschen produzierte Bilder und Videos.",
        "Images and videos produced individually according to your wishes.",
      ),
      perks: [
        tr("Individuelle Bilder", "Individual images"),
        tr("Individuelle Videos", "Individual videos"),
        tr("Diskrete Lieferung", "Discreet delivery"),
      ],
      linkTo: "/custom" as const,
      linkLabel: tr("Custom Content anfragen", "Request custom content"),
      compactPrice: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={tr("Preise", "Rates")}
        title={
          <>
            {tr("Preise für ", "Rates for ")}
            <em className="font-script gold-text not-italic">
              {tr("exklusive Sessions", "exclusive sessions")}
            </em>
          </>
        }
        intro={tr(
          "Transparente Konditionen. Je nach individuellem Wunsch und Session-Aufwand können die Preise variieren. Spezielle Wünsche und längere Sessions auf individueller Vereinbarung.",
          "Transparent terms. Depending on your individual wish and the complexity of the session, prices may vary. Special wishes and longer sessions by individual arrangement."
        )}
      />

      <section className="py-24">
        <div className="container-luxe">
          <div className="grid md:grid-cols-3 gap-px bg-champagne/15">
            {tiers.map((t) => (
              <div
                key={t.duration}
                className={`p-10 flex flex-col ${
                  t.featured
                    ? "bg-gradient-to-b from-card to-background border-y-2 border-champagne md:border-2"
                    : "bg-background"
                }`}
              >
                {t.featured && (
                  <div className="eyebrow mb-2 text-bordeaux/90">{tr("Empfehlung", "Recommended")}</div>
                )}
                <div className="text-xs uppercase tracking-[0.3em] text-vanilla/50 mb-3">{t.duration}</div>
                {t.priceRows ? (
                  <div className="gold-text mb-4 space-y-1">
                    {t.priceRows.map((row) => (
                      <div
                        key={row.amount}
                        className={
                          t.priceUnitBelow
                            ? "flex flex-col items-start"
                            : "flex flex-wrap items-baseline gap-x-2"
                        }
                      >
                        <span className="font-display text-5xl">{row.amount}</span>
                        <span className="text-xs uppercase tracking-[0.16em] text-champagne/75">
                          {row.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="gold-text mb-4 font-display text-5xl">
                    {t.price}
                  </div>
                )}
                <p className="text-sm text-vanilla/65 leading-relaxed mb-6">{t.desc}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-vanilla/75">
                      <Check size={16} className="text-champagne mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  to={t.linkTo ?? "/buchung"}
                  className={t.featured ? "btn-gold" : "btn-outline-gold"}
                >
                  {t.linkLabel ?? tr("Anfragen", "Request")}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-16 max-w-3xl mx-auto">
            <div className="eyebrow mb-3 text-center">{tr("Wichtige Hinweise", "Important notes")}</div>
            <div className="text-sm text-vanilla/65 leading-relaxed space-y-4">
              <p>
                {tr(
                  <>Mein Tribut beträgt <strong className="text-vanilla/90">ab 300 € pro Stunde</strong>. Für besondere Praktiken, aufwendigere Inszenierungen oder spezielle Wünsche vereinbare ich einen individuellen Aufpreis. Nenne mir deine Vorstellungen einfach in der Anfrage – ich sage dir ehrlich, was möglich ist und was nicht.</> as unknown as string,
                  <>My tribute is <strong className="text-vanilla/90">from € 300 per hour</strong>. For special practices, more elaborate stagings or particular wishes I set an individual surcharge. Simply tell me your ideas in your request — I'll be honest about what is possible and what is not.</> as unknown as string
                )}
              </p>
              <p>
                {tr(
                  <>Zur verbindlichen Fixierung deines Termins ist eine Anzahlung von <strong className="text-vanilla/90">mindestens 150 €</strong> erforderlich. Erst mit Eingang dieser Anzahlung ist dein Platz in meinem Kalender gesichert.</> as unknown as string,
                  <>To bindingly secure your appointment a deposit of <strong className="text-vanilla/90">at least € 150</strong> is required. Only once this deposit has been received is your slot in my calendar reserved.</> as unknown as string
                )}
              </p>
              <div className="bg-card border border-champagne/15 p-6">
                <div className="text-xs uppercase tracking-[0.2em] text-champagne mb-3">
                  {tr("Absagebedingungen", "Cancellation terms")}
                </div>
                <ul className="space-y-2.5 list-disc list-outside pl-5 text-vanilla/70 marker:text-champagne">
                  <li>{tr(
                    "Bis 48 Stunden vor Termin: Die Anzahlung bleibt erhalten und kann einmalig auf einen neuen Termin angerechnet werden.",
                    "Up to 48 hours before the appointment: the deposit is retained and can be credited once to a new appointment."
                  )}</li>
                  <li>{tr(
                    "Bei Absagen unter 48 Stunden, bei Nichterscheinen oder Verspätung ab 20 Minuten: Die Anzahlung verfällt.",
                    "For cancellations within 48 hours, no-shows or arriving more than 20 minutes late: the deposit is forfeited."
                  )}</li>
                  <li>{tr(
                    "Eine Rückerstattung ist grundsätzlich ausgeschlossen.",
                    "Refunds are generally excluded."
                  )}</li>
                </ul>
              </div>
              <p>
                {tr(
                  "Wer meine Zeit reserviert, ohne sie wahrzunehmen, verliert damit nicht nur Geld. Er verliert Zugang.",
                  "Anyone who reserves my time without honouring it loses more than money. They lose access."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
