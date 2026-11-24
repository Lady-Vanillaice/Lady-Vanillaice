import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Eye, Video } from "lucide-react";
import { PageHeader } from "../components/site/PageHeader";
import { useTr } from "@/i18n";
import { joinCamInterest } from "@/lib/cam-interest.functions";

export const Route = createFileRoute("/cam")({
  head: () => ({
    meta: [
      { title: "Cam-Sessions — Lady Vanilla Ice" },
      { name: "description", content: "Online-Erziehung per Cam mit Lady Vanilla Ice. Trage dich ein und erfahre als Erster, wenn wieder Cam-Sessions frei sind." },
      { property: "og:title", content: "Cam-Sessions — Lady Vanilla Ice" },
      { property: "og:description", content: "Online-Erziehung per Cam. Trage dich in die Interessentenliste ein." },
      { property: "og:url", content: "https://lady-vanillaice.com/cam" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/cam" }],
  }),
  component: CamPage,
});

function CamPage() {
  const tr = useTr();
  const join = useServerFn(joinCamInterest);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setErrorMsg("");
    try {
      const result = await join({
        data: {
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          email: String(form.get("email") ?? "") || null,
          telegram: String(form.get("telegram") ?? "") || null,
          message: String(form.get("message") ?? "") || null,
          consent: form.get("consent") === "on",
          website: String(form.get("website") ?? "") || null,
        },
      });
      setAlreadyRegistered(Boolean(result.alreadyRegistered));
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        tr(
          "Das hat leider nicht geklappt. Bitte prüfe deine Angaben (Name, Telefonnummer, Häkchen) und versuche es erneut.",
          "That didn't work. Please check your details (name, phone number, checkbox) and try again.",
        ),
      );
      console.error(err);
    }
  }

  const points = [
    {
      icon: Video,
      title: tr("Erziehung per Cam", "Training via cam"),
      text: tr(
        "In einer Cam-Session erziehe ich dich online – live und persönlich, egal wo du gerade bist. Ich gebe dir Anweisungen, du gehorchst, und ich sehe genau, ob du es richtig machst.",
        "In a cam session I train you online – live and personal, wherever you are. I give you instructions, you obey, and I see exactly whether you do it right.",
      ),
    },
    {
      icon: Eye,
      title: tr("Unter meiner Kontrolle", "Under my control"),
      text: tr(
        "Ob Aufgaben, Regeln oder Gehorsamstraining: Ich führe dich Schritt für Schritt. Vorlieben und Tabus besprechen wir vorher, damit die Session zu dir passt.",
        "Whether tasks, rules or obedience training: I guide you step by step. We discuss preferences and limits beforehand so the session suits you.",
      ),
    },
    {
      icon: BellRing,
      title: tr("Nicht immer verfügbar", "Not always available"),
      text: tr(
        "Cam-Sessions biete ich nur zu bestimmten Zeiten an. Trag dich unten ein – dann weiß ich, dass du Interesse hast, und gebe dir Bescheid, sobald ich wieder Cam-Sessions anbiete.",
        "I only offer cam sessions at certain times. Sign up below – then I know you're interested and I'll let you know as soon as I offer cam sessions again.",
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={tr("Online-Erziehung", "Online training")}
        title={
          <>
            {tr("Cam-", "Cam ")}
            <em className="font-script gold-text not-italic">{tr("Sessions", "sessions")}</em>
          </>
        }
        intro={tr(
          "Du willst von mir erzogen werden, aber nicht persönlich ins Studio kommen? Dann ist eine Cam-Session genau das Richtige für dich.",
          "You want to be trained by me but can't come to the studio in person? Then a cam session is exactly right for you.",
        )}
      />

      <section className="py-16">
        <div className="container-luxe max-w-5xl">
          <div className="grid gap-px bg-champagne/20 border border-champagne/20 md:grid-cols-3">
            {points.map((point) => (
              <div key={point.title} className="bg-background p-8">
                <point.icon className="text-champagne mb-5" size={26} strokeWidth={1.3} />
                <h2 className="font-display text-2xl text-vanilla mb-3">{point.title}</h2>
                <p className="text-sm leading-relaxed text-vanilla/70">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container-luxe max-w-2xl">
          <div className="border border-champagne/40 bg-card p-6 md:p-10 text-center">
            <div className="eyebrow mb-2">{tr("Tribut", "Tribute")}</div>
            <h2 className="font-display text-3xl text-vanilla mb-4">{tr("Meine Preise", "My prices")}</h2>
            <p className="text-sm leading-relaxed text-vanilla/75 mb-6">
              {tr(
                "Meine Zeit ist kostbar. Du entscheidest, wie lange du vor mir knien darfst – und du zahlst für jede Minute.",
                "My time is precious. You decide how long you may kneel before me – and you pay for every minute.",
              )}
            </p>
            <ul className="mx-auto max-w-xs divide-y divide-champagne/15 text-left">
              {[
                [tr("5–10 Minuten", "5–10 minutes"), "50 €"],
                [tr("15 Minuten", "15 minutes"), "75 €"],
                [tr("30 Minuten", "30 minutes"), "150 €"],
                [tr("45 Minuten", "45 minutes"), "225 €"],
                [tr("60 Minuten", "60 minutes"), "300 €"],
              ].map(([time, price]) => (
                <li key={time} className="flex justify-between py-2 text-sm text-vanilla/85">
                  <span>{time}</span>
                  <span className="gold-text font-display text-base">{price}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-vanilla/55">
              {tr("Bezahlt wird vor der Session.", "Payment is due before the session.")}
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-luxe max-w-2xl">
          <div className="border border-champagne/25 bg-card p-6 md:p-10">
            <div className="eyebrow mb-2">{tr("Interessentenliste", "Interest list")}</div>
            <h2 className="font-display text-3xl text-vanilla mb-3">
              {tr("Ich will eine Cam-Session", "I want a cam session")}
            </h2>
            <p className="text-sm leading-relaxed text-vanilla/65 mb-8">
              {tr(
                "Füll das Formular aus. Du gehst damit keine Verpflichtung ein – ich rufe dich an, sobald ich wieder Cam-Sessions anbiete.",
                "Fill in the form. There's no obligation – I'll call you as soon as I offer cam sessions again.",
              )}
            </p>

            {status === "done" ? (
              <div className="border border-champagne/40 bg-champagne/[0.06] p-5 text-sm leading-relaxed text-vanilla/85">
                {alreadyRegistered
                  ? tr(
                      "Du stehst schon auf meiner Liste – deine Angaben habe ich aktualisiert. Ich melde mich, sobald es wieder Cam-Sessions gibt.",
                      "You're already on my list – I've updated your details. I'll get in touch once cam sessions are available again.",
                    )
                  : tr(
                      "Danke! Du stehst jetzt auf meiner Liste. Ich melde mich bei dir, sobald ich wieder Cam-Sessions anbiete.",
                      "Thank you! You're now on my list. I'll get in touch as soon as I offer cam sessions again.",
                    )}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="eyebrow block mb-2">{tr("Name oder Pseudonym", "Name or pseudonym")}</label>
                    <input name="name" required minLength={2} maxLength={100} className="input-luxe" placeholder={tr("Wie darf ich dich nennen?", "What should I call you?")} />
                  </div>
                  <div>
                    <label className="eyebrow block mb-2">{tr("Telefonnummer", "Phone number")}</label>
                    <input name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" className="input-luxe" placeholder="+49 …" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="eyebrow block mb-2">{tr("E-Mail-Adresse (optional)", "Email address (optional)")}</label>
                    <input name="email" type="email" maxLength={200} className="input-luxe" placeholder={tr("deine@email.de", "you@email.com")} />
                  </div>
                  <div>
                    <label className="eyebrow block mb-2">{tr("Telegram (optional)", "Telegram (optional)")}</label>
                    <input name="telegram" maxLength={100} className="input-luxe" placeholder="@dein_name" />
                  </div>
                </div>
                <div>
                  <label className="eyebrow block mb-2">{tr("Was wünschst du dir? (optional)", "What are you looking for? (optional)")}</label>
                  <textarea name="message" rows={4} maxLength={1000} className="input-luxe" placeholder={tr("Erfahrung, Vorlieben, Tabus, wann du gut kannst …", "Experience, preferences, limits, when you're available …")} />
                </div>
                <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                <label className="flex items-start gap-3 text-xs leading-relaxed text-vanilla/70 cursor-pointer">
                  <input name="consent" type="checkbox" required className="mt-0.5 accent-[var(--color-champagne)]" />
                  <span>
                    {tr(
                      "Ich bin einverstanden, dass Lady Vanilla Ice meine Angaben speichert und mich kontaktiert, wenn es wieder Cam-Sessions gibt. Mehr dazu in der ",
                      "I agree that Lady Vanilla Ice stores my details and contacts me when cam sessions are available again. More in the ",
                    )}
                    <Link to="/datenschutz" className="underline hover:text-champagne">{tr("Datenschutzerklärung", "privacy policy")}</Link>.
                  </span>
                </label>
                {status === "error" && <p className="text-sm text-bordeaux">{errorMsg}</p>}
                <button type="submit" disabled={status === "sending"} className="btn-gold w-full justify-center">
                  {status === "sending" ? tr("Wird gesendet …", "Sending …") : tr("Auf die Liste setzen", "Put me on the list")}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
