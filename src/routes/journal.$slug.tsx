import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { getPostBySlug, getSortedPosts, type JournalPost } from "../lib/journal-posts";
import { useTr, useLang } from "@/i18n";

export const Route = createFileRoute("/journal/$slug")({
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Beitrag nicht gefunden — Lady Vanilla Ice" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { post } = loaderData;
    const url = `https://lady-vanillaice.com/journal/${post.slug}`;
    return {
      meta: [
        { title: `${post.title} — Lady Vanilla Ice` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: post.date },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: JournalPostView,
  notFoundComponent: PostNotFound,
  errorComponent: () => (
    <div className="min-h-screen pt-40 text-center text-vanilla/60">
      Dieser Beitrag konnte nicht geladen werden. / This post could not be loaded.
    </div>
  ),
});

function PostNotFound() {
  return (
    <div className="min-h-screen pt-40 text-center text-vanilla/60">
      <p>Dieser Beitrag existiert nicht. / This post does not exist.</p>
      <div className="mt-6">
        <Link to="/journal" className="btn-outline-gold">Zum Journal / Back to journal</Link>
      </div>
    </div>
  );
}

function useFormatDate() {
  const { lang } = useLang();
  return (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
}

function renderBlock(block: JournalPost["content"][number], i: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2 key={i} className="font-display text-2xl md:text-3xl text-vanilla mt-12 mb-4">
          {block.text}
        </h2>
      );
    case "p":
      return (
        <p key={i} className="text-vanilla/75 leading-relaxed mt-4">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul key={i} className="mt-4 space-y-2 text-vanilla/75">
          {block.items.map((item, j) => (
            <li key={j} className="flex gap-3">
              <span className="text-champagne">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote
          key={i}
          className="mt-8 border-l-2 border-champagne pl-6 italic text-vanilla/80 font-display text-lg"
        >
          „{block.text}"
        </blockquote>
      );
    case "dl":
      return (
        <dl key={i} className="mt-6 space-y-5">
          {block.items.map((item, j) => (
            <div key={j} className="border-l border-champagne/20 pl-4">
              <dt className="font-display text-lg text-champagne">{item.term}</dt>
              <dd className="mt-1 text-vanilla/75 leading-relaxed">{item.definition}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

function JournalPostView() {
  const { post } = Route.useLoaderData();
  const others = getSortedPosts().filter((p) => p.slug !== post.slug).slice(0, 2);
  const tr = useTr();
  const { lang } = useLang();
  const formatDate = useFormatDate();

  return (
    <>
      <PageHeader
        eyebrow={post.category}
        title={post.title}
        intro={
          <span className="text-[0.75rem] uppercase tracking-[0.24em] text-vanilla/50">
            {formatDate(post.date)} · {post.readingMinutes} {tr("min Lesezeit", "min read")}
          </span>
        }
      />
      <article className="py-16">
        <div className="container-luxe max-w-2xl">
          {lang === "en" && (
            <p className="mb-8 text-xs text-vanilla/50 border border-champagne/20 bg-champagne/[0.03] p-4 leading-relaxed">
              This journal post is only available in German.
            </p>
          )}
          <p className="text-lg text-vanilla/80 leading-relaxed">{post.excerpt}</p>
          <div className="mt-2">{post.content.map(renderBlock)}</div>

          <div className="mt-16 pt-8 border-t border-champagne/15 flex flex-wrap gap-4 justify-between">
            <Link to="/journal" className="text-[0.7rem] uppercase tracking-[0.24em] text-champagne hover:text-vanilla">
              {tr("← Zurück zum Journal", "← Back to journal")}
            </Link>
            <Link to="/buchung" className="btn-outline-gold !py-2 !px-4 !text-[0.62rem]">
              {tr("Termin anfragen", "Request appointment")}
            </Link>
          </div>
        </div>
      </article>

      {others.length > 0 && (
        <section className="py-16 border-t border-champagne/10">
          <div className="container-luxe max-w-4xl">
            <div className="eyebrow mb-8">{tr("Weiterlesen", "Continue reading")}</div>
            <div className="grid md:grid-cols-2 gap-6">
              {others.map((p) => (
                <Link
                  key={p.slug}
                  to="/journal/$slug"
                  params={{ slug: p.slug }}
                  className="block border border-champagne/15 rounded-lg p-6 hover:border-champagne/40 transition-colors"
                >
                  <div className="text-[0.65rem] uppercase tracking-[0.24em] text-champagne/70">
                    {p.category}
                  </div>
                  <h3 className="mt-3 font-display text-xl text-vanilla">{p.title}</h3>
                  <p className="mt-3 text-sm text-vanilla/60">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
