import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/leistungen")({
  head: () => ({
    meta: [
      { title: "Leistungen – BDSM, Fetisch & SM Sessions in München und Umgebung" },
      { name: "description", content: "Session-Schwerpunkte in München und Umgebung: BDSM, Bondage, Fetisch, Rollenspiele, Erziehungs- und Autoritätsspiele. Diskret und maßgeschneidert." },
      { property: "og:title", content: "Leistungen – BDSM, Fetisch & SM Sessions in München und Umgebung" },
      { property: "og:description", content: "Session-Schwerpunkte in München und Umgebung: BDSM, Bondage, Fetisch, Rollenspiele, Erziehungs- und Autoritätsspiele. Diskret und maßgeschneidert." },
      { property: "og:url", content: "https://lady-vanillaice.com/leistungen" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/leistungen" }],
  }),
  component: Leistungen,
});

function ServiceCard({ item }: { item: string }) {
  return (
    <li className="flex items-center bg-card border border-champagne/10 p-5">
      <span className="text-lg text-vanilla/90 font-display tracking-wide">{item}</span>
    </li>
  );
}

function Leistungen() {
  const tr = useTr();

  const categories = [
    {
      title: tr("Für Einsteiger", "For beginners"),
      items: [tr("Anfänger willkommen", "Beginners welcome")],
    },
    {
      title: tr("Körper & Sinne", "Body & senses"),
      items: [
        tr("Atemkontrolle (u.a. in Verbindung mit Facesitting)", "Breath control (incl. combined with face sitting)"),
        tr("Facesitting (bekleidet)", "Face sitting (clothed)"),
        tr("Fuß-, Strumpf- und Schuherotik", "Foot, stocking and shoe worship"),
        tr("Kitzelfolter", "Tickle torture"),
        tr("Sinnesentzug", "Sensory deprivation"),
        tr("Spitting", "Spitting"),
        tr("Trampling", "Trampling"),
      ],
    },
    {
      title: tr("Schmerz & Disziplin", "Pain & discipline"),
      items: [
        tr("Ballbusting", "Ballbusting"),
        tr("Brustwarzenbehandlung", "Nipple play"),
        tr("Cock & Ball Torture (CBT)", "Cock & Ball Torture (CBT)"),
        tr("Elektrospiele / Reizstrom", "Electro play / e-stim"),
        tr("Spanking, Peitschen, Rohrstock", "Spanking, whips, cane"),
      ],
    },
    {
      title: tr("Macht & Kontrolle", "Power & control"),
      items: [
        tr("Dilation", "Dilation"),
        tr("Erniedrigung & Demütigung", "Humiliation & degradation"),
        tr("Keuschhaltung & Orgasmuskontrolle", "Chastity & orgasm control"),
        tr("Slave Training", "Slave training"),
        tr("Tease & Denial", "Tease & denial"),
      ],
    },
    {
      title: tr("Verwandlung & Rollenspiele", "Transformation & role play"),
      items: [
        tr("Feminisierung & Hurenausbildung", "Feminisation & sissy training"),
        tr("Latex, Lack & Leder", "Latex, patent leather & leather"),
        tr("Nylon", "Nylon"),
        tr("Rollenspiele", "Role play"),
      ],
    },
  ];

  const tabus = [
    tr("Küssen", "Kissing"),
    tr("GV", "Sexual intercourse"),
    tr("OV", "Oral sex"),
    tr("Vomit", "Vomit"),
    tr("KV", "Scat"),
    tr("Ringkampf", "Wrestling"),
    tr("Windelspiele", "Diaper play"),
    tr("Intimkontakt bei der Herrin", "Intimate contact with the mistress"),
  ];

  return (
    <>
      <PageHeader
        eyebrow={tr("Leistungen", "Services")}
        title={
          <>
            {tr("Mögliche ", "Possible ")}
            <em className="font-script gold-text not-italic">
              {tr("Session-Schwerpunkte", "session focuses")}
            </em>
          </>
        }
        intro={tr(
          "Alle Inhalte werden vorab gemeinsam besprochen — Diskretion und Einvernehmen sind selbstverständlich.",
          "Everything is discussed in advance — discretion and consent go without saying."
        )}
      />

      <section className="py-24">
        <div className="container-luxe max-w-5xl">
          <div className="space-y-16">
            {categories.map((category) => (
              <div key={category.title}>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="font-display text-2xl md:text-3xl text-vanilla">
                    {category.title}
                  </h2>
                  <span className="hairline" />
                </div>
                <ul className="grid sm:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <ServiceCard key={item} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-20 pt-12 border-t border-champagne/10 text-center max-w-2xl mx-auto">
            <p className="text-vanilla/70 leading-relaxed mb-6">
              {tr(
                "Du vermisst etwas in dieser Liste? Vieles entsteht erst im persönlichen Gespräch. Schreib mir und wir finden gemeinsam den richtigen Rahmen.",
                "Missing something on this list? A lot only emerges in a personal conversation. Write to me and we'll find the right frame together."
              )}
            </p>
            <Link to="/buchung" className="btn-gold">{tr("Termin anfragen", "Request appointment")}</Link>
          </div>
        </div>
      </section>

      {/* TABUS */}
      <section id="tabus" className="py-24 border-t border-champagne/15">
        <div className="container-luxe max-w-3xl">
          <div className="text-center mb-12">
            <div className="eyebrow mb-4">{tr("Grenzen", "Limits")}</div>
            <h2 className="font-display text-4xl md:text-5xl gold-text mb-3">
              {tr("Meine ", "My ")}
              <em className="font-script not-italic">{tr("Tabus", "taboos")}</em>
            </h2>
            <p className="text-vanilla/70 leading-relaxed max-w-2xl mx-auto">
              {tr(
                "Wir spielen nach meinen Regeln. Du hast meine Tabus zu respektieren — und zu Respekt gehört auch, dass du mich niemals fragst, ob ich eine Ausnahme machen würde. Meine Tabus sind absolut nicht verhandelbar.",
                "We play by my rules. You are to respect my taboos — and part of that respect is never asking whether I would make an exception. My taboos are absolutely non-negotiable."
              )}
            </p>
          </div>

          <ul className="grid sm:grid-cols-2 gap-4">
            {tabus.map((t) => (
              <li
                key={t}
                className="flex items-center bg-card border border-champagne/10 p-5"
              >
                <span className="text-lg text-vanilla/90 font-display tracking-wide">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
