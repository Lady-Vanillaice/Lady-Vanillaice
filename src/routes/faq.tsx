import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/site/PageHeader";
import { Plus, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { useTr, useLang } from "@/i18n";

const faqStructured: { q: string; a: string }[] = [
  { q: "Wie läuft eine Buchung bei dir ab?", a: "Am besten schreibst du mir über Telegram, E-Mail oder das Buchungsformular mit allen wichtigen Infos: Wunschstadt (aktuell München), Datum und Uhrzeit, gewünschte Dauer (mindestens 60 Minuten) sowie ein ehrlicher Einblick in deine Vorlieben und Grenzen. Nach Bestätigung folgt die Anzahlung, mit deren Eingang der Termin verbindlich wird." },
  { q: "Welche Zahlungsmöglichkeiten gibt es?", a: "Zur Fixierung des Termins ist eine Anzahlung von 50% per PayPal oder Banküberweisung fällig. Die restlichen 50% zahlst du vor Beginn der Session in bar. Ohne eingegangene Anzahlung gibt es keinen festen Termin. Bei Absagen unter 48 Stunden oder Nichterscheinen verfällt die Anzahlung." },
  { q: "Was erwartet mich in einer Session?", a: "Wir beginnen mit einem echten Vorgespräch über deine Wünsche, Ängste und Grenzen. Danach zahlst du den Resttribut und kannst dich frisch machen. Ich arbeite nicht nach festem Skript, sondern lese dich, reagiere feinfühlig und führe dich intuitiv. Nach der Session bleibt Zeit für einen ruhigen Nachklang." },
  { q: "Wie wird Diskretion gewährleistet?", a: "Was zwischen uns bleibt, bleibt zwischen uns. Alle Daten und Nachrichten, die du mir anvertraust, behandle ich vertraulich. Sie dienen ausschließlich der Terminabsprache und werden niemals weitergegeben." },
  { q: "Bin ich als Anfänger willkommen?", a: "Ja, auch ohne Erfahrung bist du herzlich willkommen. Du brauchst kein Vorwissen und musst nichts funktionieren. Wichtig ist, dass du offen kommunizierst und dich nicht verstellst. Ich gehe behutsam vor und orientiere mich an deinem Tempo." },
  { q: "Wer ist bei mir richtig?", a: "Das merkst du am besten, indem du dich mit meiner Welt beschäftigst — auf BestFans, Clips4Sale, in meinem Onlineshop und auf meinen Socials. Vorerfahrung spielt keine Rolle. Wichtig sind Mut, Ehrlichkeit und die Bereitschaft, dich nicht zu verstecken." },
  { q: "Wie weit im Voraus sollte ich buchen?", a: "Je früher, desto besser. Mehrere Tage im Voraus geben uns Zeit für ein gutes Vorgespräch und eine sorgfältige Vorbereitung. Kurzfristige Termine sind manchmal möglich, aber nicht garantiert." },
  { q: "Wie kann ich dich Online erleben?", a: "Auf BestFans, Clips4Sale und in meinem Onlineshop findest du Einblicke in meine Sessions. Auf BestFans zeige ich außerdem eine Seite von mir, die ich nur Online teile: meine devote Seite. Chatten führe ich ausschließlich über BestFans." },
  { q: "Was macht dir als Geschenk eine Freude?", a: "Herzhaftes: Pizza mit Schinken, Sahne, Zwiebel und Ei oder Sahne und Garnelen, Sushi mit Avocado, Garnelen oder Lachs, eine Crunchy Chicken Bowl oder Käsebrezel. Champignons mag ich gar nicht; bei Meeresfrüchten bin ich wählerisch — Garnelen mag ich aber auf Pizza und im Sushi. Süßes: Kinderschokolade, Ü-Ei, Knusper Puffreis oder Zimtschnecke. Alkoholfrei gern Coca-Cola Zero im Glas und Matcha mit Hafermilch. Kleidung: Dessous, Kleider und Latex in Größe 36, BH-Größe 70D; My Holy Desire in München. Schuhe: Pleaser jeglicher Art in Größe 39. Außerdem freue ich mich über Parfüm und Goldschmuck wie Ketten, Armbänder und verstellbare offene Ringe. Geschenke sind Inspiration, keine Erwartung." },
  { q: "Werden meine Daten gespeichert?", a: "Ich speichere nur, was für die Terminabsprache nötig ist — und auch das nur so lange, wie es wirklich gebraucht wird. Details in der Datenschutzerklärung." },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Lady Vanilla Ice" },
      { name: "description", content: "Häufige Fragen zu Buchung, Sessions, Diskretion sowie Geschenken und Wünschen bei Lady Vanilla Ice." },
      { property: "og:title", content: "FAQ — Lady Vanilla Ice" },
      { property: "og:description", content: "Antworten auf häufige Fragen." },
      { property: "og:url", content: "https://lady-vanillaice.com/faq" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqStructured.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
  component: FAQ,
});

function useFaqs(): { q: string; a: ReactNode }[] {
  const { lang } = useLang();
  if (lang === "en") {
    return [
      {
        q: "How does a booking work?",
        a: (
          <>
            <p className="mb-4">
              If you'd like to book me, please make a bit of an effort. A simple "hi" isn't enough. Write to me via Telegram, email or the booking form — with all the key information right away.
            </p>
            <p className="mb-4">So we can find a date quickly, I need from you:</p>
            <ul className="list-disc list-outside pl-5 mb-4 space-y-1 text-vanilla/70 marker:text-champagne">
              <li>Your preferred city — currently I'm only available in Munich.</li>
              <li>Date and time on one of my planned studio days.</li>
              <li>Preferred duration — at least one hour; from 90 minutes it really becomes intense.</li>
              <li>
                An honest glimpse of who you are: what excites you, what are your hard limits? My own preferences and taboos are on the{" "}
                <Link to="/leistungen" hash="tabus" className="text-champagne hover:underline">services page</Link>.
              </li>
            </ul>
            <p className="mb-4">
              Once we've agreed on a date, I'll send you the deposit details. Only when the deposit arrives is the appointment binding. Please confirm again in writing on the day before that you're coming.
            </p>
          </>
        ),
      },
      {
        q: "What payment methods are there?",
        a: (
          <>
            <p className="mb-4">
              To confirm your appointment a deposit of 50% of the session amount is due. You can send it via PayPal to{" "}
              <a href="mailto:info@herzblutmadl.com" className="text-champagne hover:underline">info@herzblutmadl.com</a>.
            </p>

            <p className="mb-4">
              The remaining 50% you pay in cash before the session begins. Without a received deposit there is no fixed appointment.
            </p>
            <div className="bg-card border border-champagne/15 p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-champagne mb-3">Cancellation terms</div>
              <ul className="space-y-2.5 list-disc list-outside pl-5 text-vanilla/70 marker:text-champagne">
                <li>Up to 48 hours before the appointment: the deposit is retained and can be credited once to a new appointment.</li>
                <li>For cancellations within 48 hours, no-shows or arriving more than 20 minutes late: the deposit is forfeited.</li>
                <li>Refunds are excluded.</li>
              </ul>
            </div>
          </>
        ),
      },
      {
        q: "What can I expect from a session?",
        a: (
          <>
            <p className="mb-4">
              We begin with a real conversation. I want to understand what moves you, what scares you, what you'd like to experience — and what you absolutely don't want. We talk about any health constraints too. Only once I've got a feel for you do we move on.
            </p>
            <p className="mb-4">
              Then you pay the remaining tribute and I bring you to the bathroom so you can freshen up and arrive. Then the actual part begins — guided, intuitive, entirely attuned to you.
            </p>
            <p className="mb-4">
              I don't work from a fixed script. I read you, react sensitively and lead you to where things get interesting. Exactly what happens I don't reveal in advance. Letting go of control is part of the experience.
            </p>
            <p>
              After the session there's time for aftercare. If you'd like, you can stay with yourself for a while — with or without words. I bring you back before I let you go.
            </p>
          </>
        ),
      },
      {
        q: "How is discretion ensured?",
        a: "What stays between us stays between us. All data and messages you entrust to me are treated confidentially. They serve only to arrange the appointment and are never passed on.",
      },
      {
        q: "Am I welcome as a beginner?",
        a: "Yes, you are warmly welcome even without experience. You don't need prior knowledge and you don't have to perform. What matters is that you communicate openly and don't put on an act. I move gently and follow your pace.",
      },
      {
        q: "Who is right for me?",
        a: (
          <>
            <p className="mb-4">
              You can tell best by engaging a little with my world. On{" "}
              <a href="https://www.bestfans.com/herzblutmadl" target="_blank" rel="noreferrer" className="text-champagne hover:underline">BestFans</a>,{" "}
              <a href="https://www.clips4sale.com/de/studio/468501/lady-vanillaice" target="_blank" rel="noreferrer" className="text-champagne hover:underline">Clips4Sale</a>,{" "}
              <a href="https://herzblutmadl-2.myshopify.com/collections" target="_blank" rel="noreferrer" className="text-champagne hover:underline">my online shop</a>{" "}
              and my socials you'll get an honest, unfiltered impression of me. If you recognise yourself in it, that's a good sign.
            </p>
            <p className="mb-4">
              Prior experience doesn't matter. Courage, honesty and the willingness not to hide yourself matter more. Tell me your fantasies — together we'll see whether we can turn them into something real.
            </p>
            <p>
              Whether the chemistry is right can't be read off a list of preferences. That only shows when we meet.
            </p>
          </>
        ),
      },
      {
        q: "How far in advance should I book?",
        a: "The earlier, the better. Several days in advance give us time for a good preliminary conversation and careful preparation. Short-notice appointments are sometimes possible, but not guaranteed.",
      },
      {
        q: "How can I experience you online?",
        a: (
          <>
            <p className="mb-4">
              If you'd like to experience me beforehand or in between, you'll find me on{" "}
              <a href="https://www.bestfans.com/herzblutmadl" target="_blank" rel="noreferrer" className="text-champagne hover:underline">BestFans</a>,{" "}
              <a href="https://www.clips4sale.com/de/studio/468501/lady-vanillaice" target="_blank" rel="noreferrer" className="text-champagne hover:underline">Clips4Sale</a>{" "}
              and in <a href="https://herzblutmadl-2.myshopify.com/collections" target="_blank" rel="noreferrer" className="text-champagne hover:underline">my online shop</a>. There you'll find glimpses of my sessions — from flogging and CBT to tease & denial.
            </p>
            <p className="mb-4">
              On <a href="https://www.bestfans.com/herzblutmadl" target="_blank" rel="noreferrer" className="text-champagne hover:underline">BestFans</a> I also show a side of me I only share online: my submissive side. In real sessions I remain the Lady who guides you.
            </p>
            <p>
              Chatting only happens via <a href="https://www.bestfans.com/herzblutmadl" target="_blank" rel="noreferrer" className="text-champagne hover:underline">BestFans</a>. Telegram and email are reserved for bookings and scheduling — not for your fantasies.
            </p>
          </>
        ),
      },
      {
        q: "Is my data stored?",
        a: (
          <>
            <p className="mb-4">
              I only store what is necessary for the appointment — and only for as long as it is really needed.
            </p>
            <p>
              Details are in the <Link to="/datenschutz" className="text-champagne hover:underline">privacy policy</Link>.
            </p>
          </>
        ),
      },
    ];
  }
  return [
    {
      q: "Wie läuft eine Buchung bei dir ab?",
      a: (
        <>
          <p className="mb-4">
            Wer mich buchen möchte, sollte sich etwas Mühe geben. Ein einfaches „Hallo" reicht nicht. Am besten schreibst du mir über Telegram, E-Mail oder das Buchungsformular – gleich mit allen wichtigen Infos.
          </p>
          <p className="mb-4">Damit wir schnell einen Termin finden, brauche ich von dir:</p>
          <ul className="list-disc list-outside pl-5 mb-4 space-y-1 text-vanilla/70 marker:text-champagne">
            <li>Deine Wunschstadt – aktuell bin ich nur in München verfügbar.</li>
            <li>Datum und Uhrzeit an einem meiner geplanten Studiotage.</li>
            <li>Die gewünschte Dauer – mindestens eine Stunde, ab 90 Minuten wird es richtig intensiv.</li>
            <li>
              Einen ehrlichen Einblick in dich: Was reizt dich, was sind deine harten Grenzen? Meine Vorlieben und Tabus findest du unter{" "}
              <Link to="/leistungen" hash="tabus" className="text-champagne hover:underline">Leistungen</Link>.
            </li>
          </ul>
          <p className="mb-4">
            Sobald wir uns auf einen Termin geeinigt haben, schicke ich dir die Details zur Anzahlung. Erst mit deren Eingang ist der Termin verbindlich. Bitte bestätige mir am Vortag noch einmal schriftlich, dass du kommst.
          </p>
        </>
      ),
    },
    {
      q: "Welche Zahlungsmöglichkeiten gibt es?",
      a: (
        <>
          <p className="mb-4">
            Zur Fixierung deines Termins ist eine Anzahlung von 50% des Sessionbetrags fällig. Du kannst sie per PayPal an{" "}
            <a href="mailto:info@herzblutmadl.com" className="text-champagne hover:underline">info@herzblutmadl.com</a> senden.
          </p>

          <p className="mb-4">
            Die restlichen 50% zahlst du vor Beginn unserer Session in bar. Ohne eingegangene Anzahlung gibt es keinen festen Termin.
          </p>
          <div className="bg-card border border-champagne/15 p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-champagne mb-3">Absagebedingungen</div>
            <ul className="space-y-2.5 list-disc list-outside pl-5 text-vanilla/70 marker:text-champagne">
              <li>Bis 48 Stunden vor dem Termin: Die Anzahlung bleibt erhalten und kann einmalig auf einen neuen Termin angerechnet werden.</li>
              <li>Bei Absagen unter 48 Stunden, bei Nichterscheinen oder Verspätung ab 20 Minuten: Die Anzahlung verfällt.</li>
              <li>Eine Rückerstattung ist ausgeschlossen.</li>
            </ul>
          </div>
        </>
      ),
    },
    {
      q: "Was erwartet mich in einer Session?",
      a: (
        <>
          <p className="mb-4">
            Wir beginnen mit einem echten Gespräch. Ich will verstehen, was dich bewegt, was dir Angst macht, was du erleben möchtest – und was du auf keinen Fall willst. Gesundheitliche Einschränkungen sprechen wir genauso an. Erst wenn ich dich ein Stück weit spüre, geht es weiter.
          </p>
          <p className="mb-4">
            Danach zahlst du den Resttribut, und ich bringe dich ins Bad, damit du dich frisch machen und ankommen kannst. Dann beginnt der eigentliche Teil – geführt, intuitiv und ganz auf dich abgestimmt.
          </p>
          <p className="mb-4">
            Ich arbeite nicht nach einem festen Skript. Ich lese dich, reagiere feinfühlig und führe dich dorthin, wo es spannend wird. Was genau passiert, verrate ich nicht vorab. Das Loslassen der Kontrolle ist Teil des Erlebnisses.
          </p>
          <p>
            Nach der Session bleibt Zeit für Nachklang. Wenn du möchtest, darfst du noch eine Weile bei dir ankommen – mit oder ohne Worte. Ich bringe dich zurück, bevor ich dich gehen lasse.
          </p>
        </>
      ),
    },
    {
      q: "Wie wird Diskretion gewährleistet?",
      a: "Was zwischen uns bleibt, bleibt zwischen uns. Alle Daten und Nachrichten, die du mir anvertraust, behandle ich vertraulich. Sie dienen ausschließlich der Terminabsprache und werden niemals weitergegeben.",
    },
    {
      q: "Bin ich als Anfänger willkommen?",
      a: "Ja, auch ohne Erfahrung bist du herzlich willkommen. Du brauchst kein Vorwissen und musst nichts funktionieren. Wichtig ist, dass du offen kommunizierst und dich nicht verstellst. Ich gehe behutsam vor und orientiere mich an deinem Tempo.",
    },
    {
      q: "Wer ist bei mir richtig?",
      a: (
        <>
          <p className="mb-4">
            Das merkst du am besten, indem du dich ein wenig mit meiner Welt beschäftigst. Auf{" "}
            <a href="https://www.bestfans.com/herzblutmadl" target="_blank" rel="noreferrer" className="text-champagne hover:underline">BestFans</a>,{" "}
            <a href="https://www.clips4sale.com/de/studio/468501/lady-vanillaice" target="_blank" rel="noreferrer" className="text-champagne hover:underline">Clip4Sale</a>,{" "}
            <a href="https://herzblutmadl-2.myshopify.com/collections" target="_blank" rel="noreferrer" className="text-champagne hover:underline">meinem Onlineshop</a>{" "}
            und meinen Socials bekommst du einen ehrlichen, ungefilterten Eindruck von mir. Wenn du dich darin wiedererkennst, ist das ein gutes Zeichen.
          </p>
          <p className="mb-4">
            Vorerfahrung spielt keine Rolle. Wichtiger sind Mut, Ehrlichkeit und die Bereitschaft, dich nicht zu verstecken. Erzähle mir deine Fantasien – gemeinsam schauen wir, ob wir daraus etwas Echtes machen können.
          </p>
          <p>
            Ob die Chemie stimmt, lässt sich nicht an einer Liste von Vorlieben ablesen. Das zeigt sich erst, wenn wir uns begegnen.
          </p>
        </>
      ),
    },
    {
      q: "Wie weit im Voraus sollte ich buchen?",
      a: "Je früher, desto besser. Mehrere Tage im Voraus geben uns Zeit für ein gutes Vorgespräch und eine sorgfältige Vorbereitung. Kurzfristige Termine sind manchmal möglich, aber nicht garantiert.",
    },
    {
      q: "Wie kann ich dich Online erleben?",
      a: (
        <>
          <p className="mb-4">
            Wenn du mich vorab oder auch zwischendurch erleben möchtest, findest du mich auf{" "}
            <a href="https://www.bestfans.com/herzblutmadl" target="_blank" rel="noreferrer" className="text-champagne hover:underline">BestFans</a>,{" "}
            <a href="https://www.clips4sale.com/de/studio/468501/lady-vanillaice" target="_blank" rel="noreferrer" className="text-champagne hover:underline">Clip4Sale</a>{" "}
            und in <a href="https://herzblutmadl-2.myshopify.com/collections" target="_blank" rel="noreferrer" className="text-champagne hover:underline">meinem Onlineshop</a>. Dort gibt es Einblicke in meine Sessions – von Auspeitschen und CBT bis hin zu Tease & Denial.
          </p>
          <p className="mb-4">
            Auf <a href="https://www.bestfans.com/herzblutmadl" target="_blank" rel="noreferrer" className="text-champagne hover:underline">BestFans</a> zeige ich außerdem eine Seite von mir, die ich nur Online teile: meine devote Seite. In echten Sessions bleibe ich die Lady, die dich führt.
          </p>
          <p>
            Chatten führe ich ausschließlich über <a href="https://www.bestfans.com/herzblutmadl" target="_blank" rel="noreferrer" className="text-champagne hover:underline">BestFans</a>. Telegram und E-Mail sind für Buchungen und Terminabsprachen reserviert – nicht für dein Kopfkino.
          </p>
        </>
      ),
    },
    {
      q: "Werden meine Daten gespeichert?",
      a: (
        <>
          <p className="mb-4">
            Ich speichere nur das, was für die Terminabsprache nötig ist – und auch das nur so lange, wie es wirklich gebraucht wird.
          </p>
          <p>
            Details dazu findest du in der <Link to="/datenschutz" className="text-champagne hover:underline">Datenschutzerklärung</Link>.
          </p>
        </>
      ),
    },
  ];
}

function GiftCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="border border-champagne/15 bg-card p-5 md:p-6">
      <h3 className="font-display text-2xl text-champagne mb-3">{title}</h3>
      <div className="text-sm text-vanilla/70 leading-relaxed">{children}</div>
    </article>
  );
}

