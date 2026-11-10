import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { GiftGuideContent } from "../components/site/GiftGuideContent";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/geschenke-wuensche")({
  head: () => ({
    meta: [
      { title: "Geschenke & Wünsche — Lady Vanilla Ice" },
      { name: "description", content: "Ein paar persönliche Denkanstöße für Geschenke, die mir Freude machen." },
      { property: "og:title", content: "Geschenke & Wünsche — Lady Vanilla Ice" },
      { property: "og:description", content: "Eine persönliche Wunschliste mit Ideen von herzhaft bis goldfarben." },
      { property: "og:url", content: "https://lady-vanillaice.com/geschenke-wuensche" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/geschenke-wuensche" }],
  }),
  component: GiftsAndWishes,
});

function GiftsAndWishes() {
  const tr = useTr();

  return (
    <>
      <PageHeader
        eyebrow={tr("Eine kleine Wunschliste", "A little wish list")}
        title={
          <>
            {tr("Geschenke ", "Gifts ")}
            <em className="font-script gold-text not-italic">{tr("& Wünsche", "& Wishes")}</em>
          </>
        }
        intro={tr(
          "Wenn du mir gern etwas schenken möchtest, findest du hier ein paar persönliche Denkanstöße. Die Liste ist Inspiration, keine Erwartung.",
          "If you would like to give me something, here are a few personal ideas. This list is inspiration, never an expectation."
        )}
      />
      <section className="py-16 md:py-24">
        <div className="container-luxe max-w-4xl">
          <GiftGuideContent />
          <div className="pt-10 text-center">
            <Link to="/kontakt" className="btn-outline-gold">
              {tr("Persönlich fragen", "Ask personally")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
