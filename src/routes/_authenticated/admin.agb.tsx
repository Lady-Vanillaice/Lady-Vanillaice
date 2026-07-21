import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { getSiteContent, upsertSiteContent } from "@/lib/site-content.functions";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/agb")({
  head: () => ({ meta: [{ title: "AGB bearbeiten — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminAgbPage,
});

function AdminAgbPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSiteContent);
  const saveFn = useServerFn(upsertSiteContent);

  const q = useQuery({
    queryKey: ["site-content", "agb"],
    queryFn: () => getFn({ data: { slug: "agb" } }),
  });

  const [body, setBody] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (q.data && !dirty) setBody(q.data.body ?? "");
  }, [q.data, dirty]);

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { slug: "agb", body } }),
    onSuccess: () => {
      setDirty(false);
      setSavedAt(Date.now());
      qc.invalidateQueries({ queryKey: ["site-content", "agb"] });
    },
  });

  return (
    <>
      <PageHeader eyebrow="Admin" title="AGB bearbeiten" intro="Füge hier deinen rechtlichen Text ein. Er wird 1:1 auf der öffentlichen AGB-Seite angezeigt." />
      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zurück
            </Link>
            <Link to="/agb" className="text-xs text-champagne hover:underline">Vorschau ansehen</Link>
          </div>

          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setDirty(true); }}
            rows={24}
            placeholder="Hier deinen AGB-Text einfügen…"
            className="w-full bg-anthracite border border-champagne/20 p-4 text-sm text-vanilla font-mono leading-relaxed focus:outline-none focus:border-champagne/60"
          />

          {saveMut.error && (
            <div className="mt-3 text-sm text-destructive">
              {saveMut.error instanceof Error ? saveMut.error.message : "Speichern fehlgeschlagen."}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              disabled={saveMut.isPending || !dirty}
              onClick={() => saveMut.mutate()}
              className="btn-gold disabled:opacity-40"
            >
              <Save size={14} />
              {saveMut.isPending ? "Speichert…" : "Speichern"}
            </button>
            {savedAt && !dirty && (
              <span className="text-xs text-champagne/80 inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> Gespeichert
              </span>
            )}
            {q.data?.updated_at && (
              <span className="text-xs text-vanilla/45">
                Zuletzt aktualisiert: {new Date(q.data.updated_at).toLocaleString("de-DE")}
              </span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
