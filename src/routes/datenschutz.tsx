import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { LegalGermanOnlyNotice } from "../components/site/LegalGermanOnlyNotice";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutzerklärung — Lady Vanilla Ice" },
      { name: "description", content: "Datenschutzerklärung von Lady Vanilla Ice — Vertraulichkeit, Diskretion und DSGVO-konforme Datenverarbeitung." },
      { property: "og:url", content: "https://lady-vanillaice.com/datenschutz" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/datenschutz" }],
  }),
  component: Datenschutz,
});

function Datenschutz() {
  return (
    <>
      <PageHeader eyebrow="Datenschutz" title="Datenschutzerklärung" />
      <LegalGermanOnlyNotice />
      <section className="py-20">
        <div className="container-luxe max-w-3xl prose-luxe space-y-10 text-vanilla/75 leading-relaxed">
          <p>
            Vertraulichkeit und Diskretion haben für mich höchste Priorität. Ich nehme
            den Schutz deiner persönlichen Daten sehr ernst. Diese Datenschutzerklärung
            erklärt dir, welche Daten ich erhebe, wie ich sie verarbeite und welche Rechte
            du hast.
          </p>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">1. Verantwortliche Stelle</h2>
            <p>
              Verantwortlich für die Verarbeitung deiner Daten bin ich:
            </p>
            <p className="mt-2">
              <strong className="text-vanilla">Lady_VanillaIce / Selina Gorgosch</strong>
            </p>
            <p className="mt-1">
              E-Mail:{" "}
              <a href="mailto:Lady-vanillaice@gmx.net" className="hover:text-champagne transition">
                Lady-vanillaice@gmx.net
              </a>
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">2. Allgemeine Grundsätze</h2>
            <p>
              Alle Anfragen und Gespräche werden streng vertraulich behandelt. Ich verarbeite
              deine Daten ausschließlich nach den Vorgaben der Datenschutz-Grundverordnung
              (DSGVO) und des Bundesdatenschutzgesetzes (BDSG). Ich gebe keine personenbezogenen
              Daten an Dritte weiter – weder an Werbepartner, Dienstleister noch sonstige Personen.
              Dies gilt besonders für sensible Angaben zu deinen Wünschen, Fantasien und Tabus.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">3. Erhobene Daten</h2>
            <p>
              Ich erhebe nur die Daten, die für eine Terminvereinbarung und die Vorbereitung
              unserer Session notwendig sind:
            </p>
            <ul className="list-disc list-outside pl-5 mt-3 space-y-2 marker:text-champagne">
              <li>Name oder gewünschtes Pseudonym</li>
              <li>E-Mail-Adresse (ggf. Telefonnummer, falls du sie angibst)</li>
              <li>Gewünschter Termin oder Zeitraum</li>
              <li>Deine Angaben zu Wünschen, Fantasien, Vorlieben und Tabus (per E-Mail oder im Vorgespräch)</li>
              <li>Technische Daten wie IP-Adresse und Zeitpunkt der Kontaktaufnahme (automatisch bei E-Mail oder Website-Besuch)</li>
            </ul>
            <p className="mt-3">Weitere Daten erhebe ich nicht.</p>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">4. Zweck der Verarbeitung</h2>
            <p>Deine Daten verwende ich ausschließlich für:</p>
            <ul className="list-disc list-outside pl-5 mt-3 space-y-2 marker:text-champagne">
              <li>Die Beantwortung deiner Anfrage</li>
              <li>Die Vereinbarung und Vorbereitung eines Termins</li>
              <li>Die Umsetzung deiner Wünsche und die Einhaltung deiner Grenzen in der Session</li>
              <li>Die Nachbereitung (falls nötig)</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">5. Speicherdauer</h2>
            <ul className="list-disc list-outside pl-5 space-y-2 marker:text-champagne">
              <li>Anfragen ohne Termin: werden spätestens 3 Monate nach der letzten Kommunikation gelöscht.</li>
              <li>Bei gebuchtem Termin: werden die Daten maximal 6 Monate nach dem Termin aufbewahrt und danach vollständig gelöscht.</li>
              <li>Automatische technische Daten (z. B. Logfiles) lösche ich nach maximal 30 Tagen.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">6. Weitergabe von Daten</h2>
            <p>
              Es gibt keine Weitergabe an Dritte. Ich nutze keine externen Buchungstools,
              CRM-Systeme oder Cloud-Dienste für sensible Inhalte. Die gesamte Kommunikation
              läuft ausschließlich über meine eigene E-Mail-Adresse.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">7. Social Media</h2>
            <p>Ich bin auf Plattformen wie X/Twitter, Instagram oder FetLife aktiv.</p>
            <ul className="list-disc list-outside pl-5 mt-3 space-y-2 marker:text-champagne">
              <li>Wenn du mir über Social Media schreibst, gelten zusätzlich die Datenschutzregeln der jeweiligen Plattform.</li>
              <li>Ich erhalte nur die Daten, die du mir freiwillig sendest (z. B. dein Profilname und deine Nachricht).</li>
              <li>Auf meiner Website sind keine Social-Media-Plugins (Like-Buttons etc.) eingebunden.</li>
              <li>Termin-Anfragen über Social Media werden genauso vertraulich behandelt wie E-Mail-Anfragen.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">8. Deine Rechte</h2>
            <p>Du hast jederzeit folgende Rechte (kostenlos):</p>
            <ul className="list-disc list-outside pl-5 mt-3 space-y-2 marker:text-champagne">
              <li>Auskunft, welche Daten ich von dir gespeichert habe</li>
              <li>Berichtigung falscher Daten</li>
              <li>Löschung deiner Daten</li>
              <li>Einschränkung der Verarbeitung</li>
              <li>Widerspruch gegen die Verarbeitung</li>
            </ul>
            <p className="mt-3">
              Schicke mir dafür einfach eine formlose E-Mail an die oben genannte Adresse. Ich
              bearbeite dein Anliegen schnellstmöglich.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">9. Datensicherheit</h2>
            <p>
              Ich schütze deine Daten durch angemessene Maßnahmen (sichere Passwörter,
              verschlüsselte Kommunikation wo möglich, regelmäßige Überprüfungen).
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl gold-text mb-4">10. Änderungen dieser Erklärung</h2>
            <p>
              Ich behalte mir vor, diese Datenschutzerklärung bei Bedarf zu aktualisieren.
              Die aktuelle Version findest du immer auf dieser Seite.
            </p>
          </div>

          <p className="text-sm text-vanilla/50 pt-6 border-t border-champagne/15">
            Diese Datenschutzerklärung wurde auf Grundlage der von mir angegebenen
            Praktiken erstellt. Bei Fragen oder Anliegen wende dich bitte direkt an die oben
            genannte E-Mail-Adresse.
          </p>
        </div>
      </section>
    </>
  );
}