function GiftGuideContent() {
  const tr = useTr();

  return (
    <div>
      <p className="text-sm text-vanilla/65 leading-relaxed max-w-2xl mb-6">
        {tr(
          "Wenn du mir gern etwas schenken möchtest, findest du hier ein paar Denkanstöße. Ich freue mich über liebevoll ausgesuchte Aufmerksamkeiten — die Liste ist Inspiration, keine Erwartung.",
          "If you would like to give me something, here are a few ideas. I appreciate thoughtful gifts — this list is inspiration, never an expectation."
        )}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <GiftCard title={tr("Herzhaftes", "Savory")}>
          <p>
            {tr(
              "Bei Pizza liebe ich besonders Schinken, Sahne, Zwiebel und Ei — oder Sahne mit Garnelen. Sushi mag ich ebenfalls sehr gern, vor allem Maki mit Avocado oder Sushi mit Garnelen oder Lachs. Auch eine Crunchy Chicken Bowl oder eine Käsebrezel vom Bäcker machen mich glücklich. Champignons mag ich gar nicht; bei Meeresfrüchten bin ich wählerisch — Garnelen mag ich aber auf Pizza und im Sushi.",
              "My favorite pizzas have ham, cream, onion and egg, or cream and shrimp. I also love sushi, especially avocado maki or sushi with shrimp or salmon. A crunchy chicken bowl or a cheese pretzel from the bakery makes me happy too. I don't like mushrooms and am selective about seafood — shrimp are an exception I enjoy on pizza and in sushi."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Süßes", "Something sweet")}>
          <p>
            {tr(
              "Kinderschokolade liebe ich abgöttisch — ich könnte mich darin hineinlegen. Ein Ü-Ei erinnert mich immer an meine Kindheit. Knusper Puffreis mag ich ebenfalls sehr gern, und eine Zimtschnecke vom Bäcker geht auch immer. Ich weiß, meine Mischung ist vielleicht etwas verrückt — aber wir sind doch alle ein bisschen verrückt.",
              "I absolutely adore Kinderschokolade — I could happily live in it. A Kinder Surprise egg always reminds me of my childhood. I also love crunchy puffed rice and a cinnamon roll from the bakery. Maybe my tastes are a little quirky — but we're all a little crazy."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Getränke", "Drinks")}>
          <p>
            {tr(
              "Alkoholfrei freue ich mich über Coca-Cola Zero — am liebsten im Glas — und über Matcha mit Hafermilch.",
              "For drinks, I love Coca-Cola Zero in a glass and matcha with oat milk."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Kleidung", "Clothing")}>
          <p className="mb-3">
            {tr(
              "Mit Kleidung kannst du mir aktuell wohl die größte Freude machen. Ich liebe Dessous, Kleider und Latex und bin noch am Anfang, mir eine schöne Auswahl aufzubauen. Meine Größen: Kleidergröße 36 und BH-Größe 70D.",
              "Clothing might be the loveliest gift for me right now. I love lingerie, dresses and latex, and I'm still at the beginning of building a collection I adore. My sizes: EU 36 in clothing and 70D bra."
            )}
          </p>
          <p>
            {tr("Bei ", "At ")}
            <a href="https://myholydesire.com" target="_blank" rel="noreferrer" className="text-champagne hover:underline">
              My Holy Desire
            </a>
            {tr(
              " in München findest du schöne Ideen. Dort berät dich Ella diskret und mit Stil; auch online gibt es eine passende Auswahl.",
              " in Munich you'll find lovely ideas. Ella offers discreet, stylish advice, and there's a suitable selection online too."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Schuhe", "Shoes")}>
          <p>
            {tr(
              "Ich habe einen wahnsinnigen Schuhtick und liebe Pleaser jeglicher Art. Schuhgröße 39.",
              "I have a serious shoe obsession and love all kinds of Pleasers. Shoe size EU 39."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Parfüm", "Perfume")}>
          <p>
            {tr(
              "Parfüms finde ich wahnsinnig toll — hier kannst du mich sehr gern überraschen.",
              "I love perfume, so feel free to surprise me with a scent you think I'll enjoy."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Schmuck", "Jewelry")}>
          <p>
            {tr(
              "Goldene Ketten und Armbänder liebe ich sehr. Besonders gern mag ich verstellbare, offene Ringe, die ich selbst anpassen kann.",
              "I love gold necklaces and bracelets. I especially like adjustable, open rings that I can size myself."
            )}
          </p>
        </GiftCard>
      </div>
    </div>
  );
}

function FAQCategoryPanel({
  id,
  number,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `faq-panel-${id}`;

  return (
    <section
      id={id}
      className={`scroll-mt-28 border transition-colors duration-300 ${
        open ? "border-champagne/40 bg-card shadow-[0_18px_48px_rgba(0,0,0,0.2)]" : "border-champagne/15 bg-card/40"
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-5 px-5 py-5 md:px-7 md:py-6 text-left group"
      >
        <span className="flex min-w-0 items-center gap-4 md:gap-6">
          <span aria-hidden="true" className="font-display text-3xl md:text-4xl text-champagne/65 tabular-nums">
            {number}
          </span>
          <span className="min-w-0">
            <span className="block font-display text-2xl md:text-3xl text-vanilla group-hover:text-champagne transition-colors">
              {title}
            </span>
            <span className="mt-1 block text-xs md:text-sm text-vanilla/55">
              {subtitle}
            </span>
          </span>
        </span>
        <span className="shrink-0 w-10 h-10 border border-champagne/30 flex items-center justify-center text-champagne">
          {open ? <Minus size={15} /> : <Plus size={15} />}
        </span>
      </button>

      <div
        id={panelId}
        className={`grid transition-all duration-500 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-6 md:px-7 md:pb-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

function FAQQuestion({
  id,
  item,
  open,
  onToggle,
}: {
  id: string;
  item: { q: string; a: ReactNode };
  open: boolean;
  onToggle: () => void;
}) {
  const answerId = `answer-${id}`;

  return (
    <div className="border-b border-champagne/10 last:border-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-5 py-5 text-left group"
      >
        <span className={`font-display text-xl md:text-2xl transition-colors ${open ? "text-champagne" : "text-vanilla group-hover:text-champagne"}`}>
          {item.q}
        </span>
        <span className="shrink-0 w-8 h-8 border border-champagne/20 flex items-center justify-center text-champagne">
          {open ? <Minus size={13} /> : <Plus size={13} />}
        </span>
      </button>
      <div
        id={answerId}
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {typeof item.a === "string" ? (
            <p className="text-sm text-vanilla/70 leading-relaxed max-w-2xl">{item.a}</p>
          ) : (
            <div className="text-sm text-vanilla/70 leading-relaxed max-w-2xl">{item.a}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function FAQ() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const tr = useTr();
  const faqs = useFaqs();

  useEffect(() => {
    if (window.location.hash !== "#geschenke-wuensche") return;
    setOpenCategory("geschenke-wuensche");
    requestAnimationFrame(() => {
      document.getElementById("geschenke-wuensche")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const at = (indexes: number[]) =>
    indexes.flatMap((index) => (faqs[index] ? [faqs[index]] : []));
  const categories = [
    {
      id: "geschenke-wuensche",
      number: "01",
      title: tr("Geschenke & Wünsche", "Gifts & Wishes"),
      subtitle: tr("Persönliche Denkanstöße — von herzhaft bis goldfarben.", "Personal ideas, from savory treats to golden details."),
      indexes: [] as number[],
      gifts: true,
    },
    {
      id: "booking",
      number: "02",
      title: tr("Buchung & Termin", "Booking & Appointments"),
      subtitle: tr("Anfrage, Terminfindung und Zahlung.", "Enquiries, scheduling and payment."),
      indexes: [0, 1, 6],
      gifts: false,
    },
    {
      id: "session",
      number: "03",
      title: tr("Session & Vertrauen", "Sessions & Trust"),
      subtitle: tr("Ablauf, Grenzen und ein gutes Gefühl.", "What to expect, boundaries and feeling at ease."),
      indexes: [2, 3, 4, 5],
      gifts: false,
    },
    {
      id: "online",
      number: "04",
      title: tr("Online & Privatsphäre", "Online & Privacy"),
      subtitle: tr("Online-Angebote und der Umgang mit deinen Daten.", "Online content and how your data is handled."),
      indexes: [7, 8],
      gifts: false,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={tr("Häufige Fragen", "FAQ")}
        title={
          <>
            {tr("Antworten ", "Answers ")}
            <em className="font-script gold-text not-italic">{tr("auf einen Blick", "at a glance")}</em>
          </>
        }
        intro={tr(
          "Etwas ist nicht dabei? Schreib mir gern persönlich.",
          "Something missing? Feel free to write to me personally."
        )}
      />

      <section className="py-16 md:py-24">
        <div className="container-luxe max-w-3xl space-y-4">
          {categories.map((category) => {
            const isCategoryOpen = openCategory === category.id;
            const items = at(category.indexes);

            return (
              <FAQCategoryPanel
                key={category.id}
                id={category.id}
                number={category.number}
                title={category.title}
                subtitle={category.subtitle}
                open={isCategoryOpen}
                onToggle={() => setOpenCategory(isCategoryOpen ? null : category.id)}
              >
                {category.gifts ? (
                  <GiftGuideContent />
                ) : (
                  <div className="border-t border-champagne/15">
                    {items.map((item, index) => {
                      const questionId = `${category.id}-${index}`;
                      return (
                        <FAQQuestion
                          key={item.q}
                          id={questionId}
                          item={item}
                          open={openQuestion === questionId}
                          onToggle={() => setOpenQuestion(openQuestion === questionId ? null : questionId)}
                        />
                      );
                    })}
                  </div>
                )}
              </FAQCategoryPanel>
            );
          })}

          <div className="pt-8 text-center">
            <Link to="/kontakt" className="btn-outline-gold">
              {tr("Persönlich fragen", "Ask personally")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
