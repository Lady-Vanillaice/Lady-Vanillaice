import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "../components/site/PageHeader";
import { Crown, Mail, MessageCircle, MapPin, ShieldCheck, Clock, Lock } from "lucide-react";
import { submitBooking } from "@/lib/public-booking.functions";
import { sendBookingWhatsApp } from "@/lib/whatsapp-booking.functions";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/buchung")({
  head: () => ({
    meta: [
      { title: "Buchung – Domina Termin München & Umgebung | Lady Vanilla Ice" },
      { name: "description", content: "Termin für eine Domina-Session in München und Umgebung anfragen. Diskret, unverbindlich und persönlich." },
      { property: "og:title", content: "Buchung – Domina Termin München & Umgebung" },
      { property: "og:description", content: "Unverbindliche und diskrete Terminanfrage." },
      { property: "og:url", content: "https://lady-vanillaice.com/buchung" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/buchung" }],
  }),
  component: Buchung,
});

function Buchung() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const submit = useServerFn(submitBooking);
  const notifyWhatsApp = useServerFn(sendBookingWhatsApp);
  const tr = useTr();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree || status === "sending") return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const combineDateTime = (dateName: string, timeName: string) => {
      const day = String(form.get(dateName) ?? "").trim();
      const time = String(form.get(timeName) ?? "").trim();
      return day && time ? `${day}T${time}` : "";
    };
    const date = combineDateTime("date_day", "date_time");
    const endDate = combineDateTime("end_date_day", "end_date_time");
    const altDate = combineDateTime("alt_date_day", "alt_date_time");
    const altEnd = combineDateTime("alt_end_day", "alt_end_time");
    const preferences = String(form.get("preferences") ?? "").trim();
    const taboos = String(form.get("taboos") ?? "").trim();
    const experience = String(form.get("experience") ?? "").trim();
    const health = String(form.get("health") ?? "").trim();
    const safeword = String(form.get("safeword") ?? "").trim();
    const notes = String(form.get("message") ?? "").trim();

    let requestedStartIso: string | undefined;
    let requestedEndIso: string | undefined;
    let durationMinutes: number | undefined;
    let durationLabel: string | undefined;
    if (date) {
      const startD = new Date(date);
      if (!isNaN(startD.getTime())) {
        requestedStartIso = startD.toISOString();
        if (endDate) {
          const endD = new Date(endDate);
          if (!isNaN(endD.getTime()) && endD.getTime() > startD.getTime()) {
            requestedEndIso = endD.toISOString();
            durationMinutes = Math.round((endD.getTime() - startD.getTime()) / 60_000);
            durationLabel = `${durationMinutes} Minuten`;
          }
        }
      }
    }

    const fmt = (s: string) => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? s : d.toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" });
    };
    const message = [
      phone ? `WhatsApp: ${phone}` : null,
      date
        ? `Wunschtermin: ${fmt(date)}${endDate ? ` – ${fmt(endDate)}` : ""}`
        : null,
      altDate
        ? `Ausweichtermin: ${fmt(altDate)}${altEnd ? ` – ${fmt(altEnd)}` : ""}`
        : null,
      experience ? `Erfahrung:\n${experience}` : null,
      preferences ? `Vorlieben & Wünsche:\n${preferences}` : null,
      taboos ? `Tabus & Grenzen:\n${taboos}` : null,
      health ? `Gesundheitliche Hinweise:\n${health}` : null,
      safeword ? `Safeword:\n${safeword}` : null,
      notes ? `Weitere Nachricht:\n${notes}` : null,
    ].filter(Boolean).join("\n\n");

    setStatus("sending");
    setErrorMsg(null);
    try {
      await submit({
        data: {
          guest_name: name,
          guest_email: email,
          guest_phone: phone || null,
          message,
          requested_start: requestedStartIso,
          duration_minutes: durationMinutes,
          duration_label: durationLabel,
          age_confirmed: true,
          marketing_consent: marketingConsent,
        },
      });

      if (phone) try {
        await notifyWhatsApp({
          data: {
            guest_name: name,
            guest_email: email,
            guest_phone: phone,
            requested_start: requestedStartIso,
            requested_end: requestedEndIso,
            message,
          },
        });
      } catch (whatsAppError) {
        console.error("WhatsApp notification failed", whatsAppError);
      }

      setStatus("sent");
      (e.target as HTMLFormElement).reset();
      setAgree(false);
      setMarketingConsent(false);
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
        eyebrow={tr("Buchung", "Booking")}
        title={
          <>
            {tr("Termin ", "Request ")}
            <em className="font-script gold-text not-italic">{tr("anfragen", "an appointment")}</em>
          </>
        }
        intro={tr(
          "Bitte fülle das Formular aus oder schreibe mir direkt. Alle Anfragen werden vertraulich behandelt.",
          "Please fill in the form or write to me directly. All inquiries are handled confidentially."
        )}
      />

      <section className="py-24">
        <div className="container-luxe grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-12">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 border-y border-champagne/15 py-5 text-sm text-vanilla/80">
              <div className="flex items-center gap-2.5">
                <Lock className="text-champagne" size={18} />
                <span>{tr("Diskret", "Discreet")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="text-champagne" size={18} />
                <span>{tr("Antwort binnen 24 h", "Reply within 24 h")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="text-champagne" size={18} />
                <span>{tr("Keine Vorkasse für Erstkontakt", "No prepayment for first contact")}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
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
                <label className="eyebrow block mb-2">{tr("WhatsApp (optional)", "WhatsApp (optional)")}</label>
                <input name="phone" type="tel" className="input-luxe" placeholder="+49 …" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="eyebrow block mb-2">{tr("Wunschtermin — Von", "Preferred date — From")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="date_day" type="date" required className="input-luxe" aria-label={tr("Wunschtermin Datum", "Preferred date")} />
                    <input name="date_time" type="time" required className="input-luxe" aria-label={tr("Wunschtermin Uhrzeit", "Preferred time")} />
                  </div>
                </div>
                <div>
                  <label className="eyebrow block mb-2">{tr("Wunschtermin — Bis", "Preferred date — Until")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="end_date_day" type="date" required className="input-luxe" aria-label={tr("Enddatum", "End date")} />
                    <input name="end_date_time" type="time" required className="input-luxe" aria-label={tr("Endzeit", "End time")} />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="eyebrow block mb-2">{tr("Ausweichtermin — Von (optional)", "Alternative date — From (optional)")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="alt_date_day" type="date" className="input-luxe" aria-label={tr("Ausweichtermin Datum", "Alternative date")} />
                    <input name="alt_date_time" type="time" className="input-luxe" aria-label={tr("Ausweichtermin Uhrzeit", "Alternative time")} />
                  </div>
                </div>
                <div>
                  <label className="eyebrow block mb-2">{tr("Ausweichtermin — Bis (optional)", "Alternative date — Until (optional)")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="alt_end_day" type="date" className="input-luxe" aria-label={tr("Ausweichtermin Enddatum", "Alternative end date")} />
                    <input name="alt_end_time" type="time" className="input-luxe" aria-label={tr("Ausweichtermin Endzeit", "Alternative end time")} />
                  </div>
                </div>
              </div>

              <div className="border border-champagne/20 bg-champagne/[0.03] p-5 space-y-5">
                <div>
                  <div className="eyebrow text-champagne">{tr("Deine Session", "Your session")}</div>
                  <p className="mt-1 text-xs leading-relaxed text-vanilla/55">
                    {tr("Je genauer du Wünsche und Grenzen beschreibst, desto besser kann ich mich vorbereiten.", "The more precisely you describe your wishes and boundaries, the better I can prepare.")}
                  </p>
                </div>

                <div>
                  <label className="eyebrow block mb-2">{tr("Erfahrung", "Experience")}</label>
                  <select name="experience" required defaultValue="" className="input-luxe">
                    <option value="" disabled>{tr("Bitte auswählen", "Please select")}</option>
                    <option value={tr("Erste Session", "First session")}>{tr("Erste Session", "First session")}</option>
                    <option value={tr("Etwas Erfahrung", "Some experience")}>{tr("Etwas Erfahrung", "Some experience")}</option>
                    <option value={tr("Erfahren", "Experienced")}>{tr("Erfahren", "Experienced")}</option>
                  </select>
                </div>

                <div>
                  <label className="eyebrow block mb-2">{tr("Vorlieben & Wünsche", "Preferences & wishes")}</label>
                  <textarea name="preferences" rows={4} required minLength={3} maxLength={450} className="input-luxe resize-y" placeholder={tr("Was wünschst du dir? Welche Fantasien, Rollen oder Praktiken interessieren dich?", "What would you like? Which fantasies, roles or practices interest you?")} />
                </div>

                <div>
                  <label className="eyebrow block mb-2">{tr("Tabus & klare Grenzen", "Taboos & hard limits")}</label>
                  <textarea name="taboos" rows={3} required minLength={2} maxLength={450} className="input-luxe resize-y" placeholder={tr("Was darf auf keinen Fall passieren?", "What must not happen under any circumstances?")} />
                </div>

                <div>
                  <label className="eyebrow block mb-2">{tr("Gesundheitliche Hinweise (optional)", "Health information (optional)")}</label>
                  <textarea name="health" rows={2} maxLength={150} className="input-luxe resize-y" placeholder={tr("Zum Beispiel Verletzungen, Allergien oder Kreislaufprobleme", "For example injuries, allergies or circulation problems")} />
                </div>

                <div>
                  <label className="eyebrow block mb-2">{tr("Gewünschtes Safeword (optional)", "Preferred safeword (optional)")}</label>
                  <input name="safeword" maxLength={40} className="input-luxe" placeholder={tr("Zum Beispiel: Rot", "For example: Red")} />
                </div>

                <div>
                  <label className="eyebrow block mb-2">{tr("Weitere Nachricht (optional)", "Additional message (optional)")}</label>
                <textarea
                  name="message"
                  rows={3}
                  maxLength={250}
                  className="input-luxe resize-y"
                  placeholder={tr(
                    "Gibt es noch etwas, das ich wissen sollte?",
                    "Is there anything else I should know?"
                  )}
                />
                </div>
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
                    <>I am 18+ and consent to the confidential processing of my data for scheduling in accordance with the <a href="/datenschutz" className="text-champagne hover:underline">privacy policy</a>.</>
                  )}
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-vanilla/70 cursor-pointer border border-champagne/20 p-4">
                <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} className="mt-1 accent-[var(--color-champagne)]" />
                <span>{tr(
                  "Ich möchte freiwillig per E-Mail über neue verfügbare Termine informiert werden. Nach dem Absenden erhalte ich eine Bestätigungs-E-Mail. Ich kann mich jederzeit wieder abmelden.",
                  "I voluntarily want to receive emails about newly available appointments. I will receive a confirmation email and can unsubscribe at any time."
                )}</span>
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
                      : tr("Termin anfragen", "Request appointment")}
                </button>
              </div>

              <div className="border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed">
                <div className="eyebrow mb-1.5 text-champagne">{tr("Längere Sessions", "Longer sessions")}</div>
                {tr(
                  "Ab 4 Stunden kann man auch so im Studio mit mir etwas vereinbaren. Gib einfach deinen Wunschtermin und einen Ausweichtermin an — ich melde mich persönlich zur Abstimmung. Für längere Sessions ab 4 Stunden können wir optional auch gerne einen anderen Tag wählen.",
                  "From 4 hours upwards we can also arrange something at the studio outside the calendar. Just enter your preferred and an alternative date — I'll be in touch personally to coordinate. For sessions of 4 hours or more we can also choose a different day if you prefer."
                )}
              </div>

              {status === "sent" ? (
                <p className="text-sm text-champagne leading-relaxed">
                  {tr(
                    "Deine Anfrage ist bei mir eingegangen. Du erhältst gleich eine Bestätigung per E-Mail mit allen Zahlungs- und Absagebedingungen. Sobald die Anzahlung bei mir eingegangen ist, melde ich mich persönlich bei Dir, um die Details zu besprechen.",
                    "Your request has been received. You'll get an email confirmation shortly with all payment and cancellation terms. As soon as the deposit reaches me, I'll be in touch personally to discuss the details."
                  )}
                </p>
              ) : null}
              {status === "error" && errorMsg ? (
                <p className="text-sm text-red-400 leading-relaxed">{errorMsg}</p>
              ) : null}

              <p className="text-xs text-vanilla/40 leading-relaxed">
                {tr(
                  "Deine Anfrage wird vertraulich behandelt. Eine Bestätigung erhältst Du per E-Mail.",
                  "Your request is handled confidentially. You'll receive a confirmation by email."
                )}
              </p>
            </form>
          </div>

          <aside className="lg:col-span-5">
            <div className="bg-card border border-champagne/15 p-8">
              <div className="eyebrow mb-4">{tr("Direkter Kontakt", "Direct contact")}</div>
              <h3 className="font-display text-2xl text-vanilla mb-6">
                {tr("Lieber persönlich?", "Prefer to reach me directly?")}
              </h3>

              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <Mail className="text-champagne mt-1" size={18} />
                  <div>
                    <div className="eyebrow mb-1">{tr("E-Mail", "Email")}</div>
                    <a href="mailto:Lady-vanillaice@gmx.net" className="text-vanilla hover:text-champagne transition">
                      Lady-vanillaice@gmx.net
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MessageCircle className="text-champagne mt-1" size={18} />
                  <div>
                    <div className="eyebrow mb-1">WhatsApp</div>
                    <a href="https://wa.me/4915170568230" target="_blank" rel="noopener noreferrer" className="text-vanilla hover:text-champagne transition">
                      +49 151 70568230
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MessageCircle className="text-champagne mt-1" size={18} />
                  <div>
                    <div className="eyebrow mb-1">Telegram</div>
                    <a href="https://t.me/ladyvanillaice" target="_blank" rel="noopener noreferrer" className="text-vanilla hover:text-champagne transition">
                      @ladyvanillaice
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MapPin className="text-champagne mt-1" size={18} />
                  <div>
                    <div className="eyebrow mb-1">{tr("Standort", "Location")}</div>
                    <div className="text-vanilla">{tr("München und Umgebung", "Munich and surroundings")}</div>
                  </div>
                </li>
              </ul>

              <div className="my-8"><span className="hairline" /></div>

              <p className="text-xs text-vanilla/55 leading-relaxed">
                {tr(
                  "Termine ausschließlich nach vorheriger Vereinbarung. Spontane Anfragen ohne Vorgespräch werden nicht beantwortet.",
                  "Appointments exclusively by prior arrangement. Spontaneous inquiries without a preliminary talk will not be answered."
                )}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
