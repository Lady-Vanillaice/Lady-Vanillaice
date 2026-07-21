import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { LegalGermanOnlyNotice } from "../components/site/LegalGermanOnlyNotice";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum — Lady Vanilla Ice" },
      { name: "description", content: "Impressum und Anbieterkennzeichnung." },
      { property: "og:url", content: "https://lady-vanillaice.com/impressum" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/impressum" }],
  }),
  component: Impressum,
});

function Impressum() {
  return (
    <>
      <PageHeader eyebrow="Impressum" title="Anbieterkennzeichnung" />
      <LegalGermanOnlyNotice />
      <section className="py-20">
        <div className="container-luxe max-w-2xl space-y-6 text-vanilla/75 leading-relaxed">
          <p>
            Angaben gemäß § 5 TMG.
          </p>
          <div>
            <h2 className="eyebrow mb-2">Verantwortlich für den Inhalt</h2>
            <p>Lady-Vanillaice gehört zu Herzblutmadls - Selina Gorgosch</p>
            <p>c/o Online-Impressum #5814</p>
            <p>Europaring 90</p>
            <p>53757 St. Augustin</p>
          </div>
          <div>
            <h2 className="eyebrow mb-2">Kontakt</h2>
            <p>E-Mail: <a href="mailto:Lady-vanillaice@gmx.net" className="hover:text-champagne transition">Lady-vanillaice@gmx.net</a></p>
            <p>Telegram: <a href="https://t.me/ladyvanillaice" target="_blank" rel="noopener noreferrer" className="hover:text-champagne transition">@ladyvanillaice</a></p>
          </div>
        </div>
      </section>
    </>
  );
}
