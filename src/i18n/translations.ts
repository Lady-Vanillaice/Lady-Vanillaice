// Zentrale Übersetzungs-Dictionaries.
// Struktur: t('nav.services') → schaut in translations[lang].nav.services
// Fehlende EN-Keys fallen automatisch auf DE zurück (siehe i18n/index.tsx).

export type Lang = "de" | "en";

// Der DE-Baum ist die Referenz. EN wird als Partial<typeof de> typisiert,
// damit weitere Seiten nach und nach übersetzt werden können, ohne den Build
// zu brechen.
export const de = {
  common: {
    langDe: "Deutsch",
    langEn: "English",
    switchTo: "Sprache wechseln",
  },
  nav: {
    home: "Startseite",
    about: "über mich",
    services: "Leistungen",
    prices: "Preise",
    calendar: "Kalender",
    journal: "Journal",
    online: "online",
    faq: "faq",
    duo: "duo",
    contentDreh: "content dreh",
    custom: "Custom",
    photoshoot: "Fotoshooting",
    reviews: "Erfahrungsberichte",
    booking: "buchung",
    contact: "Kontakt",
    requestAppointment: "Termin anfragen",
    openMenu: "Menü öffnen",
  },
  footer: {
    tagline:
      "Exklusive Sessions in München und Umgebung. Stil, Diskretion und individuelle Erlebnisse auf höchstem Niveau.",
    navigation: "Navigation",
    contact: "Kontakt",
    email: "E-Mail",
    telegram: "Telegram",
    instagram: "Instagram",
    location: "Standort",
    locationValue: "München und Umgebung",
    rights: "Alle Rechte vorbehalten · 18+",
    privacy: "Datenschutz",
    agb: "AGB",
    imprint: "Impressum",
    admin: "Admin",
  },
  ageGate: {
    hint: "Hinweis · 18+",
    welcome: "Willkommen",
    body: "Diese Website richtet sich ausschließlich an volljährige Personen. Mit dem Betreten bestätigen Sie, dass Sie das 18. Lebensjahr vollendet haben und die Inhalte freiwillig ansehen möchten.",
    enter: "Ich bin 18+ · Eintreten",
    leave: "Verlassen",
  },
  sticky: {
    whatsapp: "WhatsApp",
    whatsappAria: "Über WhatsApp schreiben",
  },
  notFound: {
    kicker: "Fehler 404",
    title: "Seite nicht gefunden",
    body: "Diese Seite existiert nicht oder wurde verschoben.",
    home: "Zur Startseite",
  },
  errorPage: {
    kicker: "Hinweis",
    title: "Die Seite konnte nicht geladen werden",
    body: "Bitte versuchen Sie es erneut oder kehren Sie zur Startseite zurück.",
    retry: "Erneut versuchen",
    home: "Startseite",
  },
  home: {
    hero: {
      welcome: "Willkommen bei",
      tagline: "Stil. Kontrolle. Leidenschaft. — Domina in München & Umgebung.",
      intro:
        "Diskret, stilvoll und intensiv: Hier entstehen Sessions, die dich genau dort abholen, wo deine Fantasien beginnen.",
      note:
        "Meine Sessions sind sinnlich und mit Körperkontakt — Geschlechtsverkehr bleibt jedoch ausgeschlossen.",
      ctaCalendar: "Kalender",
      ctaServices: "Leistungen entdecken",
      scroll: "scroll",
      srSubtitle: " — Domina in München & Umgebung für BDSM- und Fetisch-Sessions",
    },
    expect: {
      kicker: "Was Dich erwartet",
      title: "Jede Begegnung ist einzigartig",
      subtitle:
        "Ein Erlebnis, das unter deiner Haut bleibt — diskret, intensiv und ganz auf dich abgestimmt. Ob bei mir als Domina in München und Umgebung: Ich schaffe Raum für das, was du wirklich spürst.",
      steps: [
        {
          title: "Terminauswahl",
          text: "Du suchst dir in meinem Kalender einen passenden Termin aus – für eine Session mit mir als Domina in München und Umgebung. Es gibt verschiedene Termine: Sessions mit mir alleine, ggf. ab und an Duo Sessions oder Sessions, in denen ich Content drehe – diese sind im Kalender jeweilig markiert. Sobald du die Anfrage abgeschickt hast, prüfe ich diesen und bestätige dir den Termin per E-Mail. Mit der Bestätigung erhältst du alle weiteren Informationen.",
        },
        {
          title: "Vorlieben & Tabus",
          text: "Vorab sende mir bitte per E-Mail eine detaillierte Liste mit deinen Wünschen, Fantasien und klaren Tabus. Je offener und ehrlicher du bist, desto gezielter und intensiver kann ich die Session auf dich abstimmen.",
        },
        {
          title: "Das Vorgespräch",
          text: "Beim Treffen beginnen wir mit einem ruhigen, vertraulichen Vorgespräch. Hier gehen wir noch tiefer: Ich möchte wissen, was seit der Terminvereinbarung in deinem Kopf vorgeht – welche Gedanken, Bilder und Szenarien dich beschäftigen. Welches Kopfkino hat sich bei dir entwickelt? Wir klären gemeinsam deine Grenzen, Wünsche und Erwartungen, damit ich dich genau so führen kann, wie du es dir ersehnst. Nach dem Gespräch nimmst du dir Zeit zum Duschen. Anschließend betreten wir gemeinsam den Raum.",
        },
        {
          title: "Die Inszenierung",
          text: "In einem exklusiven und diskreten Ambiente wird ein Raum geschaffen, der ganz auf dich und unsere gemeinsame Zeit abgestimmt ist. Deine Fantasien und die im Vorgespräch besprochenen Bilder werden mit voller Präsenz, Kontrolle und Präzision umgesetzt — intensiv, klar und genau so, wie du es brauchst.",
        },
        {
          title: "Der Nachklang",
          text: "Nach der Session bleibt bewusst Zeit für Ruhe und Reflexion. Ich begleite dich achtsam zurück in den Alltag und sorge für einen respektvollen, würdigen Abschluss. Ein intensives Erlebnis verdient einen ebenso hochwertigen Ausklang.",
        },
      ],
    },
    cta: {
      kicker: "Termin nach Vereinbarung",
      title1: "Bereit für eine ",
      titleAccent: "unvergessliche",
      title2: " Begegnung?",
      request: "Jetzt anfragen",
      email: "per E-Mail",
    },
    instagram: {
      follow: "Folge mir auf Instagram",
      caption: "Einblicke, Stimmungen und Momente — direkt aus meiner Welt.",
      visit: "Instagram besuchen",
    },
  },
};

