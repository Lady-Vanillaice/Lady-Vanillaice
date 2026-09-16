import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllTestimonials, updateTestimonialStatus, deleteTestimonial } from "@/lib/testimonials.functions";
import { PageHeader } from "@/components/site/PageHeader";
import { ArrowLeft, CheckCircle2, XCircle, Trash2, Star, Quote, Download, Images } from "lucide-react";
import { useState } from "react";
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

const STATUS_WIDTH = 1080;
const STATUS_HEIGHT = 1920;
const GOLD = "#c8a86b";
const VANILLA = "#f5efe5";
const MUTED = "#aaa39a";
const BG = "#090909";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.trim().split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png", 1);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function createTestimonialStatusCanvas(t: TestimonialRow, monthLabel?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = STATUS_WIDTH;
  canvas.height = STATUS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas konnte nicht erstellt werden.");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, STATUS_WIDTH, STATUS_HEIGHT);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  roundedRect(ctx, 54, 54, STATUS_WIDTH - 108, STATUS_HEIGHT - 108, 8);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  roundedRect(ctx, 70, 70, STATUS_WIDTH - 140, STATUS_HEIGHT - 140, 5);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = "600 42px Georgia, serif";
  ctx.fillText("♕", STATUS_WIDTH / 2, 150);
  ctx.font = "600 42px Georgia, serif";
  ctx.fillText("LADY VANILLA ICE", STATUS_WIDTH / 2, 225);
  ctx.fillStyle = VANILLA;
  ctx.font = "500 19px Arial, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("ERFAHRUNGSBERICHT", STATUS_WIDTH / 2, 270);
  ctx.letterSpacing = "0px";

  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(185, 315);
  ctx.lineTo(895, 315);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.fillStyle = GOLD;
  ctx.font = "600 34px Georgia, serif";
  ctx.fillText(t.pseudonym || "Anonym", 120, 405);

  if (t.rating !== null) {
    ctx.fillStyle = GOLD;
    ctx.font = "30px Arial, sans-serif";
    ctx.fillText("★".repeat(Math.max(0, Math.min(5, t.rating))), 120, 452);
  }

  const maxTextWidth = 840;
  let fontSize = 42;
  let lines: string[] = [];
  let lineHeight = 60;
  const maxTextHeight = 950;
  do {
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    lineHeight = Math.round(fontSize * 1.45);
    lines = wrapLines(ctx, t.content, maxTextWidth);
    if (lines.length * lineHeight <= maxTextHeight) break;
    fontSize -= 2;
  } while (fontSize >= 28);

  ctx.fillStyle = VANILLA;
  ctx.font = `italic ${fontSize}px Georgia, serif`;
  let y = 570;
  for (const line of lines) {
    if (y > 1505) break;
    ctx.fillText(line, 120, y);
    y += lineHeight;
  }

  const date = new Date(t.created_at);
  const dateLabel = date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = "24px Arial, sans-serif";
  ctx.fillText(monthLabel ? `${monthLabel} · ${dateLabel}` : dateLabel, STATUS_WIDTH / 2, 1675);

  ctx.fillStyle = GOLD;
  ctx.font = "600 24px Georgia, serif";
  ctx.fillText("LADY-VANILLAICE.COM", STATUS_WIDTH / 2, 1760);
  ctx.fillStyle = MUTED;
  ctx.font = "18px Arial, sans-serif";
  ctx.fillText("Diskret. Persönlich. Echt.", STATUS_WIDTH / 2, 1805);

  return canvas;
}

function exportSingleTestimonial(t: TestimonialRow) {
  const canvas = createTestimonialStatusCanvas(t);
  const day = format(new Date(t.created_at), "yyyy-MM-dd");
  downloadCanvas(canvas, `erfahrungsbericht-${day}-${safeFilename(t.pseudonym || "anonym")}.png`);
}

async function exportTestimonialsForMonth(testimonials: TestimonialRow[], month: string) {
  const selected = testimonials
    .filter((t) => t.status === "approved" && t.created_at.slice(0, 7) === month)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (selected.length === 0) {
    alert("Für diesen Monat gibt es keine veröffentlichten Erfahrungsberichte.");
    return;
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  for (let index = 0; index < selected.length; index += 1) {
    const t = selected[index];
    const canvas = createTestimonialStatusCanvas(t, monthLabel);
    downloadCanvas(
      canvas,
      `erfahrungsberichte-${month}-${String(index + 1).padStart(2, "0")}-${safeFilename(t.pseudonym || "anonym")}.png`,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  }
}

function AdminTestimonialsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllTestimonials);
  const updateFn = useServerFn(updateTestimonialStatus);
  const deleteFn = useServerFn(deleteTestimonial);
  const [exportMonth, setExportMonth] = useState(format(new Date(), "yyyy-MM"));
  const [exportingMonth, setExportingMonth] = useState(false);

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
  const monthCount = approved.filter((t) => t.created_at.slice(0, 7) === exportMonth).length;

  const handleMonthExport = async () => {
    setExportingMonth(true);
    try {
      await exportTestimonialsForMonth(q.data ?? [], exportMonth);
    } finally {
      setExportingMonth(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<><em className="font-script gold-text not-italic">Erfahrungsberichte</em></>}
        intro="Eingereichte Erfahrungsberichte freigeben, ablehnen und als WhatsApp-Statusbild exportieren."
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

          <div className="mb-8 border border-champagne/25 bg-card p-5">
            <div className="flex items-start gap-3">
              <Images size={20} className="mt-0.5 shrink-0 text-champagne" />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-[0.2em] text-champagne">WhatsApp Status</div>
                <p className="mt-1 text-sm leading-relaxed text-vanilla/60">
                  Veröffentlichte Erfahrungsberichte im Hochformat 1080 × 1920 exportieren. Einzeln direkt am Bericht oder alle aus einem Monat auf einmal.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="block">
                    <span className="mb-1 block text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/50">Monat</span>
                    <input
                      type="month"
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      className="input-luxe min-w-44"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleMonthExport}
                    disabled={exportingMonth || monthCount === 0}
                    className="btn-gold !py-2.5 !px-4 !text-[0.65rem] disabled:opacity-40"
                  >
                    <Download size={13} />
                    {exportingMonth ? "Bilder werden erstellt…" : `Monat exportieren (${monthCount})`}
                  </button>
                </div>
                <p className="mt-2 text-[0.65rem] text-vanilla/40">
                  Jeder veröffentlichte Bericht wird als eigenes Statusbild gespeichert.
                </p>
              </div>
            </div>
          </div>

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
            <details className="text-sm" open={approved.length > 0}>
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
        {t.status === "approved" && (
          <button
            type="button"
            onClick={() => exportSingleTestimonial(t)}
            className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10"
          >
            <Download size={12} className="inline mr-1" /> Statusbild
          </button>
        )}
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
