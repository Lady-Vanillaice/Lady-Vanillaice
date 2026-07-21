import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "../components/site/PageHeader";
import { Camera, Mail, MessageCircle, MapPin } from "lucide-react";
import { submitPhotoshootRequest } from "@/lib/photoshooting.functions";
import shootImage from "@/assets/CARL0560.jpg.asset.json";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/fotoshooting")({
  head: () => ({
    meta: [
      { title: "Fotoshooting — Lady Vanilla Ice" },
      { name: "description", content: "Fotografen-Anfragen für TFP oder Pay-Shootings. Schicke mir deine Social Media Kanäle und deine Ideen." },
      { property: "og:title", content: "Fotoshooting — Lady Vanilla Ice" },
      { property: "og:description", content: "Fotografen-Anfragen für TFP oder Pay-Shootings." },
      { property: "og:url", content: "https://lady-vanillaice.com/fotoshooting" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/fotoshooting" }],
  }),
  component: Fotoshooting,
});

function Fotoshooting() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const submit = useServerFn(submitPhotoshootRequest);
  const tr = useTr();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree || status === "sending") return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const socialMedia = String(form.get("social_media") ?? "").trim();
    const shootType = String(form.get("shoot_type") ?? "").trim();
    const budgetType = String(form.get("budget_type") ?? "").trim() as "TFP" | "Pay" | "Beides";
    const message = String(form.get("message") ?? "").trim();

    setStatus("sending");
    setErrorMsg(null);
    try {
      await submit({
        data: {
          name,
          email,
          social_media: socialMedia || undefined,
          shoot_type: shootType,
          budget_type: budgetType,
          message: `Telefon: ${phone}${message ? `\n\n${message}` : ""}`,
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
        eyebrow={tr("Fotoshooting", "Photoshoot")}
        title={
          <>
            {tr("Fotografen ", "Photographer ")}
            <em className="font-script gold-text not-italic">{tr("Anfrage", "inquiry")}</em>
          </>
        }
        intro={tr(
          "Du bist Fotograf und möchtest mit mir shooten? Schicke mir deine Social Media Kanäle und eine Nachricht, was du shooten willst. Ich schaue, ob es für mich als TFP passt oder ob Pay angesagt ist.",
          "Are you a photographer who'd like to shoot with me? Send me your social media channels and a message about what you'd like to shoot. I'll see whether TFP works for me or whether it needs to be a paid shoot."
        )}
      />

      <section className="py-8">
        <div className="container-luxe flex justify-center">
          <figure className="relative group border-2 border-champagne/30 p-2 bg-anthracite/40 shadow-[0_0_0_1px_rgba(212,180,131,0.15),0_12px_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden max-w-lg">
            <div className="relative overflow-hidden border border-champagne/15">
              <img
                src={shootImage.url}
                alt="Lady Vanilla Ice — Fotoshooting"
                width={1280}
                height={1920}
                loading="lazy"
                className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </figure>
        </div>
      </section>

      <section className="py-24">
        <div className="container-luxe grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="eyebrow block mb-2">{tr("Name", "Name")}</label>
                  <input name="name" required className="input-luxe" placeholder={tr("Dein Name", "Your name")} />
                </div>
                <div>
                  <label className="eyebrow block mb-2">{tr("E-Mail-Adresse", "Email address")}</label>
                  <input name="email" type="email" required className="input-luxe" placeholder={tr("deine@email.de", "you@email.com")} />
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-2">{tr("Telefonnummer", "Phone number")}</label>
                <input name="phone" type="tel" required className="input-luxe" placeholder="+49 …" />
              </div>

              <div>
                <label className="eyebrow block mb-2">{tr("Social Media Kanäle", "Social media channels")}</label>
                <input
                  name="social_media"
                  className="input-luxe"
                  placeholder={tr(
                    "Instagram, Portfolio, Website — Links oder Handles",
                    "Instagram, portfolio, website — links or handles"
                  )}
                />
              </div>

              <div>
                <label className="eyebrow block mb-2">{tr("Was möchtest du shooten?", "What would you like to shoot?")}</label>
                <input
                  name="shoot_type"
                  required
                  className="input-luxe"
                  placeholder={tr("Beschreibe kurz dein Shooting-Konzept…", "Briefly describe your shoot concept…")}
                />
              </div>

              <div>
                <label className="eyebrow block mb-2">{tr("Budget", "Budget")}</label>
                <select name="budget_type" required className="input-luxe">
                  <option value="">{tr("Bitte wählen…", "Please choose…")}</option>
                  <option value="TFP">{tr("TFP (Time for Print)", "TFP (Time for Print)")}</option>
                  <option value="Pay">{tr("Pay (Bezahltes Shooting)", "Pay (paid shoot)")}</option>
                  <option value="Beides">{tr("Beides möglich", "Either possible")}</option>
                </select>
              </div>

              <div>
                <label className="eyebrow block mb-2">{tr("Nachricht (optional)", "Message (optional)")}</label>
                <textarea
                  name="message"
                  rows={4}
                  className="input-luxe resize-none"
                  placeholder={tr(
                    "Weitere Details, Terminwünsche, Location-Ideen…",
                    "Further details, date preferences, location ideas…"
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
                    <>Ich bin volljährig (18+) und stimme der vertraulichen Verarbeitung meiner Daten gemäß <a href="/datenschutz" className="text-champagne hover:underline">Datenschutzerklärung</a> zu.</>,
                    <>I am 18+ and consent to the confidential processing of my data in accordance with the <a href="/datenschutz" className="text-champagne hover:underline">privacy policy</a>.</>
                  )}
                </span>
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  className="btn-gold w-full md:w-auto"
                  disabled={!agree || status === "sending"}
                >
                  <Camera size={14} />
                  {status === "sending"
                    ? tr("Wird gesendet…", "Sending…")
                    : status === "sent"
                      ? tr("Anfrage erhalten — danke!", "Request received — thank you!")
                      : tr("Anfrage senden", "Send request")}
                </button>
              </div>

              {status === "sent" ? (
                <p className="text-sm text-champagne leading-relaxed">
                  {tr(
                    "Deine Anfrage ist bei mir eingegangen. Ich schaue mir deine Social Media Kanäle an und melde mich so schnell wie möglich bei dir, ob das Shooting für mich passt.",
                    "Your request has been received. I'll take a look at your social media channels and get back to you as soon as possible about whether the shoot works for me."
                  )}
                </p>
              ) : null}
              {status === "error" && errorMsg ? (
                <p className="text-sm text-red-400 leading-relaxed">{errorMsg}</p>
              ) : null}

              <p className="text-xs text-vanilla/40 leading-relaxed">
                {tr(
                  "Deine Anfrage wird vertraulich behandelt. Keine Weitergabe an Dritte.",
                  "Your request is handled confidentially. No sharing with third parties."
                )}
              </p>
            </form>
          </div>

          <aside className="lg:col-span-5">
            <div className="bg-card border border-champagne/15 p-8">
              <div className="eyebrow mb-4">{tr("Hinweise", "Notes")}</div>
              <h3 className="font-display text-2xl text-vanilla mb-6">
                {tr("Was passiert nach der Anfrage?", "What happens after your request?")}
              </h3>

              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <Camera className="text-champagne mt-1" size={18} />
                  <div>
                    <div className="eyebrow mb-1">{tr("Review", "Review")}</div>
                    <div className="text-vanilla/70 text-sm">
                      {tr(
                        "Ich prüfe deine Social Media Kanäle und dein Shooting-Konzept.",
                        "I review your social media channels and shoot concept."
                      )}
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Mail className="text-champagne mt-1" size={18} />
                  <div>
                    <div className="eyebrow mb-1">{tr("Rückmeldung", "Response")}</div>
                    <div className="text-vanilla/70 text-sm">
                      {tr(
                        "Du erhältst eine Antwort, ob das Shooting als TFP oder Pay möglich ist.",
                        "You'll get a reply on whether the shoot is possible as TFP or as a paid shoot."
                      )}
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MessageCircle className="text-champagne mt-1" size={18} />
                  <div>
                    <div className="eyebrow mb-1">{tr("Absprache", "Coordination")}</div>
                    <div className="text-vanilla/70 text-sm">
                      {tr(
                        "Bei Interesse besprechen wir Details, Location und Termin.",
                        "If we're both interested we discuss details, location and date."
                      )}
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MapPin className="text-champagne mt-1" size={18} />
                  <div>
                    <div className="eyebrow mb-1">{tr("Location", "Location")}</div>
                    <div className="text-vanilla/70 text-sm">
                      {tr(
                        "München und Umgebung.",
                        "Munich and surroundings."
                      )}
                    </div>
                  </div>
                </li>
              </ul>

              <div className="my-8"><span className="hairline" /></div>

              <p className="text-xs text-vanilla/55 leading-relaxed">
                {tr(
                  "Bitte nur seriöse Anfragen mit Referenzen. Unvollständige Anfragen ohne Social Media Links oder Shooting-Beschreibung werden nicht beantwortet.",
                  "Serious inquiries with references only. Incomplete requests without social media links or a shoot description will not be answered."
                )}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
