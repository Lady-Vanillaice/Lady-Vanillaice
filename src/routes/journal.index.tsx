import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { getSortedPosts } from "../lib/journal-posts";
import { useTr, useLang } from "@/i18n";

export const Route = createFileRoute("/journal/")({
  head: () => ({
    meta: [
      { title: "Journal – Domina-Ratgeber & Session-Reports | Lady Vanilla Ice" },
      {
        name: "description",
        content:
          "Ratgeber, Perspektiven und anonymisierte Session-Reports rund um BDSM, Domina-Sessions und Fetisch — aus erster Hand.",
      },
      { property: "og:title", content: "Journal — Lady Vanilla Ice" },
      {
        property: "og:description",
        content:
          "Ratgeber und Session-Reports: Wie eine Domina-Session wirklich abläuft, was BDSM von Escort unterscheidet, und mehr.",
      },
      { property: "og:url", content: "https://lady-vanillaice.com/journal" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/journal" }],
  }),
  component: JournalIndex,
});

function useFormatDate() {
  const { lang } = useLang();
  return (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
}

function JournalIndex() {
  const posts = getSortedPosts();
  const tr = useTr();
  const formatDate = useFormatDate();
  const { lang } = useLang();
  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title={
          <>
            {tr("Gedanken, Ratgeber & ", "Thoughts, guides & ")}
            <span className="gold-text">{tr("Session-Reports", "session reports")}</span>
          </>
        }
        intro={tr(
          "Zwei bis vier Beiträge im Monat: ehrliche Einblicke in Ablauf, Haltung und Handwerk einer Domina — für Neugierige, First-Timer und Kenner.",
          "Two to four posts a month: honest insights into process, attitude and craft of a domina — for the curious, first-timers and connoisseurs."
        )}
      />
      <section className="py-20">
        <div className="container-luxe max-w-4xl">
          {lang === "en" && (
            <p className="mb-8 text-xs text-vanilla/50 border border-champagne/20 bg-champagne/[0.03] p-4 leading-relaxed">
              The journal posts are only available in German.
            </p>
          )}
          <div className="grid gap-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group border border-champagne/15 bg-anthracite/40 rounded-lg p-8 hover:border-champagne/40 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-3 text-[0.65rem] uppercase tracking-[0.24em] text-champagne/70">
                  <span>{post.category}</span>
                  <span className="text-vanilla/30">•</span>
                  <time dateTime={post.date} className="text-vanilla/50">
                    {formatDate(post.date)}
                  </time>
                  <span className="text-vanilla/30">•</span>
                  <span className="text-vanilla/50">{post.readingMinutes} {tr("min Lesezeit", "min read")}</span>
                </div>
                <h2 className="mt-4 font-display text-2xl md:text-3xl text-vanilla leading-tight">
                  <Link
                    to="/journal/$slug"
                    params={{ slug: post.slug }}
                    className="hover:text-champagne transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-4 text-vanilla/65 leading-relaxed">{post.excerpt}</p>
                <div className="mt-6">
                  <Link
                    to="/journal/$slug"
                    params={{ slug: post.slug }}
                    className="text-[0.7rem] uppercase tracking-[0.24em] text-champagne hover:text-vanilla transition-colors"
                  >
                    {tr("Weiterlesen →", "Read more →")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
