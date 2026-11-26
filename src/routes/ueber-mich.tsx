import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PageHeader } from "../components/site/PageHeader";
import aboutImage from "@/assets/about.jpg";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/ueber-mich")({
  head: () => ({
    meta: [
      { title: "Über mich – Lady Vanilla Ice | Domina in München" },
      {
        name: "description",
        content:
          "Lady Vanilla Ice: hart, weich und unberechenbar. Persönliche Domina-Sessions mit Kopfkino, klarer Führung und eigener Handschrift.",
      },
      { property: "og:title", content: "Über Lady Vanilla Ice" },
      {
        property: "og:description",
        content: "Keine Domina nach Schema F. Hart, weich und ganz auf ihre Art.",
      },
      { property: "og:url", content: "https://lady-vanillaice.com/ueber-mich" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/ueber-mich" }],
  }),
  component: UeberMich,
});

const GALLERY = [
  { src: "/galerie/galerie-01.jpg", w: 1120, h: 1400 },
  { src: "/galerie/galerie-02.jpg", w: 933, h: 1400 },
  { src: "/galerie/galerie-03.jpg", w: 1119, h: 1400 },
  { src: "/galerie/galerie-04.jpg", w: 933, h: 1400 },
  { src: "/galerie/galerie-05.jpg", w: 933, h: 1400 },
  { src: "/galerie/galerie-06.jpg", w: 933, h: 1400 },
  { src: "/galerie/galerie-07.jpg", w: 933, h: 1400 },
  { src: "/galerie/galerie-08.jpg", w: 933, h: 1400 },
  { src: "/galerie/galerie-09.jpg", w: 933, h: 1400 },
  { src: "/galerie/galerie-10.jpg", w: 933, h: 1400 },
  { src: "/galerie/galerie-11.jpg", w: 1050, h: 1400 },
  { src: "/galerie/galerie-12.jpg", w: 1050, h: 1400 },
  { src: "/galerie/galerie-13.jpg", w: 1050, h: 1400 },
];

