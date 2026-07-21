import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "../../components/site/PageHeader";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  XCircle,
  Trash2,
  Mail,
  Instagram,
  Globe,
  MessageSquare,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  listPhotoshootRequests,
  updatePhotoshootStatus,
  deletePhotoshootRequest,
} from "@/lib/photoshooting.functions";

export const Route = createFileRoute("/_authenticated/admin/fotoshooting")({
  head: () => ({
    meta: [
      { title: "Fotoshooting-Anfragen — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PhotoshootingAdminPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen pt-40 text-center text-vanilla/70">
      <AlertCircle className="mx-auto mb-3 text-bordeaux" />
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen pt-40 text-center text-vanilla/70">
      Keine Anfragen gefunden.
    </div>
  ),
});

type PhotoshootRequest = {
  id: string;
  name: string;
  email: string;
  social_media: string | null;
  shoot_type: string;
  budget_type: "TFP" | "Pay" | "Beides";
  message: string | null;
  status: "pending" | "interested" | "declined";
  created_at: string;
  updated_at: string;
};

function PhotoshootingAdminPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPhotoshootRequests);
  const updateStatusFn = useServerFn(updatePhotoshootStatus);
  const deleteFn = useServerFn(deletePhotoshootRequest);

  const q = useQuery({
    queryKey: ["admin-photoshoot-requests"],
    queryFn: () => listFn() as Promise<PhotoshootRequest[]>,
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: PhotoshootRequest["status"] }) =>
      updateStatusFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-photoshoot-requests"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-photoshoot-requests"] }),
  });

  const pending = q.data?.filter((r) => r.status === "pending") ?? [];
  const interested = q.data?.filter((r) => r.status === "interested") ?? [];
  const declined = q.data?.filter((r) => r.status === "declined") ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<>Fotoshooting <em className="font-script gold-text not-italic">Anfragen</em></>}
        intro="Übersicht aller Fotografen-Anfragen. Status ändern, Social Media Kanäle prüfen und Nachrichten lesen."
      />

      <section className="py-16">
        <div className="container-luxe">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-xs text-vanilla/55 hover:text-champagne uppercase tracking-[0.2em] mb-8"
          >
            <ArrowLeft size={12} /> Zurück zur Übersicht
          </Link>

          {q.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}

          {!q.isLoading && q.data?.length === 0 && (
            <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
              Noch keine Fotoshooting-Anfragen eingegangen.
            </p>
          )}

          {/* Pending */}
          <div className="mb-12">
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-champagne mb-3 flex items-center gap-2">
              <Clock size={14} /> Offen ({pending.length})
            </div>
            {pending.length === 0 ? (
              <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
                Keine offenen Anfragen.
              </p>
            ) : (
              <div className="space-y-4">
                {pending.map((r) => (
                  <RequestCard
                    key={r.id}
                    r={r}
                    onStatusChange={(status) => statusMut.mutate({ id: r.id, status })}
                    onDelete={() => {
                      if (confirm(`Anfrage von "${r.name}" wirklich löschen?`)) deleteMut.mutate(r.id);
                    }}
                    pending={statusMut.isPending || deleteMut.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Interested */}
          {interested.length > 0 && (
            <div className="mb-12">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-green-300 mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} /> Interessiert ({interested.length})
              </div>
              <div className="space-y-4">
                {interested.map((r) => (
                  <RequestCard
                    key={r.id}
                    r={r}
                    onStatusChange={(status) => statusMut.mutate({ id: r.id, status })}
                    onDelete={() => {
                      if (confirm(`Anfrage von "${r.name}" wirklich löschen?`)) deleteMut.mutate(r.id);
                    }}
                    pending={statusMut.isPending || deleteMut.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Declined */}
          {declined.length > 0 && (
            <div>
              <details>
                <summary className="cursor-pointer text-[0.65rem] uppercase tracking-[0.2em] text-vanilla/55 hover:text-champagne mb-3 flex items-center gap-2">
                  <XCircle size={14} /> Abgelehnt ({declined.length})
                </summary>
                <div className="mt-3 space-y-4">
                  {declined.map((r) => (
                    <RequestCard
                      key={r.id}
                      r={r}
                      onStatusChange={(status) => statusMut.mutate({ id: r.id, status })}
                      onDelete={() => {
                        if (confirm(`Anfrage von "${r.name}" wirklich löschen?`)) deleteMut.mutate(r.id);
                      }}
                      pending={statusMut.isPending || deleteMut.isPending}
                    />
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function RequestCard({
  r,
  onStatusChange,
  onDelete,
  pending,
}: {
  r: PhotoshootRequest;
  onStatusChange: (status: PhotoshootRequest["status"]) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const statusMap = {
    pending: { label: "Neu", cls: "bg-champagne/15 text-champagne" },
    interested: { label: "Interessiert", cls: "bg-green-700/30 text-green-200" },
    declined: { label: "Abgelehnt", cls: "bg-bordeaux/40 text-vanilla" },
  } as const;
  const s = statusMap[r.status];

  const budgetLabel = {
    TFP: "TFP (Time for Print)",
    Pay: "Pay (Bezahltes Shooting)",
    Beides: "Beides möglich",
  }[r.budget_type];

  return (
    <div className="bg-card border border-champagne/15 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-champagne/10 flex items-center justify-center flex-shrink-0">
            <Camera size={18} className="text-champagne" />
          </div>
          <div>
            <div className="font-display text-lg text-vanilla">{r.name}</div>
            <a
              href={`mailto:${r.email}`}
              className="text-xs text-champagne hover:underline inline-flex items-center gap-1"
            >
              <Mail size={11} /> {r.email}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[0.6rem] uppercase tracking-[0.2em] px-2 py-1 ${s.cls}`}>
            {s.label}
          </span>
          <span className="text-[0.65rem] text-vanilla/45">
            {format(new Date(r.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
          </span>
        </div>
      </div>

      {/* Social Media */}
      {r.social_media && (
        <div className="mb-4">
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1 flex items-center gap-1">
            <Globe size={11} /> Social Media / Portfolio
          </div>
          <p className="text-sm text-vanilla/80 bg-anthracite/40 p-3 border border-champagne/10">
            {r.social_media}
          </p>
        </div>
      )}

      {/* Shoot Info */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1 flex items-center gap-1">
            <Camera size={11} /> Shoot-Konzept
          </div>
          <p className="text-sm text-vanilla/80">{r.shoot_type}</p>
        </div>
        <div>
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1">Budget</div>
          <span className="text-sm text-champagne">{budgetLabel}</span>
        </div>
      </div>

      {/* Message */}
      {r.message && (
        <div className="mb-4">
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1 flex items-center gap-1">
            <MessageSquare size={11} /> Nachricht
          </div>
          <p className="text-sm text-vanilla/80 leading-relaxed bg-anthracite/40 p-3 border border-champagne/10 whitespace-pre-line">
            {r.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          disabled={r.status === "interested" || pending}
          onClick={() => onStatusChange("interested")}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"
        >
          <CheckCircle2 size={12} className="inline mr-1" /> Interessiert
        </button>
        <button
          disabled={r.status === "declined" || pending}
          onClick={() => onStatusChange("declined")}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux/60 text-bordeaux hover:bg-bordeaux/10 disabled:opacity-30"
        >
          <XCircle size={12} className="inline mr-1" /> Ablehnen
        </button>
        <button
          disabled={r.status === "pending" || pending}
          onClick={() => onStatusChange("pending")}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-vanilla/20 text-vanilla/55 hover:bg-vanilla/5 disabled:opacity-30"
        >
          Zurücksetzen
        </button>
        <button
          disabled={pending}
          onClick={onDelete}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux/50 text-bordeaux hover:bg-bordeaux/10 disabled:opacity-30 inline-flex items-center gap-1"
        >
          <Trash2 size={12} /> Löschen
        </button>
      </div>
    </div>
  );
}
