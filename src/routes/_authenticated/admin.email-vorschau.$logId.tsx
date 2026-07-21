import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, AlertCircle, Mail } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { previewEmail } from "@/lib/booking.functions";

export const Route = createFileRoute("/_authenticated/admin/email-vorschau/$logId")({
  head: () => ({
    meta: [
      { title: "E-Mail Vorschau — Lady Vanilla Ice" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EmailPreviewPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen pt-40 text-center text-vanilla/70">
      <AlertCircle className="mx-auto mb-3 text-bordeaux" />
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen pt-40 text-center text-vanilla/70">
      E-Mail nicht gefunden.
    </div>
  ),
});

function prettyStatus(status: string) {
  switch (status) {
    case "sent": return "✓ zugestellt";
    case "pending": return "wird versendet…";
    case "failed":
    case "dlq": return "fehlgeschlagen";
    case "bounced": return "unzustellbar";
    case "suppressed": return "blockiert";
    case "complained": return "als Spam markiert";
    default: return status;
  }
}

function EmailPreviewPage() {
  const { logId } = Route.useParams();
  const fetchPreview = useServerFn(previewEmail);

  const q = useQuery({
    queryKey: ["email-preview", logId],
    queryFn: () => fetchPreview({ data: { logId } }),
  });

  if (q.isLoading) {
    return <div className="min-h-screen pt-40 text-center text-vanilla/60">Lade Vorschau…</div>;
  }
  if (q.error) {
    return (
      <div className="min-h-screen pt-40 text-center text-bordeaux">
        {(q.error as Error).message}
      </div>
    );
  }
  const data = q.data!;

  return (
    <section className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => window.close()}
        className="text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/60 hover:text-champagne mb-6 inline-flex items-center gap-2"
      >
        <ArrowLeft size={12} /> Schließen
      </button>

      <div className="bg-card border border-champagne/15 p-6 mb-6">
        <div className="eyebrow mb-4 flex items-center gap-2">
          <Mail size={12} /> E-Mail Vorschau
        </div>
        <dl className="text-sm space-y-2">
          <div className="flex flex-wrap gap-2">
            <dt className="text-vanilla/50 w-28">Betreff:</dt>
            <dd className="text-vanilla flex-1">{data.subject || "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-vanilla/50 w-28">An:</dt>
            <dd className="text-vanilla flex-1">{data.recipient_email}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-vanilla/50 w-28">Gesendet am:</dt>
            <dd className="text-vanilla flex-1">
              {format(new Date(data.created_at), "dd.MM.yyyy 'um' HH:mm", { locale: de })}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-vanilla/50 w-28">Status:</dt>
            <dd className="text-vanilla flex-1">{prettyStatus(data.status)}</dd>
          </div>
          {data.error_message && (
            <div className="flex flex-wrap gap-2">
              <dt className="text-vanilla/50 w-28">Fehler:</dt>
              <dd className="text-bordeaux flex-1">{data.error_message}</dd>
            </div>
          )}
        </dl>
      </div>

      {data.renderError ? (
        <div className="bg-card border border-bordeaux/40 p-6 text-bordeaux text-sm">
          Vorschau konnte nicht erstellt werden: {data.renderError}
        </div>
      ) : (
        <div className="bg-white border border-champagne/15">
          <iframe
            title="E-Mail Inhalt"
            srcDoc={data.html}
            className="w-full min-h-[70vh] bg-white"
            sandbox=""
          />
        </div>
      )}
    </section>
  );
}