function Gallery() {
  const tr = useTr();
  const [open, setOpen] = useState<number | null>(null);
  const count = GALLERY.length;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % count));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + count) % count));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, count]);

  return (
    <section className="py-24 border-t border-champagne/15">
      <div className="container-luxe">
        <div className="text-center mb-12">
          <div className="eyebrow mb-4">{tr("Galerie", "Gallery")}</div>
          <h2 className="font-display text-4xl md:text-5xl gold-text">
            {tr("Einblicke in meine Welt", "Glimpses into my world")}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {GALLERY.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setOpen(i)}
              className="group relative aspect-[3/4] overflow-hidden border border-champagne/15 focus:outline-none focus-visible:ring-1 focus-visible:ring-champagne"
              aria-label={tr(`Bild ${i + 1} groß ansehen`, `View image ${i + 1}`)}
            >
              <img
                src={img.src}
                alt={`Lady Vanilla Ice – ${tr("Bild", "Image")} ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                width={img.w}
                height={img.h}
              />
            </button>
          ))}
        </div>
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-50 bg-anthracite/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={GALLERY[open].src}
            alt={`Lady Vanilla Ice – ${tr("Bild", "Image")} ${open + 1}`}
            className="max-h-[90svh] max-w-[92vw] object-contain border border-champagne/20"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute top-4 right-4 p-2 text-vanilla/80 hover:text-champagne"
            aria-label={tr("Schließen", "Close")}
          >
            <X size={28} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((open - 1 + count) % count);
            }}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 text-vanilla/80 hover:text-champagne"
            aria-label={tr("Vorheriges Bild", "Previous image")}
          >
            <ChevronLeft size={36} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((open + 1) % count);
            }}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-2 text-vanilla/80 hover:text-champagne"
            aria-label={tr("Nächstes Bild", "Next image")}
          >
            <ChevronRight size={36} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs tracking-[0.2em] text-vanilla/60">
            {open + 1} / {count}
          </div>
        </div>
      )}
    </section>
  );
}

function UeberMich() {
  const tr = useTr();

  const traits = [
    {
      k: tr("Mein Spiel", "My play"),
      v: tr("Psychologisch, individuell, unberechenbar.", "Psychological, individual, unpredictable."),
    },
    {
      k: tr("Meine Art", "My way"),
      v: tr("Mal hart. Mal weich. Immer echt.", "Sometimes hard. Sometimes soft. Always real."),
    },
    {
      k: tr("Meine Haltung", "My attitude"),
      v: tr("Klar, respektvoll und aufmerksam.", "Clear, respectful and attentive."),
    },
    {
      k: tr("Meine Note", "My signature"),
      v: tr("Elegant – mit einem Hauch Bayern.", "Elegant — with a touch of Bavaria."),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={tr("Über mich", "About me")}
        title={
          <>
            {tr("Keine Domina nach ", "Not a domina by ")}
            <em className="font-script gold-text not-italic">
              {tr("Schema F", "a standard formula")}
            </em>
          </>
        }
        intro={tr(
          "Ich spiele mit deinem Kopf, deinen Erwartungen und dem Wechsel zwischen Härte und Nähe.",
          "I play with your mind, your expectations and the contrast between hardness and closeness."
        )}
      />

      <section className="py-24">
        <div className="container-luxe grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="relative aspect-[4/5] overflow-hidden border border-champagne/15">
              <img
                src={aboutImage}
                alt="Lady Vanilla Ice Portrait"
                className="w-full h-full object-cover"
                loading="lazy"
                width={1280}
                height={1600}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-anthracite/70 via-transparent to-transparent" />
            </div>
            <div className="mt-6 text-xs text-vanilla/40 tracking-wider uppercase">
              {tr("Lady Vanilla Ice · München & Umgebung", "Lady Vanilla Ice · Munich & surroundings")}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="eyebrow mb-3">{tr("Wer ich bin", "Who I am")}</div>
              <h2 className="font-display text-4xl gold-text">
                {tr("Hart. Weich. Unberechenbar.", "Hard. Soft. Unpredictable.")}
              </h2>
            </div>

            <p className="text-base text-vanilla/75 leading-relaxed">
              {tr(
                "Ich bin keine Domina, die ein festes Programm abspult. Ich beobachte, höre zu und erschaffe daraus mein Spiel mit dir.",
                "I am not a domina who follows a fixed programme. I observe, listen and turn that into my play with you."
              )}
            </p>

            <p className="text-base text-vanilla/75 leading-relaxed">
              {tr(
                "Ich kann konsequent und hart sein. Ich kann ruhig, sinnlich und überraschend weich werden. Gerade dieser Wechsel erzeugt das Kopfkino, das meine Sessions besonders macht.",
                "I can be firm and hard. I can become calm, sensual and unexpectedly soft. This contrast creates the mind game that makes my sessions distinctive."
              )}
            </p>

            <p className="font-display text-xl text-vanilla/90 border-l border-champagne/40 pl-5">
              {tr(
                "Du bekommst keine Rolle. Du begegnest mir – ganz auf meine Art.",
                "You do not get a role. You encounter me — entirely my way."
              )}
            </p>

            <div className="grid sm:grid-cols-2 gap-px bg-champagne/15 mt-10">
              {traits.map((it) => (
                <div key={it.k} className="bg-background p-6">
                  <div className="eyebrow mb-2">{it.k}</div>
                  <div className="text-sm text-vanilla/80">{it.v}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-6">
              <Link to="/leistungen" className="btn-outline-gold">
                {tr("Meine Spielwelten", "My worlds of play")}
              </Link>
              <Link to="/buchung" className="btn-gold">
                {tr("Termin anfragen", "Request appointment")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Gallery />
    </>
  );
}
