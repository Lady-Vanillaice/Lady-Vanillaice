import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Download } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { STATUS_CARDS, downloadStatusImages, renderStatusPreviews } from "@/lib/category-status-images";

export const Route = createFileRoute("/_authenticated/admin/statusbilder")({
  head: () => ({
    meta: [
      { title: "Statusbilder — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StatusbilderPage,
});

function StatusbilderPage() {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    renderStatusPreviews(STATUS_CARDS)
      .then(setPreviews)
      .catch(() => setError("Die Vorschau konnte nicht geladen werden."));
  }, []);

  const toggle = (key: string) =>
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  const allSelected = selected.length === STATUS_CARDS.length;

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadStatusImages(STATUS_CARDS.filter((c) => selected.includes(c.key)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Die Statusbilder konnten nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin · WhatsApp"
        title={<>Status<em className="font-script gold-text not-italic">bilder</em></>}
        intro="Tippe die Kategorien an, die du posten willst, und lade sie als Bild herunter. Danach kannst du sie in WhatsApp als Status hochladen."
      />
      <section className="py-10 md:py-14">
        <div className="container-luxe max-w-5xl">
          <Link
            to="/admin"
            className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-vanilla/55 hover:text-champagne"
          >
            <ArrowLeft size={13} /> Zurück zum Admin-Bereich
          </Link>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(allSelected ? [] : STATUS_CARDS.map((c) => c.key))}
              className="btn-outline-gold !px-4 !py-2.5 !text-[0.65rem]"
            >
              {allSelected ? "Auswahl aufheben" : "Alle auswählen"}
            </button>
            <span className="text-xs text-vanilla/55">{selected.length} ausgewählt</span>
          </div>

          {error && (
            <p role="alert" className="mb-5 border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {STATUS_CARDS.map((card) => {
              const active = selected.includes(card.key);
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => toggle(card.key)}
                  aria-pressed={active}
                  className={`relative border text-left transition ${active ? "border-champagne ring-2 ring-champagne/60" : "border-champagne/20 hover:border-champagne/50"}`}
                >
                  <div className="aspect-[9/16] bg-card">
                    {previews[card.key] ? (
                      <img src={previews[card.key]} alt={`Statusbild ${card.title}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-vanilla/40">Lädt …</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2.5">
                    <span className="font-display text-base leading-tight text-vanilla">{card.title}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border ${active ? "border-champagne bg-champagne text-background" : "border-champagne/40"}`}
                    >
                      {active && <Check size={13} />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="sticky bottom-4 mt-8">
            <button
              type="button"
              onClick={() => void download()}
              disabled={busy || selected.length === 0}
              className="btn-gold w-full justify-center disabled:opacity-50"
            >
              <Download size={15} />
              {busy
                ? "Bilder werden erstellt …"
                : selected.length === 0
                  ? "Erst Kategorien auswählen"
                  : `${selected.length} ${selected.length === 1 ? "Bild" : "Bilder"} herunterladen`}
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-vanilla/50">
            Auf dem Handy öffnet sich das Teilen-Menü: Wähle „Bilder sichern“ oder direkt WhatsApp. Die Bilder sind im Statusformat 1080 × 1920.
          </p>
        </div>
      </section>
    </>
  );
}
