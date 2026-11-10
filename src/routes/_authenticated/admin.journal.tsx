import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BookOpen, Download, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { getSortedPosts, type JournalPost } from "@/lib/journal-posts";
import { createJournalStatusImage } from "@/lib/journal-status-image";

export const Route = createFileRoute("/_authenticated/admin/journal")({
  head: () => ({
    meta: [
      { title: "Journal — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminJournalPage,
});

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function AdminJournalPage() {
  const posts = getSortedPosts();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadStatusImage(post: JournalPost) {
    setBusySlug(post.slug);
    setError(null);
    try {
      await createJournalStatusImage(post, { downloadOnly: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Das Statusbild konnte nicht erstellt werden.");
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin · Inhalte"
        title={<>Dein <em className="font-script gold-text not-italic">Journal</em></>}
        intro="Lade Journalbeiträge im WhatsApp-Statusformat herunter und veröffentliche sie anschließend direkt in deinem Status."
      />
      <section className="py-12 md:py-16">
        <div className="container-luxe max-w-4xl">
          <Link
            to="/admin"
            className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-vanilla/55 hover:text-champagne"
          >
            <ArrowLeft size={13} /> Zurück zum Admin-Bereich
          </Link>

          <div className="mb-8 flex items-start gap-3 border border-champagne/25 bg-card p-5">
            <Download size={20} className="mt-0.5 shrink-0 text-champagne" />
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-champagne">WhatsApp Status</div>
              <p className="mt-1 text-sm leading-relaxed text-vanilla/65">
                Das Statusbild wird im Hochformat 1080 × 1920 als PNG heruntergeladen. Danach kannst du es in WhatsApp unter „Aktuelles“ als Status hochladen.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="mb-5 border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200">
              {error}
            </p>
          )}

          {posts.length === 0 ? (
            <p className="border border-dashed border-champagne/20 p-6 text-center text-sm text-vanilla/50">
              Aktuell sind keine Journalbeiträge vorhanden.
            </p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article key={post.slug} className="border border-champagne/20 bg-card/70 p-5 md:p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-champagne/75">
                    <span>{post.category}</span>
                    <span className="text-vanilla/30">·</span>
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span className="text-vanilla/30">·</span>
                    <span>{post.readingMinutes} min Lesezeit</span>
                  </div>
                  <h2 className="font-display text-2xl text-vanilla">{post.title}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-vanilla/65">{post.excerpt}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void downloadStatusImage(post)}
                      disabled={busySlug !== null}
                      className="btn-gold !px-4 !py-2.5 !text-[0.65rem] disabled:opacity-50"
                    >
                      <Download size={14} />
                      {busySlug === post.slug ? "Statusbild wird erstellt…" : "Statusbild herunterladen"}
                    </button>
                    <Link
                      to="/journal/$slug"
                      params={{ slug: post.slug }}
                      className="btn-outline-gold !px-4 !py-2.5 !text-[0.65rem]"
                    >
                      <ExternalLink size={14} /> Beitrag ansehen
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-6 flex items-center gap-2 text-xs text-vanilla/45">
            <BookOpen size={13} /> Änderungen am Journaltext erfolgen weiterhin über den Quellinhalt der Website.
          </p>
        </div>
      </section>
    </>
  );
}
