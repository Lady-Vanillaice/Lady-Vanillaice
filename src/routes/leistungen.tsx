import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/leistungen")({
  head: () => ({
    meta: [
      { title: "Leistungen – individuelle Domina-Sessions in München" },
      {
        name: "description",
        content:
          "Individuelle Domina-Sessions in München: psychologisches Spiel, sinnliche Kontrolle, Disziplin, Rollenspiele und maßgeschneiderte Fantasien.",
      },
      { property: "og:title", content: "Leistungen – individuelle Domina-Sessions in München" },
      {
        property: "og:description",
        content:
          "Hart, weich und unberechenbar: Entdecke die Spielwelten von Lady Vanilla Ice.",
      },
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

  const worlds = [
    {
      title: tr("Dein erstes Loslassen", "Your first surrender"),
      text: tr(
        "Ein sicherer, respektvoller Einstieg. Ich führe dich ruhig und Schritt für Schritt.",
        "A safe, respectful introduction. I guide you calmly, step by step."
      ),
      examples: tr(
        "Leichte Fesselung, Sinnesentzug, Spanking, Fuß- und Schuhverehrung, erste Aufgaben, Tease & Denial",
        "Light bondage, sensory deprivation, spanking, foot and shoe worship, first tasks, tease and denial"
      ),
    },
    {
      title: tr("Mein Spiel mit deinem Kopf", "My game with your mind"),
      text: tr(
        "Worte, Erwartungen und Kontrolle. Du weißt nie ganz, was als Nächstes kommt.",
        "Words, anticipation and control. You never quite know what comes next."
      ),
      examples: tr(
        "Psychologische Dominanz, Befehle, Erniedrigung, Orgasmuskontrolle, Keuschhaltung, Rollenspiele, überraschende Aufgaben",
        "Psychological dominance, commands, humiliation, orgasm control, chastity, role play, unexpected tasks"
      ),
    },
    {
      title: tr("Sanfte Macht", "Soft power"),
      text: tr(
        "Sinnlich, nah und verführerisch. Weich bedeutet bei mir nicht harmlos.",
        "Sensual, close and seductive. Soft never means harmless with me."
      ),
      examples: tr(
        "Facesitting bekleidet, Fuß- und Strumpferotik, Nylon, sanfte Fesselung, Tease & Denial, Sinnesentzug",
        "Clothed face sitting, foot and stocking worship, nylon, soft bondage, tease and denial, sensory deprivation"
      ),
    },
    {
      title: tr("Wenn ich hart werde", "When I turn hard"),
      text: tr(
        "Klare Regeln, Disziplin und Konsequenz – immer innerhalb deiner Grenzen.",
        "Clear rules, discipline and consequence — always within your limits."
      ),
      examples: tr(
        "Spanking, Peitsche, Rohrstock, CBT, Ballbusting, Brustwarzenbehandlung, Elektrospiele, Trampling",
        "Spanking, whips, cane, CBT, ballbusting, nipple play, electro play, trampling"
      ),
    },
    {
      title: tr("Deine Verwandlung", "Your transformation"),
      text: tr(
        "Rollen, Aufgaben und neue Seiten an dir. Ich bestimme die Richtung.",
        "Roles, tasks and new sides of yourself. I set the direction."
      ),
      examples: tr(
        "Feminisierung, Rollenspiele, Aufgaben, Latex, Lack, Leder, Nylon, Slave Training und Ausbildung",
        "Feminisation, role play, tasks, latex, patent leather, leather, nylon, slave training and instruction"
      ),
    },
    {
      title: tr("Nur für dich inszeniert", "Created only for you"),
      text: tr(
        "Keine Standardsession. Dein Kopfkino – auf meine Art umgesetzt.",
        "No standard session. Your fantasy — realised my way."
      ),
      examples: tr(
        "Individuelle Rollenspiele, persönliche Szenarien, besondere Outfits und eine Kombination passender Praktiken",
        "Individual role play, personal scenarios, special outfits and a tailored combination of practices"
      ),
    },
  ];

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
            {tr("Meine ", "My ")}
            <em className="font-script gold-text not-italic">
              {tr("Spielwelten", "worlds of play")}
            </em>
          </>
        }
        intro={tr(
          "Hart. Weich. Unberechenbar. Keine Session folgt einem festen Drehbuch.",
          "Hard. Soft. Unpredictable. No session follows a fixed script."
        )}
      />

      <nav aria-label={tr("Bereiche auf dieser Seite", "Sections on this page")} className="border-b border-champagne/15">
        <div className="container-luxe py-6 flex flex-wrap justify-center gap-3">
          <a href="#welten" className="btn-gold min-w-[9rem]">
            {tr("Meine Art", "My way")}
          </a>
          <a href="#praktiken" className="btn-outline-gold min-w-[9rem]">
            {tr("Praktiken", "Practices")}
          </a>
          <a href="#tabus" className="btn-outline-gold min-w-[9rem]">
            {tr("Tabus", "Taboos")}
          </a>
        </div>
      </nav>

      <section id="welten" className="scroll-mt-28 py-20 border-b border-champagne/15">
        <div className="container-luxe max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-champagne/15">
            {worlds.map((world) => (
              <article key={world.title} className="bg-background p-8 md:p-10">
                <h2 className="font-display text-2xl text-vanilla mb-3">{world.title}</h2>
                <p className="text-sm text-vanilla/65 leading-relaxed mb-5">{world.text}</p>
                <div className="pt-4 border-t border-champagne/10">
                  <div className="eyebrow mb-2">{tr("Mögliche Elemente", "Possible elements")}</div>
                  <p className="text-xs text-vanilla/55 leading-relaxed">{world.examples}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="text-xs text-vanilla/45 leading-relaxed text-center max-w-3xl mx-auto mt-8">
            {tr(
              "Welche Praktiken tatsächlich Teil deiner Session werden, entscheiden wir gemeinsam. Wünsche, Erfahrung, Gesundheit und klare Grenzen bestimmen den Rahmen.",
              "Which practices become part of your session is decided together. Wishes, experience, health and clear boundaries define the framework."
            )}
          </p>
          <div className="text-center mt-10">
            <Link to="/buchung" className="btn-gold">
              {tr("Termin anfragen", "Request appointment")}
            </Link>
          </div>
        </div>
      </section>

      <section id="praktiken" className="scroll-mt-28 py-24">
        <div className="container-luxe max-w-5xl">
          <div className="text-center mb-14">
            <div className="eyebrow mb-4">{tr("Möglichkeiten", "Possibilities")}</div>
            <h2 className="font-display text-4xl md:text-5xl gold-text">
              {tr("Was Teil unseres Spiels sein kann", "What may become part of our play")}
            </h2>
          </div>

          <div className="space-y-14">
            {categories.map((category) => (
              <div key={category.title}>
                <div className="flex items-center gap-4 mb-6">
                  <h3 className="font-display text-2xl md:text-3xl text-vanilla">{category.title}</h3>
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

          <div className="mt-16 text-center max-w-xl mx-auto">
            <p className="text-vanilla/70 leading-relaxed mb-6">
              {tr(
                "Du vermisst etwas? Schreib mir. Vieles entsteht erst im persönlichen Gespräch.",
                "Missing something? Write to me. Much only emerges in a personal conversation."
              )}
            </p>
            <Link to="/buchung" className="btn-outline-gold">
              {tr("Meine Fantasie anfragen", "Request my fantasy")}
            </Link>
          </div>
        </div>
      </section>

      <section id="tabus" className="scroll-mt-28 py-24 border-t border-champagne/15">
        <div className="container-luxe max-w-3xl">
          <div className="text-center mb-12">
            <div className="eyebrow mb-4">{tr("Grenzen", "Limits")}</div>
            <h2 className="font-display text-4xl md:text-5xl gold-text mb-3">
              {tr("Meine ", "My ")}
              <em className="font-script not-italic">{tr("Tabus", "taboos")}</em>
            </h2>
            <p className="text-vanilla/70 leading-relaxed max-w-2xl mx-auto">
              {tr(
                "Meine Tabus sind nicht verhandelbar. Respekt bedeutet, nicht nach Ausnahmen zu fragen.",
                "My taboos are non-negotiable. Respect means not asking for exceptions."
              )}
            </p>
          </div>

          <ul className="grid sm:grid-cols-2 gap-4">
            {tabus.map((taboo) => (
              <li key={taboo} className="flex items-center bg-card border border-champagne/10 p-5">
                <span className="text-lg text-vanilla/90 font-display tracking-wide">{taboo}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
