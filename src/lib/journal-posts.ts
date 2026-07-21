export type JournalPost = {
  slug: string;
  title: string;
  eyebrow: string;
  excerpt: string;
  date: string; // ISO
  readingMinutes: number;
  category: "Ratgeber" | "Session-Report" | "Perspektive";
  // Content as an array of blocks — rendered by JournalPostView.
  content: Array<
    | { type: "p"; text: string }
    | { type: "h2"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "quote"; text: string }
    | { type: "dl"; items: { term: string; definition: string }[] }
  >;
};

export const journalPosts: JournalPost[] = [
  {
    slug: "erstes-mal-domina-ablauf",
    title: "Das erste Mal bei einer Domina – so läuft eine Session wirklich ab",
    eyebrow: "Ratgeber",
    category: "Ratgeber",
    excerpt:
      "Vom ersten Kontakt bis zum Ausklang: Wie eine professionelle BDSM-Session aufgebaut ist, was dich erwartet und wie du dich am besten vorbereitest.",
    date: "2026-07-04",
    readingMinutes: 6,
    content: [
      {
        type: "p",
        text: "Wer zum ersten Mal eine Domina besucht, hat oft mehr Fragen als Fantasien. Das ist gut so. Eine Session ist kein spontaner Rausch, sondern ein sorgfältig vorbereiteter Rahmen — genau dieser Rahmen macht sie sicher, intensiv und unvergesslich.",
      },
      { type: "h2", text: "1. Erstkontakt und Vorgespräch" },
      {
        type: "p",
        text: "Bevor überhaupt ein Termin steht, tauschen wir uns schriftlich aus: über deine Fantasien, deine Grenzen, körperliche Voraussetzungen und deine Erfahrung. Ich frage bewusst nach — nicht aus Neugier, sondern um eine Session zu gestalten, die zu dir passt.",
      },
      { type: "h2", text: "2. Ankunft und Rahmen" },
      {
        type: "p",
        text: "Am Termintag empfange ich dich diskret in meinem Studio. Bevor wir beginnen, klären wir noch einmal Safewords, No-Gos und den groben Ablauf. Du bekommst Zeit, dich zu setzen, umzuziehen und anzukommen — der Übergang vom Alltag in die Session ist Teil des Erlebnisses.",
      },
      { type: "h2", text: "3. Die Session selbst" },
      {
        type: "p",
        text: "Jede Session hat einen Bogen: ein langsamer Einstieg, ein intensiver Höhepunkt, ein bewusster Ausklang. Ich lese permanent deine Reaktionen, dosiere und führe. Du musst nichts leisten — du darfst dich fallen lassen.",
      },
      { type: "h2", text: "4. Aftercare" },
      {
        type: "p",
        text: "Nach jeder Session gibt es Zeit zum Ankommen: Wasser, Ruhe, ein kurzes Gespräch. Gerade nach intensiven Sessions ist Aftercare kein Nice-to-have, sondern essenziell — körperlich wie mental.",
      },
      { type: "h2", text: "Was du mitbringen solltest" },
      {
        type: "ul",
        items: [
          "Ehrlichkeit über Erfahrung, Gesundheit und Erwartungen",
          "Pünktlichkeit und frische Körperhygiene",
          "Das vereinbarte Honorar diskret in einem Umschlag",
          "Offenheit — aber keine überzogenen Drehbücher",
        ],
      },
      {
        type: "quote",
        text: "Die beste Session entsteht nicht aus einem perfekten Plan, sondern aus echter Präsenz — auf beiden Seiten.",
      },
    ],
  },
  {
    slug: "unterschied-domina-vs-escort",
    title: "Domina vs. Escort – warum das nicht dasselbe ist",
    eyebrow: "Perspektive",
    category: "Perspektive",
    excerpt:
      "Beide Berufe werden oft in einen Topf geworfen — inhaltlich haben sie wenig gemeinsam. Ein ehrlicher Blick auf Auftrag, Rahmen und Anspruch.",
    date: "2026-06-18",
    readingMinutes: 5,
    content: [
      {
        type: "p",
        text: "„Machst du auch mehr?“ — eine der häufigsten und gleichzeitig verräterischsten Fragen. Sie zeigt, wie stark Domina-Arbeit noch mit klassischer Escort-Tätigkeit vermischt wird. Dabei sind es zwei sehr unterschiedliche Berufe mit unterschiedlichem Auftrag.",
      },
      { type: "h2", text: "Der Kern des Unterschieds" },
      {
        type: "p",
        text: "Eine Domina bietet BDSM-Sessions an: Machtgefälle, Rollenspiel, Fetisch, kontrollierte Grenzerfahrungen. Ein Escort begleitet in der Regel gesellschaftlich und/oder sexuell. Das eine ist Inszenierung von Kontrolle, das andere ein anderes Dienstleistungsmodell.",
      },
      { type: "h2", text: "Kein Sexualkontakt" },
      {
        type: "p",
        text: "Bei mir gibt es klassisch keinen Geschlechtsverkehr und keine Oralverkehr-Leistungen. Das ist kein Verlust, sondern eine bewusste Definition: Die Session lebt von psychologischer Spannung, Ritual und Fetisch — nicht von schnellem Sex.",
      },
      { type: "h2", text: "Warum die Unterscheidung wichtig ist" },
      {
        type: "ul",
        items: [
          "Sie schützt beide Seiten vor falschen Erwartungen",
          "Sie erlaubt professionelle Spezialisierung — z. B. auf Bondage, Fetisch, Erziehung",
          "Sie macht die Anfrage effizienter: Wer BDSM will, bucht Domina; wer Begleitung will, bucht Escort",
        ],
      },
      {
        type: "quote",
        text: "Ich bin Domina, weil mich die Choreografie von Macht mehr fasziniert als jedes körperliche „mehr“.",
      },
    ],
  },
  {
    slug: "bdsm-lexikon-wichtige-begriffe",
    title: "BDSM-Lexikon: Die wichtigsten Begriffe und ihre Bedeutung",
    eyebrow: "Ratgeber",
    category: "Ratgeber",
    excerpt:
      "Ein übersichtliches Lexikon der wichtigsten BDSM-Begriffe: von Safeword und Aftercare über Bondage, Impact Play und Rollen bis zu Praktiken wie Shibari, CBT oder Findom.",
    date: "2026-07-17",
    readingMinutes: 8,
    content: [
      {
        type: "p",
        text: "BDSM hat eine eigene Sprache. Wer neu ist oder eine Anfrage schreibt, stößt schnell auf Begriffe, die nicht selbsterklärend sind. Dieses Lexikon erklärt die wichtigsten Wörter kurz, klar und aus der Perspektive einer professionellen Session.",
      },
      { type: "h2", text: "Grundbegriffe" },
      {
        type: "dl",
        items: [
          {
            term: "BDSM",
            definition:
              "Oberbegriff für Bondage & Discipline, Dominance & Submission, Sadism & Masochism. Beschreibt konsensuale Praktiken mit Machtgefälle, Schmerz, Fesselung oder Fetisch.",
          },
          {
            term: "Safeword",
            definition:
              "Ein vereinbartes Wort oder Signal, das die Session sofort unterbricht oder verlangsamt. Klassisch: Rot = Stop, Gelb = Pause/Check-in, Grün = Weiter.",
          },
          {
            term: "Hard Limit",
            definition: "Eine absolute Grenze, die nie überschritten wird. Respekt davor ist Pflicht und Vertrauensbasis.",
          },
          {
            term: "Soft Limit",
            definition: "Eine vorsichtige Grenze, die unter bestimmten Bedingungen, nach Absprache und in kleinen Schritten ausgetestet werden kann.",
          },
          {
            term: "Aftercare",
            definition:
              "Die Betreuung nach einer Session: Ruhe, Wasser, Wärme, Gespräch. Stabilisiert körperlich und mental und ist besonders nach intensiven Spielen essenziell.",
          },
          {
            term: "SSC",
            definition: "Safe, Sane, Consensual — ein Leitsatz für sichere, vernünftige und einvernehmliche BDSM-Praxis.",
          },
          {
            term: "RACK",
            definition:
              "Risk-Aware Consensual Kink: betont, dass manche Praktiken inhärente Risiken haben, die im Vorfeld bewusst besprochen und akzeptiert werden.",
          },
          {
            term: "Consent / Einverständnis",
            definition:
              "Freiwillige, informierte und jederzeit widerrufliche Zustimmung zu allem, was in der Session passiert. Ohne Consent kein BDSM.",
          },
        ],
      },
      { type: "h2", text: "Rollen und Beziehungsformen" },
      {
        type: "dl",
        items: [
          {
            term: "Domina / Mistress",
            definition: "Die führende, herrschende Person in einer Session. Sie bestimmt Rahmen, Ablauf und Intensität innerhalb der vereinbarten Grenzen.",
          },
          {
            term: "Sub",
            definition: "Submissive: die unterwerfende Person, die Kontrolle abgibt und sich dem Spiel und der Führung übergibt.",
          },
          {
            term: "Sklave / Slave",
            definition: "Eine intensive Form der Submission, oft mit Elementen von Ownership, Dienstbarkeit oder langfristiger Hingabe.",
          },
          {
            term: "Switch",
            definition: "Jemand, der je nach Stimmung, Partner oder Setting die dominante oder submissive Rolle einnimmt.",
          },
          {
            term: "Top / Bottom",
            definition: "Top führt die Handlung aus, Bottom empfängt sie. Nicht identisch mit Dom/sub — es beschreibt eher die aktive und passive Rolle in einer Szene.",
          },
          {
            term: "TPE",
            definition:
              "Total Power Exchange: eine sehr intensive Form der Machtübergabe, oft außerhalb einzelner Sessions. In professionellen Settings meist nur als Rollenspiel-Element.",
          },
        ],
      },
      { type: "h2", text: "Praktiken" },
      {
        type: "dl",
        items: [
          {
            term: "Bondage",
            definition: "Das Fesseln des Körpers mit Seil, Leder, Handschellen, Tape oder anderen Materialien. Ziel ist Immobilisierung, Ästhetik oder psychologische Übergebenheit.",
          },
          {
            term: "Shibari / Kinbaku",
            definition: "Japanische Seilbondage mit ästhetischem und oft meditativem Anspruch. Manche Muster sind rein dekorativ, andere dienen der Immobilisierung.",
          },
          {
            term: "Impact Play",
            definition: "Alle Praktiken mit gezielten Schlägen: Spanking, Flogging, Caning, Paddeln. Die Intensität reicht von sanft bis sehr stark.",
          },
          {
            term: "Flogging",
            definition: "Schläge mit einem Flogger — einem Griff mit mehreren Leder- oder Gummi-Riemen. Kann sanft massierend oder intensiv stechend sein.",
          },
          {
            term: "Spanking",
            definition: "Schlagen mit der Hand auf Gesäß oder Oberschenkel. Oft ein sanfter Einstieg in das Impact Play.",
          },
          {
            term: "Caning",
            definition: "Schläge mit einem Stock oder Rohrstock. Sehr präzise und intensiv, daher nur für erfahrene Spielpartner geeignet.",
          },
          {
            term: "CBT",
            definition:
              "Cock and Ball Torture: gezielte, kontrollierte Schmerz- oder Druckreize am männlichen Genitalbereich. Erfordert Erfahrung und Vertrauen.",
          },
          {
            term: "Wax Play",
            definition: "Das Tropfen von Kerzenwachs auf die Haut. Spezielle BDSM-Kerzen brennen niedriger und sind sicherer als Haushaltskerzen.",
          },
          {
            term: "Sensation Play",
            definition: "Spiel mit verschiedenen Reizen: Federn, Eis, Pinsel, Knete, Wachs, Strom oder Texturen. Oft ohne Schmerz, dafür sehr intensiv.",
          },
          {
            term: "Breath Play",
            definition: "Kontrolle über Atmung oder Sauerstoffzufuhr. Hochriskant und daher in professionellen Sessions meist nur simuliert oder als psychologisches Element.",
          },
          {
            term: "Electroplay",
            definition: "Reize durch elektrischen Strom, z. B. mit Violet Wand oder TENS-Geräten. Kann kribbelnd, durchdringend oder schmerzhaft sein.",
          },
          {
            term: "Medical Play",
            definition: "Rollenspiele oder Praktiken im ärztlichen Kontext: Untersuchung, Katheter, Spekulum, Nadeln. Erfordert Hygiene und Fachwissen.",
          },
          {
            term: "Roleplay",
            definition: "Inszenierte Rollen wie Lehrer/in und Schüler/in, Chef/in und Mitarbeiter/in, Wärter/in und Häftling. Dient der psychologischen Spannung.",
          },
          {
            term: "Pet Play",
            definition: "Das Einnehmen einer Tierrolle wie Hund, Katze oder Pony. Oft mit entsprechenden Accessoires, Training und Kommunikation auf Tierlautbasis.",
          },
          {
            term: "Humiliation",
            definition: "Erniedrigung durch Worte, Aufgaben oder Situationen. Muss vorher genau besprochen werden, da sie sehr individuelle Trigger hat.",
          },
          {
            term: "Degradation",
            definition: "Intensivere Form der Erniedrigung, bei der jemand bewusst als Objekt, Tier oder minderwertig behandelt wird. Nur mit klaren Limits.",
          },
          {
            term: "Worship",
            definition: "Anbetung bestimmter Körperteile, Kleidungsstücke oder der ganzen Person — z. B. Fuß-, Schuh- oder Stiefelanbetung.",
          },
          {
            term: "Tease and Denial",
            definition: "Aufreizen und Verweigern: Erregung wird erzeugt, aber nicht zum Höhepunkt geführt. Spiel mit Kontrolle und Frustration.",
          },
          {
            term: "Orgasm Control",
            definition: "Kontrolle über den Orgasmus: erlauben, verweigern, erzwingen oder ruinieren. Erfordert genaues Lesen des Körpers.",
          },
          {
            term: "Chastity",
            definition: "Keuschheit durch ein Schlossgerät am Genitalbereich. Die Domina hält den Schlüssel — physisch oder symbolisch.",
          },
          {
            term: "Pegging",
            definition: "Anale Penetration des Bottom durch die Top mit einem Strap-on. Kann für alle Geschlechter sehr intensiv sein.",
          },
          {
            term: "Strap-on",
            definition: "Ein Umschnalldildo, das am Körper getragen wird. Wird für Pegging, Deepthroat-Training oder symbolische Dominanz genutzt.",
          },
          {
            term: "Feminization / Sissy Training",
            definition: "Das (vorübergehende) Verwandeln eines Mannes in eine feminine Rolle durch Kleidung, Make-up, Verhalten und Aufgaben.",
          },
          {
            term: "Findom",
            definition:
              "Financial Domination: Machtausübung durch Geld, Tribute oder Geschenke. In meinen Sessions nur nach klarer Absprache und innerhalb vereinbarter Grenzen.",
          },
        ],
      },
      { type: "h2", text: "Zustände während und nach der Session" },
      {
        type: "dl",
        items: [
          {
            term: "Subspace",
            definition: "Ein tranceartiger, oft euphorischer Zustand durch Endorphine und Adrenalin. Der Sub fühlt sich schwebend, entspannt oder emotional offen.",
          },
          {
            term: "Domspace / Topspace",
            definition: "Der fokussierte, manchmal fast meditative Zustand der führenden Person, in dem Intuition, Kontrolle und Präsenz verschmelzen.",
          },
          {
            term: "Sub Drop / Top Drop",
            definition: "Emotionales oder körperliches Tief nach einer Session, wenn Hormone absinken. Gute Aftercare und ein Check-in am nächsten Tag helfen dagegen.",
          },
        ],
      },
      {
        type: "p",
        text: "Dieses Lexikon ist ein Ausgangspunkt, keine vollständige Liste. In einer echten Session werden alle Begriffe, die für dich relevant sind, vorher besprochen — individuell, ehrlich und auf Augenhöhe.",
      },
    ],
  },
];

export function getPostBySlug(slug: string): JournalPost | undefined {
  return journalPosts.find((p) => p.slug === slug);
}

export function getSortedPosts(): JournalPost[] {
  return [...journalPosts].sort((a, b) => (a.date < b.date ? 1 : -1));
}
