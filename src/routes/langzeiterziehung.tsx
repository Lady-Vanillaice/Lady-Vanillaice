import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageHeader } from "../components/site/PageHeader";
import { useTr } from "@/i18n";

const WHATSAPP_LINK = "https://wa.me/4915170568230";

export const Route = createFileRoute("/langzeiterziehung")({
  head: () => ({
    meta: [
      { title: "Langzeiterziehung — Lady Vanilla Ice" },
      { name: "description", content: "Langzeiterziehung bei Lady Vanilla Ice: tägliche Meldungen, Aufgaben mit Nachweis und Cam-Sessions. Drei Stufen: Basis, Intensiv und Premium." },
      { property: "og:title", content: "Langzeiterziehung — Lady Vanilla Ice" },
      { property: "og:description", content: "Erziehung über Wochen und Monate: Aufgaben, Regeln, Kontrolle. Basis, Intensiv oder Premium." },
      { property: "og:url", content: "https://lady-vanillaice.com/langzeiterziehung" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/langzeiterziehung" }],
  }),
  component: LangzeiterziehungPage,
});

function LangzeiterziehungPage() {
  const tr = useTr();

  const faster = tr("Du bekommst schneller eine Antwort von mir", "You get faster replies from me");
  const punished = tr("Ungehorsam wird bestraft", "Disobedience is punished");
  const twiceDaily = tr("Du meldest dich morgens und abends bei mir", "You report to me every morning and evening");

  const packages = [
    {
      name: "Basis",
      price: "300 €",
      highlight: false,
      items: [
        tr("Du meldest dich jeden Tag einmal schriftlich bei mir", "You report to me in writing once a day"),
        tr("Jede Woche bekommst du eine neue Aufgabe", "You get a new task every week"),
        tr("Ich antworte innerhalb von 24 Stunden", "I reply within 24 hours"),
      ],
    },
    {
      name: "Intensiv",
      price: "500 €",
      highlight: false,
      items: [
        twiceDaily,
        tr("Du bekommst 3 Aufgaben pro Woche, die du mit Fotos nachweist", "You get 3 tasks per week, proven with photos"),
        punished,
        faster,
      ],
    },
    {
      name: "Premium",
      price: "750 €",
      highlight: true,
      items: [
        twiceDaily,
        tr("Du bekommst 5 Aufgaben pro Woche, die du mit Fotos nachweist", "You get 5 tasks per week, proven with photos"),
        punished,
        faster,
        tr("Dazu eine Cam-Session im Monat", "Plus one cam session per month"),
      ],
    },
  ];

  const rules = [
    tr("Bezahlt wird immer im Voraus. Ohne Zahlung keine Erziehung.", "Payment is always in advance. No payment, no training."),
    tr("Bevor wir starten, besprechen wir deine Tabus, deine Grenzen und dein Safeword.", "Before we start, we discuss your limits, your boundaries and your safeword."),
    tr("Wann ich antworte, bestimme ich. Du wartest geduldig.", "I decide when I reply. You wait patiently."),
  ];

  return (
    <>
      <PageHeader
        eyebrow={tr("Erziehung über Wochen und Monate", "Training over weeks and months")}
        title={
          <>
            {tr("Langzeit", "Long-term ")}
            <em className="font-script gold-text not-italic">{tr("erziehung", "training")}</em>
          </>
        }
        intro={tr(
          "Du möchtest also von mir erzogen werden. Gut. Dann hör jetzt genau zu, denn so läuft das bei mir: Du meldest dich regelmäßig, erledigst meine Aufgaben und weist sie nach. Ich kontrolliere, lobe und bestrafe.",
          "So you want to be trained by me. Good. Then listen carefully, because this is how it works with me: you report to me regularly, complete my tasks and prove them. I control, praise and punish.",
        )}
      />

      <section className="py-16">
        <div className="container-luxe max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`flex flex-col border bg-card p-8 ${pkg.highlight ? "border-champagne/60" : "border-champagne/20"}`}
              >
                <div className="eyebrow mb-3">{pkg.highlight ? tr("Die volle Kontrolle", "Full control") : tr("Stufe", "Level")}</div>
                <h2 className="font-display text-3xl text-vanilla">{pkg.name}</h2>
                <div className="mt-3 mb-6">
                  <span className="font-display text-4xl gold-text">{pkg.price}</span>
                  <span className="text-sm text-vanilla/60"> {tr("im Monat", "per month")}</span>
                </div>
                <ul className="space-y-3">
                  {pkg.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-vanilla/75">
                      <Check size={16} className="mt-0.5 shrink-0 text-champagne" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-vanilla/70">
            {tr("Weitere Cam-Sessions: 50 € pro Session (5–10 Minuten).", "Additional cam sessions: €50 per session (5–10 minutes).")}
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-luxe max-w-2xl">
          <div className="border border-champagne/25 bg-card p-6 md:p-10">
            <div className="eyebrow mb-2">{tr("Meine Regeln", "My rules")}</div>
            <ul className="space-y-3 mb-8">
              {rules.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm leading-relaxed text-vanilla/80">
                  <Check size={16} className="mt-0.5 shrink-0 text-champagne" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed text-vanilla/65 mb-6">
              {tr(
                "Überleg dir gut, wie ernst du es meinst. Dann schreib mir, für welche Stufe du dich entscheidest.",
                "Think carefully about how serious you are. Then write to me and tell me which level you choose.",
              )}
            </p>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="btn-gold w-full justify-center">
              {tr("Per WhatsApp bewerben", "Apply via WhatsApp")}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
