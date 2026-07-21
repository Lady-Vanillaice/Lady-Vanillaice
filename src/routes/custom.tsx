import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "../components/site/PageHeader";
import { Crown, Camera } from "lucide-react";
import { submitCustomRequest } from "@/lib/custom-booking.functions";
import customImage from "@/assets/custom.jpg.asset.json";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/custom")({
  head: () => ({
    meta: [
      { title: "Custom Content — Lady Vanilla Ice" },
      { name: "description", content: "Lass Dir individuelle Bilder oder Videos ganz nach Deinen Wünschen erstellen — diskret und exklusiv." },
      { property: "og:title", content: "Custom Content — Lady Vanilla Ice" },
      { property: "og:description", content: "Custom Bilder & Videos nach Deinen Vorstellungen — jetzt online anfragen." },
      { property: "og:image", content: customImage.url },
      { property: "og:url", content: "https://lady-vanillaice.com/custom" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/custom" }],
  }),
  component: CustomPage,
});

function CustomPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const submit = useServerFn(submitCustomRequest);
  const tr = useTr();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree || status === "sending") return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const photos = String(form.get("photos") ?? "").trim();
    const video = String(form.get("video") ?? "").trim();
    const outfit = String(form.get("outfit") ?? "").trim();
    const colleague = String(form.get("colleague") ?? "").trim();
    const wishes = String(form.get("message") ?? "").trim();

    setStatus("sending");
    setErrorMsg(null);
    try {
      await submit({
        data: {
          guest_name: name,
          guest_email: email,
          photo_count: photos || null,
          video_duration: video || null,
          outfit: outfit || null,
          colleague: colleague || null,
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
        eyebrow={tr("Custom Content", "Custom Content")}
        title={
          <>
            {tr("Deine ", "Your ")}
            <em className="font-script gold-text not-italic">{tr("Wünsche", "wishes")}</em>
            {tr(" — exklusiv für Dich", " — exclusive for you")}
          </>
        }
        intro={tr(
          "Custom Bilder oder Videos, individuell für Dich produziert. Sag mir, was Du Dir vorstellst — Outfit, Szene, Stimmung — und ich setze es um.",
          "Custom pictures or videos, produced individually for you. Tell me what you have in mind — outfit, scene, mood — and I'll bring it to life."
        )}
      />

      <section className="py-24">
        <div className="container-luxe max-w-3xl">
          <figure className="relative group mb-12 mx-auto w-full border-2 border-champagne/30 p-2 bg-anthracite/40 shadow-[0_0_0_1px_rgba(212,180,131,0.15),0_12px_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden" style={{ maxWidth: "28rem" }}>
            <div className="relative overflow-hidden border border-champagne/15">
              <img
                src={customImage.url}
                alt="Custom Content — sinnliche, individuelle Fotografie und Videoproduktion"
                width={1280}
                height={1920}
                loading="lazy"
                className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </figure>

          <div className="flex items-center gap-3 mb-4 text-champagne">
            <Camera size={20} strokeWidth={1.2} />
            <span className="eyebrow">{tr("Nur für Custom-Anfragen", "Custom requests only")}</span>
          </div>

          <p className="text-sm text-vanilla/80 leading-relaxed mb-10">
            {tr(
              "Sobald ich die Anfrage erhalten habe, sende ich Dir mein Tribut dafür. Dieses ist im Voraus fällig. Es dauert maximal 7 Tage bis der Content fertig ist. Dieser wird dann an die angegebene E-Mail-Adresse geschickt.",
              "Once I have received your request, I'll send you my tribute for it. This is payable in advance. Content is ready within a maximum of 7 days and will be sent to the email address you provide."
            )}
          </p>

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
                <label className="eyebrow block mb-2">{tr("Anzahl Bilder", "Number of pictures")}</label>
                <input name="photos" className="input-luxe" placeholder={tr("z. B. 10 Bilder", "e.g. 10 pictures")} />
              </div>
              <div>
                <label className="eyebrow block mb-2">{tr("Dauer Video", "Video length")}</label>
                <input name="video" className="input-luxe" placeholder={tr("z. B. 5 Minuten", "e.g. 5 minutes")} />
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-2">{tr("Zusammen mit einer Kollegin?", "Together with a colleague?")}</label>
              <input
                name="colleague"
                className="input-luxe"
                placeholder={tr(
                  "z. B. ja, mit welcher Kollegin oder gerne Vorschlag…",
                  "e.g. yes, with which colleague, or a suggestion is welcome…"
                )}
                maxLength={200}
              />
              <p className="text-[0.7rem] text-vanilla/50 mt-1.5 leading-relaxed">
                {tr(
                  "Optional — falls Du Content zusammen mit einer Kollegin wünschst, gib das hier gerne an.",
                  "Optional — if you'd like content together with a colleague, note it here."
                )}
              </p>
            </div>

            <div>
              <label className="eyebrow block mb-2">{tr("Outfitwunsch", "Outfit preference")}</label>
              <input
                name="outfit"
                className="input-luxe"
                placeholder={tr(
                  "z. B. Latex, Lingerie, Stiefel, Strümpfe…",
                  "e.g. latex, lingerie, boots, stockings…"
                )}
                maxLength={500}
              />
            </div>

            <div>
              <label className="eyebrow block mb-2">{tr("Deine Wunschvorstellung", "Your ideal vision")}</label>
              <textarea
                name="message"
                rows={6}
                required
                className="input-luxe resize-none"
                placeholder={tr(
                  "Beschreibe Szene, Stimmung, Spielarten, Posen, Worte — alles, was Dir wichtig ist…",
                  "Describe scene, mood, practices, poses, words — everything that matters to you…"
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
                  <>Ich bin volljährig (18+) und stimme der vertraulichen Verarbeitung meiner Daten zur Anfrageabwicklung gemäß <a href="/datenschutz" className="text-champagne hover:underline">Datenschutzerklärung</a> zu.</>,
                  <>I am 18+ and consent to the confidential processing of my data for handling my request in accordance with the <a href="/datenschutz" className="text-champagne hover:underline">privacy policy</a>.</>
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
                    : tr("Custom Content anfragen", "Request custom content")}
              </button>
            </div>

            {status === "sent" ? (
              <p className="text-sm text-champagne leading-relaxed">
                {tr(
                  "Deine Custom-Anfrage ist eingegangen. Du erhältst gleich eine Bestätigung per E-Mail. Ich melde mich persönlich mit Details zu Umsetzung und Preis.",
                  "Your custom request has been received. You'll get an email confirmation shortly. I'll be in touch personally with details on execution and price."
                )}
              </p>
            ) : null}
            {status === "error" && errorMsg ? (
              <p className="text-sm text-red-400 leading-relaxed">{errorMsg}</p>
            ) : null}

            <p className="text-xs text-vanilla/40 leading-relaxed">
              {tr(
                "Deine Anfrage wird vertraulich behandelt. Preis und Lieferzeit richten sich nach Umfang und individuellen Wünschen.",
                "Your request is handled confidentially. Price and delivery time depend on scope and individual wishes."
              )}
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
