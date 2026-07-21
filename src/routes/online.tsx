import { createFileRoute } from "@tanstack/react-router";
import { Heart, Video, ShoppingBag, Send } from "lucide-react";
import { PageHeader } from "../components/site/PageHeader";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/online")({
  head: () => ({
    meta: [
      { title: "Online — Lady Vanilla Ice" },
      { name: "description", content: "Meine digitalen Plattformen: BestFans, Clips4Sale, Onlineshop und Social Media — exklusive Inhalte und direkter Austausch." },
      { property: "og:title", content: "Online — Lady Vanilla Ice" },
      { property: "og:description", content: "Entdecke meine digitalen Plattformen: exklusive Inhalte, Videos, Shop und Social Media." },
      { property: "og:url", content: "https://lady-vanillaice.com/online" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/online" }],
  }),
  component: OnlinePage,
});

function OnlinePage() {
  const tr = useTr();

  const platforms = [
    {
      icon: Heart,
      title: "BestFans",
      subtitle: (
        <>
          herzblutmadl x Lady_vanillaice
          <br />
          {tr("devote & dominante Seite", "submissive & dominant side")}
        </>
      ),
      cta: tr("Private Welt betreten", "Enter the private world"),
      href: "https://www.bestfans.com/herzblutmadl",
    },
    {
      icon: Video,
      title: "Clips4Sale",
      subtitle: tr("Videos zu Sessions, Fetisch & mehr", "Videos on sessions, fetish & more"),
      cta: tr("Galerie erkunden", "Explore gallery"),
      href: "https://www.clips4sale.com/de/studio/468501/lady-vanillaice",
    },
    {
      icon: ShoppingBag,
      title: tr("Onlineshop", "Online shop"),
      subtitle: tr("Meine Kollektion von A-Z", "My collection from A to Z"),
      cta: tr("Jetzt shoppen", "Shop now"),
      href: "https://herzblutmadl-2.myshopify.com/collections",
    },
    {
      icon: Send,
      title: "Telegram",
      subtitle: tr("Updates, Einblicke & direkter Kontakt", "Updates, insights & direct contact"),
      cta: tr("Folgen", "Follow"),
      href: "https://t.me/ladyvanillaice",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={tr("Meine digitale Welt", "My digital world")}
        title={
          <>
            {tr("Entdecke meine ", "Discover my ")}
            <em className="font-script gold-text not-italic">{tr("Plattformen", "platforms")}</em>
          </>
        }
        intro={tr(
          "Inhalte, Einblicke und exklusive Momente – jenseits der Session. Wähle, was dich am meisten interessiert.",
          "Content, insights and exclusive moments — beyond the session. Choose what interests you most."
        )}
      />

      <section className="py-20">
        <div className="container-luxe max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-champagne/20 border border-champagne/20">
            {platforms.map((platform) => (
              <a
                key={platform.title}
                href={platform.href}
                target="_blank"
                rel="noreferrer"
                className="group relative bg-card p-10 flex flex-col items-center text-center transition-all duration-500 hover:bg-background"
              >
                <div className="mb-8 transition-transform duration-500 group-hover:scale-110">
                  <platform.icon className="text-champagne" size={40} strokeWidth={1.2} />
                </div>
                <h2 className="font-display text-2xl text-vanilla mb-3">{platform.title}</h2>
                <p className="text-xs uppercase tracking-widest text-vanilla/50 leading-relaxed mb-6">
                  {platform.subtitle}
                </p>
                <span className="mt-auto text-[0.65rem] uppercase tracking-[0.2em] text-champagne opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {platform.cta} &rarr;
                </span>
              </a>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="h-px w-24 bg-champagne/30 mx-auto mb-6" />
            <p className="text-[0.65rem] uppercase tracking-[0.5em] text-vanilla/40">
              {tr("Authentisch. Exklusiv. Vanilla Ice.", "Authentic. Exclusive. Vanilla Ice.")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
