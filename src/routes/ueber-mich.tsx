import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import aboutImage from "@/assets/about.jpg";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/ueber-mich")({
  head: () => ({
    meta: [
      { title: "Über mich – Lady Vanilla Ice | Domina in München & Umgebung" },
      { name: "description", content: "Lady Vanilla Ice – Domina in München und Umgebung. Diskretion, Zuverlässigkeit und professionelle Führung auf höchstem Niveau." },
      { property: "og:title", content: "Über mich – Domina Lady Vanilla Ice" },
      { property: "og:description", content: "Domina in München & Umgebung. Diskret, zuverlässig, professionell." },
      { property: "og:url", content: "https://lady-vanillaice.com/ueber-mich" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/ueber-mich" }],
  }),
  component: UeberMich,
});

function UeberMich() {
  const tr = useTr();
  return (
    <>
      <PageHeader
        eyebrow={tr("Über mich", "About me")}
        title={
          <>
            {tr("Über ", "About ")}
            <em className="font-script gold-text not-italic">Lady Vanilla Ice</em>
            {tr(" — Führung auf Augenhöhe", " — guidance on equal footing")}
          </>
        }
        intro={tr(
          "Ich bin keine Rolle, die ich anziehe. Ich bin jemand, die zuhört, führt und spürt — genau in dieser Reihenfolge. Wo ehrliche Begegnung auf klare Führung trifft, entsteht das, was ich als Session bezeichne.",
          "I am not a role I put on. I am someone who listens, leads and senses — in exactly that order. Where honest encounter meets clear guidance, that's what I call a session."
        )}
      />

      <section className="py-24">
        <div className="container-luxe grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="relative aspect-[4/5] overflow-hidden border border-champagne/15">
              <img
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
              {tr("Lady Vanilla Ice · München & darüber hinaus", "Lady Vanilla Ice · Munich & beyond")}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="eyebrow mb-3">{tr("Wer ich bin", "Who I am")}</div>
              <h2 className="font-display text-4xl gold-text">
                {tr("Mein Name ist Lady Vanilla Ice.", "My name is Lady Vanilla Ice.")}
              </h2>
            </div>

            <p className="text-base text-vanilla/75 leading-relaxed">
              {tr(
                "Ich stehe noch am Anfang meiner Reise als Domina — und doch fühlt es sich an, als käme ich endlich zu Hause an. Lange Zeit war ich devot unterwegs, habe die Welt aus der anderen Perspektive kennengelernt und tief verinnerlicht, was Vertrauen, Hingabe und klare Absprachen wirklich bedeuten. Dabei schlummerte in mir immer eine andere Seite, die ich kaum je herausgelassen habe: die dominante, souveräne, führende Kraft.",
                "I am still at the beginning of my journey as a domina — and yet it feels like finally coming home. For a long time I moved through this world as a submissive, learning it from the other perspective, deeply internalising what trust, devotion and clear agreements truly mean. All the while another side slumbered inside me that I hardly ever let out: the dominant, self-assured, leading force."
              )}
            </p>

            <p className="text-base text-vanilla/75 leading-relaxed">
              {tr(
                "Heute lasse ich sie endlich raus. Mit Empathie, Präsenz und der Präzision, die ich aus der devoten Haltung gelernt habe, gestalte ich Sessions, in denen Du Dich fallen lassen kannst. Diskretion, Vertrauen und gegenseitiger Respekt bleiben für mich das Fundament — auf Augenhöhe, aber mit mir klar am Steuer.",
                "Today I finally let her out. With empathy, presence and the precision I learned from being submissive, I create sessions in which you can truly let go. Discretion, trust and mutual respect remain the foundation for me — on equal footing, but with me clearly at the helm."
              )}
            </p>

            <div className="grid grid-cols-2 gap-px bg-champagne/15 mt-10">
              {[
                { k: tr("Stil", "Style"), v: tr("Elegant, feminin, kompromisslos.", "Elegant, feminine, uncompromising.") },
                { k: tr("Haltung", "Attitude"), v: tr("Empathisch, klar, präsent.", "Empathetic, clear, present.") },
                { k: tr("Ambiente", "Ambiance"), v: tr("Privat, exklusiv, diskret.", "Private, exclusive, discreet.") },
                { k: tr("Zielgruppe", "Audience"), v: tr("Anspruchsvolle Erwachsene.", "Discerning adults.") },
              ].map((it) => (
                <div key={it.k} className="bg-background p-6">
                  <div className="eyebrow mb-2">{it.k}</div>
                  <div className="text-sm text-vanilla/80">{it.v}</div>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <Link to="/buchung" className="btn-gold">{tr("Termin anfragen", "Request appointment")}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
