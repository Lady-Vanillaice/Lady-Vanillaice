import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllTestimonials, updateTestimonialStatus, deleteTestimonial } from "@/lib/testimonials.functions";
import { PageHeader } from "@/components/site/PageHeader";
import { ArrowLeft, CheckCircle2, XCircle, Trash2, Star, Quote } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/erfahrungsberichte")({
  head: () => ({ meta: [{ title: "Erfahrungsberichte — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminTestimonialsPage,
});

type TestimonialRow = {
  id: string;
  pseudonym: string;
  content: string;
  rating: number | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
};

function AdminTestimonialsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllTestimonials);
  const updateFn = useServerFn(updateTestimonialStatus);
  const deleteFn = useServerFn(deleteTestimonial);

  const q = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: () => listFn() as Promise<TestimonialRow[]>,
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" | "pending" }) =>
      updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-testimonials"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-testimonials"] }),
  });

  const pending = q.data?.filter((t) => t.status === "pending") ?? [];
  const approved = q.data?.filter((t) => t.status === "approved") ?? [];
  const rejected = q.data?.filter((t) => t.status === "rejected") ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<><em className="font-script gold-text not-italic">Erfahrungsberichte</em></>}
        intro="Eingereichte Erfahrungsberichte freigeben oder ablehnen."
      />
      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <div className="mb-8">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zum Admin-Bereich
            </Link>
          </div>

          <h2 className="font-display text-3xl gold-text flex items-center gap-3 mb-5">
            <Quote size={22} /> Erfahrungsberichte
          </h2>

          {q.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}

          <div className="mb-6">
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-champagne mb-3">
              Offen ({pending.length})
            </div>
            {pending.length === 0 ? (
              <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
                Keine neuen Erfahrungsberichte zur Freigabe.
              </p>
            ) : (
              <div className="space-y-3">
                {pending.map((t) => (
                  <TestimonialAdminCard
                    key={t.id}
                    t={t}
                    onApprove={() => statusMut.mutate({ id: t.id, status: "approved" })}
                    onReject={() => statusMut.mutate({ id: t.id, status: "rejected" })}
                    onDelete={() => {
                      if (confirm("Diesen Erfahrungsbericht endgültig löschen?")) deleteMut.mutate(t.id);
                    }}
                    pending={statusMut.isPending || deleteMut.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          {(approved.length > 0 || rejected.length > 0) && (
            <details className="text-sm">
              <summary className="cursor-pointer text-vanilla/55 hover:text-champagne text-xs uppercase tracking-[0.2em]">
                Bereits bearbeitet ({approved.length + rejected.length})
              </summary>
              <div className="mt-3 space-y-3">
                {[...approved, ...rejected].map((t) => (
                  <TestimonialAdminCard
                    key={t.id}
                    t={t}
                    onApprove={() => statusMut.mutate({ id: t.id, status: "approved" })}
                    onReject={() => statusMut.mutate({ id: t.id, status: "rejected" })}
                    onDelete={() => {
                      if (confirm("Diesen Erfahrungsbericht endgültig löschen?")) deleteMut.mutate(t.id);
                    }}
                    pending={statusMut.isPending || deleteMut.isPending}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      </section>
    </>
  );
}

function TestimonialAdminCard({
  t,
  onApprove,
  onReject,
  onDelete,
  pending,
}: {
  t: TestimonialRow;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const statusMap = {
    pending: { label: "Neu", cls: "bg-champagne/15 text-champagne" },
    approved: { label: "Veröffentlicht", cls: "bg-green-700/30 text-green-200" },
    rejected: { label: "Abgelehnt", cls: "bg-bordeaux/40 text-vanilla" },
  } as const;
  const s = statusMap[t.status];

  return (
    <div className="bg-card border border-champagne/15 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-display text-lg text-vanilla">{t.pseudonym}</div>
          {t.rating !== null && (
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={i < (t.rating ?? 0) ? "fill-champagne text-champagne" : "text-vanilla/20"}
                />
              ))}
            </div>
          )}
        </div>
        <span className={`text-[0.6rem] uppercase tracking-[0.2em] px-2 py-1 ${s.cls}`}>{s.label}</span>
      </div>

      <p className="text-sm text-vanilla/80 leading-relaxed bg-anthracite/40 p-3 border border-champagne/10 whitespace-pre-line italic">
        {t.content}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={t.status === "approved" || pending}
          onClick={onApprove}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10 disabled:opacity-30"
        >
          <CheckCircle2 size={12} className="inline mr-1" /> Freigeben
        </button>
        <button
          disabled={t.status === "rejected" || pending}
          onClick={onReject}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux/60 text-bordeaux hover:bg-bordeaux/10 disabled:opacity-30"
        >
          <XCircle size={12} className="inline mr-1" /> Ablehnen
        </button>
        <button
          disabled={pending}
          onClick={onDelete}
          className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-vanilla/20 text-vanilla/60 hover:bg-vanilla/5 disabled:opacity-30"
        >
          <Trash2 size={12} className="inline mr-1" /> Löschen
        </button>
      </div>

      <div className="mt-3 text-[0.65rem] text-vanilla/35">
        Eingegangen: {format(new Date(t.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
      </div>
    </div>
  );
}
