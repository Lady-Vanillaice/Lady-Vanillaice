import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "../components/site/PageHeader";
import { Crown, Users } from "lucide-react";
import { submitDuoBooking } from "@/lib/duo-booking.functions";
import duoImage from "@/assets/duo.jpg.asset.json";
import duoImage2 from "@/assets/duo2.jpg.asset.json";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/duo-sessions")({
  head: () => ({
    meta: [
      { title: "Duo Sessions — Lady Vanilla Ice" },
      { name: "description", content: "Buche eine exklusive Duo Session mit zwei Dominas — diskret, intensiv und individuell." },
      { property: "og:title", content: "Duo Sessions — Lady Vanilla Ice" },
      { property: "og:description", content: "Zwei Dominas, eine unvergessliche Session — direkt online anfragen." },
      { property: "og:image", content: duoImage.url },
      { property: "og:url", content: "https://lady-vanillaice.com/duo-sessions" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/duo-sessions" }],
  }),
  component: DuoSessions,
});

function DuoSessions() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const submit = useServerFn(submitDuoBooking);
  const tr = useTr();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree || status === "sending") return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const date = String(form.get("date") ?? "").trim();
    const duration = String(form.get("duration") ?? "").trim();
    const wishes = String(form.get("message") ?? "").trim();

    setStatus("sending");
    setErrorMsg(null);
    try {
      await submit({
        data: {
          guest_name: name,
          guest_email: email,
          requested_start: date,
          duration: duration || null,
          message: `Telefon: ${phone}\n\n${wishes}`,
          age_confirmed: true,
        },
      });
      setStatus("sent");
      (e.target as HTMLFormElement).reset();
      setAgree(false);
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : tr(
              "Anfrage konnte nicht gesendet werden. Bitte versuche es später erneut.",
              "Your request could not be sent. Please try again later."
            ),
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Duo Sessions"
        title={
          <>
            {tr("Zwei ", "Two ")}
            <em className="font-script gold-text not-italic">{tr("Dominas", "dominas")}</em>
            {tr(" — eine Session", " — one session")}
          </>
        }
        intro={tr(
          "Eine intensivere Erfahrung. Buche zwei Dominas gleichzeitig — exklusiv, abgestimmt und ganz nach Deinen Wünschen.",
          "A more intense experience. Book two dominas at once — exclusive, coordinated and entirely to your wishes."
        )}
      />

      <section className="py-24">
        <div className="container-luxe max-w-3xl">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <figure className="relative group border-2 border-champagne/30 p-2 bg-anthracite/40 shadow-[0_0_0_1px_rgba(212,180,131,0.15),0_12px_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="relative overflow-hidden border border-champagne/15">
                <img
                  src={duoImage.url}
                  alt="Ruby June x Lady_Vanillaice — Duo Session"
                  width={1280}
                  height={896}
                  loading="lazy"
                  className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-anthracite via-anthracite/80 to-transparent py-4 px-2">
                  <p className="text-center font-script gold-text text-sm md:text-base whitespace-nowrap tracking-wide">
                    Ruby June <span className="text-champagne/70 text-xs md:text-sm mx-1">x</span> Lady_Vanillaice
                  </p>
                </div>
              </div>
            </figure>
            <figure className="relative group border-2 border-champagne/30 p-2 bg-anthracite/40 shadow-[0_0_0_1px_rgba(212,180,131,0.15),0_12px_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="relative overflow-hidden border border-champagne/15">
                <img
                  src={duoImage2.url}
                  alt="Lady_Vanillaice x Jolie Berrie — Duo Session"
                  width={1280}
                  height={1707}
                  loading="lazy"
                  className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-anthracite via-anthracite/80 to-transparent py-4 px-2">
                  <p className="text-center font-script gold-text text-sm md:text-base whitespace-nowrap tracking-wide">
                    Lady_Vanillaice <span className="text-champagne/70 text-xs md:text-sm mx-1">x</span> Jolie Berrie
                  </p>
                </div>
              </div>
            </figure>
          </div>

          <div className="flex items-center gap-3 mb-6 text-champagne">
            <Users size={20} strokeWidth={1.2} />
            <span className="eyebrow">{tr("Nur für Duo-Buchungen", "Duo bookings only")}</span>
          </div>

          <div className="mb-10 border border-champagne/40 bg-champagne/5 p-5 text-sm text-vanilla/80 leading-relaxed">
            <p className="eyebrow mb-2 text-champagne">{tr("Bitte beachten", "Please note")}</p>
            <p>
              {tr(
                <>Duo Sessions biete ich nicht durchgehend an — sie hängt von der Verfügbarkeit der jeweiligen Domina ab. Sobald ein Duo-Termin möglich ist, schalte ich ihn frei und du findest ihn als <em className="text-champagne not-italic">Duo</em> markiert im <a href="/kalender" className="text-champagne hover:underline">Kalender</a>. Hier kannst du dein Interesse mit Wunschzeitraum hinterlegen — ich melde mich, sobald ein passender Duo-Slot frei wird.</>,
                <>I do not offer duo sessions continuously — availability depends on the respective domina. As soon as a duo date is possible, I unlock it and you'll find it marked as <em className="text-champagne not-italic">Duo</em> in the <a href="/kalender" className="text-champagne hover:underline">calendar</a>. Here you can register your interest with a preferred time frame — I'll get in touch as soon as a suitable duo slot opens up.</>
              )}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="eyebrow block mb-2">{tr("Name oder Pseudonym", "Name or pseudonym")}</label>
                <input name="name" required className="input-luxe" placeholder={tr("Wie darf ich Dich nennen?", "What should I call you?")} />
              </div>
              <div>
                <label className="eyebrow block mb-2">{tr("E-Mail-Adresse", "Email address")}</label>
                <input name="email" type="email" required className="input-luxe" placeholder={tr("diskret@beispiel.de", "discreet@example.com")} />
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-2">{tr("Telefonnummer", "Phone number")}</label>
              <input name="phone" type="tel" required className="input-luxe" placeholder="+49 …" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="eyebrow block mb-2">{tr("Wunschzeitraum", "Preferred time frame")}</label>
                <input
                  name="date"
                  type="text"
                  required
                  maxLength={80}
                  className="input-luxe"
                  placeholder={tr("z. B. Ende Juli, Wochenende, ab 18 Uhr…", "e.g. end of July, weekend, from 6pm…")}
                />
                <p className="text-[0.7rem] text-vanilla/50 mt-1.5 leading-relaxed">
                  {tr(
                    "Kein fester Termin nötig — ich melde mich, sobald ein passender Duo-Slot frei wird.",
                    "No fixed date needed — I'll get in touch as soon as a suitable duo slot opens up."
                  )}
                </p>
              </div>
              <div>
                <label className="eyebrow block mb-2">{tr("Dauer der Session", "Session duration")}</label>
                <select name="duration" required className="input-luxe">
                  <option value="">{tr("Bitte wählen…", "Please choose…")}</option>
                  <option>{tr("90 Minuten", "90 minutes")}</option>
                  <option>{tr("120 Minuten", "120 minutes")}</option>
                  <option>{tr("180 Minuten", "180 minutes")}</option>
                  <option>{tr("240 Minuten", "240 minutes")}</option>
                  <option>{tr("300 Minuten", "300 minutes")}</option>
                  <option>{tr("Individuell", "Custom")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-2">{tr("Deine Wünsche für die Duo Session", "Your wishes for the duo session")}</label>
              <textarea
                name="message"
                rows={6}
                required
                className="input-luxe resize-none"
                placeholder={tr(
                  "Erzähle uns, worauf Du Dich freust, welche Spielarten Dich reizen und was Dir wichtig ist…",
                  "Tell us what you're looking forward to, which practices excite you and what matters to you…"
                )}
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-vanilla/70 cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 accent-[var(--color-champagne)]"
                required
              />
              <span>
                {tr(
                  <>Ich bin volljährig (18+) und stimme der vertraulichen Verarbeitung meiner Daten zur Terminvereinbarung gemäß <a href="/datenschutz" className="text-champagne hover:underline">Datenschutzerklärung</a> zu.</>,
                  <>I am 18+ and consent to the confidential processing of my data for appointment scheduling in accordance with the <a href="/datenschutz" className="text-champagne hover:underline">privacy policy</a>.</>
                )}
              </span>
            </label>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-gold w-full md:w-auto"
                disabled={!agree || status === "sending"}
              >
                <Crown size={14} />
                {status === "sending"
                  ? tr("Wird gesendet…", "Sending…")
                  : status === "sent"
                    ? tr("Anfrage erhalten — danke!", "Request received — thank you!")
                    : tr("Duo Session anfragen", "Request duo session")}
              </button>
            </div>

            {status === "sent" ? (
              <p className="text-sm text-champagne leading-relaxed">
                {tr(
                  "Deine Duo-Anfrage ist eingegangen. Du erhältst gleich eine Bestätigung per E-Mail. Wir melden uns persönlich, um die Details abzustimmen.",
                  "Your duo request has been received. You'll get an email confirmation shortly. We'll be in touch personally to arrange the details."
                )}
              </p>
            ) : null}
            {status === "error" && errorMsg ? (
              <p className="text-sm text-red-400 leading-relaxed">{errorMsg}</p>
            ) : null}

            <p className="text-xs text-vanilla/40 leading-relaxed">
              {tr(
                "Deine Anfrage wird vertraulich behandelt. Duo Sessions erfordern eine etwas längere Vorlaufzeit zur Terminabstimmung beider Dominas.",
                "Your request is handled confidentially. Duo sessions require a slightly longer lead time to coordinate both dominas' schedules."
              )}
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