export const en: DeepPartial<typeof de> = {
  common: {
    langDe: "Deutsch",
    langEn: "English",
    switchTo: "Change language",
  },
  nav: {
    home: "Home",
    about: "about me",
    services: "Services",
    prices: "Rates",
    calendar: "Calendar",
    journal: "Journal",
    online: "online",
    faq: "faq",
    duo: "duo",
    contentDreh: "content shoot",
    custom: "Custom",
    photoshoot: "Photoshoot",
    reviews: "Reviews",
    booking: "booking",
    contact: "Contact",
    requestAppointment: "Request appointment",
    openMenu: "Open menu",
  },
  footer: {
    tagline:
      "Exclusive sessions in Munich and surroundings. Style, discretion and individually crafted experiences at the highest level.",
    navigation: "Navigation",
    contact: "Contact",
    email: "Email",
    telegram: "Telegram",
    instagram: "Instagram",
    location: "Location",
    locationValue: "Munich and surroundings",
    rights: "All rights reserved · 18+",
    privacy: "Privacy",
    agb: "Terms",
    imprint: "Imprint",
    admin: "Admin",
  },
  ageGate: {
    hint: "Notice · 18+",
    welcome: "Welcome",
    body: "This website is intended exclusively for adults. By entering, you confirm that you are at least 18 years of age and view the content voluntarily.",
    enter: "I am 18+ · Enter",
    leave: "Leave",
  },
  sticky: {
    whatsapp: "WhatsApp",
    whatsappAria: "Contact via WhatsApp",
  },
  notFound: {
    kicker: "Error 404",
    title: "Page not found",
    body: "This page does not exist or has been moved.",
    home: "Back to home",
  },
  errorPage: {
    kicker: "Notice",
    title: "This page could not be loaded",
    body: "Please try again or return to the home page.",
    retry: "Try again",
    home: "Home",
  },
  home: {
    hero: {
      welcome: "Welcome to",
      tagline: "Style. Control. Passion. — Domina in Munich & surroundings.",
      intro:
        "Discreet, refined and intense: sessions that meet you exactly where your fantasies begin.",
      note:
        "My sessions are sensual and involve physical contact — sexual intercourse, however, remains excluded.",
      ctaCalendar: "Calendar",
      ctaServices: "Discover services",
      scroll: "scroll",
      srSubtitle: " — Domina in Munich & surroundings for BDSM and fetish sessions",
    },
    expect: {
      kicker: "What awaits you",
      title: "Every encounter is unique",
      subtitle:
        "An experience that lingers under your skin — discreet, intense and entirely tailored to you. Whether with me as a domina in Munich and surroundings: I create space for what you truly feel.",
      steps: [
        {
          title: "Choosing an appointment",
          text: "You pick a suitable date from my calendar — for a session with me as a domina in Munich and surroundings. There are different kinds of appointments: solo sessions with me, occasional duo sessions, or sessions in which I shoot content — each marked accordingly in the calendar. Once you have sent your request, I review it and confirm the appointment by email. With the confirmation you receive all further information.",
        },
        {
          title: "Preferences & taboos",
          text: "Before we meet, please send me a detailed list of your wishes, fantasies and clear taboos by email. The more open and honest you are, the more precisely and intensely I can tailor the session to you.",
        },
        {
          title: "The preliminary talk",
          text: "When we meet, we begin with a calm, confidential conversation. We go deeper here: I want to know what has been going through your mind since we agreed on the date — which thoughts, images and scenarios have preoccupied you. What kind of inner cinema has developed for you? Together we clarify your limits, wishes and expectations so I can guide you exactly as you long for. Afterwards you take your time to shower. Then we enter the room together.",
        },
        {
          title: "The staging",
          text: "In an exclusive and discreet ambiance, a space is created that is fully attuned to you and our shared time. Your fantasies and the images we discussed are realised with full presence, control and precision — intense, clear and exactly the way you need it.",
        },
        {
          title: "The aftermath",
          text: "After the session, time is deliberately set aside for calm and reflection. I guide you mindfully back into everyday life and ensure a respectful, dignified conclusion. An intense experience deserves an equally refined closing.",
        },
      ],
    },
    cta: {
      kicker: "By appointment only",
      title1: "Ready for an ",
      titleAccent: "unforgettable",
      title2: " encounter?",
      request: "Request now",
      email: "by email",
    },
    instagram: {
      follow: "Follow me on Instagram",
      caption: "Impressions, moods and moments — straight from my world.",
      visit: "Visit Instagram",
    },
  },
};

// Deep-partial helper so EN kann Stück für Stück wachsen.
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export const translations = { de, en } as const;
