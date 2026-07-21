import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "../components/site/PageHeader";
import { LegalGermanOnlyNotice } from "../components/site/LegalGermanOnlyNotice";
import { getSiteContent } from "../lib/site-content.functions";

export const Route = createFileRoute("/agb")({
  head: () => ({
    meta: [
      { title: "AGB — Lady Vanilla Ice" },
      { name: "description", content: "Allgemeine Geschäftsbedingungen." },
      { property: "og:url", content: "https://lady-vanillaice.com/agb" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/agb" }],
  }),
  component: AgbPage,
});

function AgbPage() {
  const fetchFn = useServerFn(getSiteContent);
  const { data, isLoading } = useQuery({
    queryKey: ["site-content", "agb"],
    queryFn: () => fetchFn({ data: { slug: "agb" } }),
  });

  const body = data?.body?.trim() ?? "";

  return (
    <>
      <PageHeader eyebrow="AGB" title="Allgemeine Geschäftsbedingungen" />
      <LegalGermanOnlyNotice />
      <section className="py-20">
        <div className="container-luxe max-w-2xl text-vanilla/75 leading-relaxed">
          {isLoading ? (
            <p className="text-vanilla/50 text-sm">Wird geladen…</p>
          ) : body ? (
            <div className="whitespace-pre-wrap">{body}</div>
          ) : (
            <p className="text-vanilla/50 text-sm italic">
              Die AGB wurden noch nicht hinterlegt.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
