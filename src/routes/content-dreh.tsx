import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "../components/site/PageHeader";
import { Crown, Camera, FileDown, ImagePlus, X } from "lucide-react";
import { submitContentdrehBooking } from "@/lib/contentdreh-booking.functions";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/content-dreh")({
  head: () => ({
    meta: [
      { title: "Content Dreh — Lady Vanilla Ice" },
      { name: "description", content: "Gelegentlich suche ich Mitwirkende für Content-Drehs für meine Online-Seiten. Hier kannst du dein Interesse hinterlegen." },
      { property: "og:title", content: "Content Dreh — Lady Vanilla Ice" },
      { property: "og:description", content: "Mitwirken bei einem Content Dreh — Voraussetzungen, Vertrag, Tribut." },
      { property: "og:url", content: "https://lady-vanillaice.com/content-dreh" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/content-dreh" }],
  }),
  component: ContentDreh,
});

function ContentDreh() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [terms, setTerms] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDesc, setPhotoDesc] = useState("");
  const submit = useServerFn(submitContentdrehBooking);
  const tr = useTr();

  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const MAX_BYTES = 8 * 1024 * 1024;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setErrorMsg(null);
    if (!file) { setPhotoFile(null); setPhotoPreview(null); return; }
    if (!ALLOWED.includes(file.type)) {
      setErrorMsg(tr("Nur JPG, PNG, WebP oder HEIC sind erlaubt.", "Only JPG, PNG, WebP or HEIC are allowed."));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrorMsg(tr("Bild ist zu groß (max. 8 MB).", "Image is too large (max. 8 MB)."));
      e.target.value = "";
      return;
    }
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoDesc("");
  }

  async function fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(binary);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree || !terms || status === "sending") return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const date = String(form.get("date") ?? "").trim();
    const mask = String(form.get("mask") ?? "").trim();
    const wishes = String(form.get("message") ?? "").trim();

    setStatus("sending");
    setErrorMsg(null);
    try {
      let photoPayload: {
        filename: string;
        content_type: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
        data_base64: string;
        description: string;
      } | null = null;
      if (photoFile) {
        photoPayload = {
          filename: photoFile.name,
          content_type: photoFile.type as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif",
          data_base64: await fileToBase64(photoFile),
          description: photoDesc.trim(),
        };
      }
      await submit({
        data: {
          guest_name: name,
          guest_email: email,
          guest_phone: phone || null,
          requested_start: date,
          mask: mask || null,
          message: wishes,
          age_confirmed: true,
          terms_confirmed: true,
          photo: photoPayload,
        },
      });
      setStatus("sent");
      (e.target as HTMLFormElement).reset();
      setAgree(false);
      setTerms(false);
      removePhoto();
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
        eyebrow={tr("Content Dreh", "Content shoot")}
        title={
          <>
            {tr("Gemeinsam ", "Shooting ")}
            <em className="font-script gold-text not-italic">{tr("Content", "content")}</em>
            {tr(" drehen", " together")}
          </>
        }
        intro={tr(
          "Gelegentlich suche ich Mitwirkende für Drehs für meine Online-Seiten. Hier erfährst du die Voraussetzungen und kannst dein Interesse hinterlegen.",
          "Occasionally I look for people to collaborate on shoots for my online platforms. Here you'll find the requirements and can register your interest."
        )}
      />

      <section className="py-24">
        <div className="container-luxe max-w-3xl">
          <div className="flex items-center gap-3 mb-6 text-champagne">
            <Camera size={20} strokeWidth={1.2} />
            <span className="eyebrow">{tr("Mitwirken bei einem Dreh", "Take part in a shoot")}</span>
          </div>

          <div className="mb-10 border border-champagne/40 bg-champagne/5 p-5 text-sm text-vanilla/80 leading-relaxed space-y-4">
            <div>
              <p className="eyebrow mb-2 text-champagne">{tr("Worum geht's", "What it's about")}</p>
              <p>
                {tr(
                  <>Gelegentlich suche ich für meine Online-Seiten Personen, mit denen ich zusammen Content drehen kann. Termine vereinbare ich individuell — im <a href="/kalender" className="text-champagne hover:underline">Kalender</a> findest du entsprechende Slots mit <em className="text-champagne not-italic">Contentdreh</em> markiert, sobald welche freigeschaltet sind.</>,
                  <>Occasionally I look for people to shoot content with for my online platforms. Dates are arranged individually — in the <a href="/kalender" className="text-champagne hover:underline">calendar</a> you'll find corresponding slots marked as <em className="text-champagne not-italic">content shoot</em> once they are unlocked.</>
                )}
              </p>
            </div>

            <div>
              <p className="eyebrow mb-2 text-champagne">{tr("Voraussetzungen", "Requirements")}</p>
              <ul className="list-disc list-outside pl-5 space-y-1.5 marker:text-champagne">
                <li>{tr(
                  "Gesicht muss in der Kamera gezeigt werden — gerne auch mit Maske, das ist kein Problem.",
                  "Face must be shown on camera — a mask is fine, that's no problem."
                )}</li>
                <li>{tr(
                  "Vollständige Personalien (Ausweisdaten) sind zwingend erforderlich.",
                  "Full personal details (ID data) are mandatory."
                )}</li>
                <li>{tr(
                  "Es wird ein Vertrag unterschrieben — ohne diesen kann ich den Content nicht nutzen.",
                  "A contract is signed — without it I cannot use the content."
                )}</li>
                <li>{tr("Volljährigkeit (18+).", "Legal age (18+).")}</li>
              </ul>
            </div>

            <div>
              <p className="eyebrow mb-2 text-champagne">{tr("Tribut", "Tribute")}</p>
              <p>
                {tr(
                  "Das Ganze erfolgt selbstverständlich nicht tributlos — die Konditionen besprechen wir individuell und transparent vor dem Dreh.",
                  "This does not happen without tribute of course — terms are discussed individually and transparently before the shoot."
                )}
              </p>
            </div>
          </div>

          <div className="mb-10 border border-champagne/40 bg-noir/40 p-5 text-sm text-vanilla/80 leading-relaxed space-y-4">
            <div>
              <p className="eyebrow mb-2 text-champagne">{tr("Einverständniserklärung (Consent Form)", "Consent form")}</p>
              <p className="mb-3">
                {tr(
                  <>Lade dir das Formular herunter, <strong className="text-vanilla">drucke es aus</strong> und unterschreibe es. Schicke mir anschließend per E-Mail an{" "}<a href="mailto:info@herzblutmadl.com" className="text-champagne hover:underline">info@herzblutmadl.com</a>:</>,
                  <>Download the form, <strong className="text-vanilla">print it</strong> and sign it. Then send me by email to{" "}<a href="mailto:info@herzblutmadl.com" className="text-champagne hover:underline">info@herzblutmadl.com</a>:</>
                )}
              </p>
              <ul className="list-disc list-outside pl-5 space-y-1.5 mb-4 marker:text-champagne">
                <li>{tr("Ein Foto des unterschriebenen Vertrages", "A photo of the signed contract")}</li>
                <li>{tr("Ein Foto deines Ausweises — Vorderseite", "A photo of your ID — front side")}</li>
                <li>{tr("Ein Foto deines Ausweises — Rückseite", "A photo of your ID — back side")}</li>
                <li>{tr(
                  "Ein Foto von deinem Gesicht zusammen mit dem Ausweis (zur Verifizierung)",
                  "A photo of your face together with the ID (for verification)"
                )}</li>
              </ul>
              <a
                href="/CONSENT_FORM_C4S.pages"
                download="CONSENT_FORM_C4S.pages"
                className="btn-gold inline-flex items-center gap-2"
              >
                <FileDown size={14} />
                {tr("Consent Form herunterladen", "Download consent form")}
              </a>
              <p className="text-[0.7rem] text-vanilla/50 mt-3 leading-relaxed">
                {tr(
                  "Datei im Apple Pages Format (.pages). Auf Wunsch sende ich dir gerne auch eine PDF- oder Word-Version zu.",
                  "File in Apple Pages format (.pages). On request I'll happily send you a PDF or Word version."
                )}
              </p>
            </div>
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
              <label className="eyebrow block mb-2">{tr("WhatsApp (optional)", "WhatsApp (optional)")}</label>
              <input name="phone" type="tel" className="input-luxe" placeholder="+49 …" />
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
                  placeholder={tr("z. B. Ende Juli, Wochenende…", "e.g. end of July, weekend…")}
                />
                <p className="text-[0.7rem] text-vanilla/50 mt-1.5 leading-relaxed">
                  {tr("Termine vereinbare ich individuell — ich melde mich.", "Dates are arranged individually — I'll be in touch.")}
                </p>
              </div>
              <div>
                <label className="eyebrow block mb-2">{tr("Maske erwünscht?", "Mask preferred?")}</label>
                <select name="mask" className="input-luxe">
                  <option value="">{tr("Bitte wählen…", "Please choose…")}</option>
                  <option value="Ohne Maske">{tr("Ohne Maske", "Without mask")}</option>
                  <option value="Mit Maske">{tr("Mit Maske", "With mask")}</option>
                  <option value="Offen / Absprache">{tr("Offen / Absprache", "Open / to be discussed")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-2">{tr("Deine Nachricht", "Your message")}</label>
              <textarea
                name="message"
                rows={6}
                required
                className="input-luxe resize-none"
                placeholder={tr(
                  "Erzähle mir kurz von Dir, welche Art von Content für Dich vorstellbar ist und worauf ich achten sollte…",
                  "Tell me briefly about yourself, what kind of content you could imagine and what I should keep in mind…"
                )}
              />
            </div>

            <div className="border border-champagne/30 bg-noir/30 p-5 space-y-4">
              <div>
                <label className="eyebrow block mb-2">{tr("Foto von dir (optional)", "Photo of yourself (optional)")}</label>
                <p className="text-[0.7rem] text-vanilla/50 mb-3 leading-relaxed">
                  {tr(
                    "Damit ich mir einen besseren Eindruck machen kann. JPG, PNG, WebP oder HEIC — max. 8 MB. Wird vertraulich behandelt.",
                    "So I can get a better impression. JPG, PNG, WebP or HEIC — max. 8 MB. Handled confidentially."
                  )}
                </p>
                {photoPreview ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img
                        src={photoPreview}
                        alt={tr("Vorschau", "Preview")}
                        className="max-h-64 border border-champagne/40"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        aria-label={tr("Foto entfernen", "Remove photo")}
                        className="absolute -top-2 -right-2 bg-noir border border-champagne/60 text-champagne rounded-full w-7 h-7 flex items-center justify-center hover:bg-champagne hover:text-noir transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-vanilla/60">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-champagne hover:underline">
                        <ImagePlus size={12} />
                        {tr("Anderes Bild wählen", "Choose a different image")}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                      <span>{photoFile?.name}</span>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border border-dashed border-champagne/40 py-6 px-4 cursor-pointer text-sm text-vanilla/60 hover:border-champagne/70 hover:text-champagne transition">
                    <ImagePlus size={16} />
                    <span>{tr("Bild auswählen…", "Choose image…")}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {photoFile ? (
                <div>
                  <label className="eyebrow block mb-2">{tr("Kurze Beschreibung zum Bild (optional)", "Short description of the image (optional)")}</label>
                  <textarea
                    value={photoDesc}
                    onChange={(e) => setPhotoDesc(e.target.value)}
                    rows={2}
                    maxLength={500}
                    className="input-luxe resize-none"
                    placeholder={tr("z. B. wann/wo aufgenommen, was zu sehen ist…", "e.g. when/where taken, what's visible…")}
                  />
                </div>
              ) : null}
            </div>

            <label className="flex items-start gap-3 text-sm text-vanilla/70 cursor-pointer">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-1 accent-[var(--color-champagne)]"
                required
              />
              <span>
                {tr(
                  "Mir ist bewusst, dass ich für einen Dreh meine vollständigen Personalien angeben und einen Vertrag unterschreiben muss, damit der Content genutzt werden darf.",
                  "I understand that for a shoot I must provide my complete personal details and sign a contract before the content may be used."
                )}
              </span>
            </label>

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

            <div className="pt-2">
              <button
                type="submit"
                className="btn-gold w-full md:w-auto"
                disabled={!agree || !terms || status === "sending"}
              >
                <Crown size={14} />
                {status === "sending"
                  ? tr("Wird gesendet…", "Sending…")
                  : status === "sent"
                    ? tr("Anfrage erhalten — danke!", "Request received — thank you!")
                    : tr("Interesse hinterlegen", "Register interest")}
              </button>
            </div>

            {status === "sent" ? (
              <p className="text-sm text-champagne leading-relaxed">
                {tr(
                  "Deine Anfrage ist eingegangen. Du erhältst gleich eine Bestätigung per E-Mail. Ich melde mich persönlich zur Abstimmung.",
                  "Your request has been received. You'll get an email confirmation shortly. I'll be in touch personally to coordinate."
                )}
              </p>
            ) : null}
            {status === "error" && errorMsg ? (
              <p className="text-sm text-red-400 leading-relaxed">{errorMsg}</p>
            ) : null}

            <p className="text-xs text-vanilla/40 leading-relaxed">
              {tr(
                "Deine Anfrage wird vertraulich behandelt. Konditionen und Details klären wir vor dem Dreh.",
                "Your request is handled confidentially. Terms and details are clarified before the shoot."
              )}
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
