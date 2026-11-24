import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, Mail, Phone, RotateCcw, Send, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { deleteCamInterest, listCamInterest, setCamInterestStatus } from "@/lib/cam-interest.functions";

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(value));

/** Admin-Liste der Cam-Interessenten (Anmeldungen über /cam). */
export function CamInterestAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCamInterest);
  const statusFn = useServerFn(setCamInterestStatus);
  const deleteFn = useServerFn(deleteCamInterest);
  const [copied, setCopied] = useState(false);

  const q = useQuery({ queryKey: ["cam-interest"], queryFn: () => listFn() });
  const statusMut = useMutation({
    mutationFn: (value: { id: string; status: "waiting" | "contacted" }) => statusFn({ data: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cam-interest"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cam-interest"] }),
  });

  const waiting = (q.data ?? []).filter((entry) => entry.status === "waiting");
  const contacted = (q.data ?? []).filter((entry) => entry.status === "contacted");

  const copyEmails = async () => {
    const numbers = waiting.map((entry) => `${entry.name}: ${entry.phone ?? "—"}`).join("\n");
    if (!numbers) return;
    try {
      await navigator.clipboard.writeText(numbers);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Telefonnummern kopieren:", numbers);
    }
  };

  const renderEntry = (entry: (typeof waiting)[number]) => (
    <div key={entry.id} className="border border-champagne/15 bg-anthracite/25 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-vanilla">{entry.name}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {entry.phone && (
              <a href={"tel:" + entry.phone.replace(/[^+0-9]/g, "")} className="inline-flex items-center gap-1 text-sm text-champagne hover:underline">
                <Phone size={13} /> {entry.phone}
              </a>
            )}
            {entry.email && (
              <a href={"mailto:" + entry.email} className="inline-flex items-center gap-1 text-xs text-vanilla/60 hover:text-champagne">
                <Mail size={12} /> {entry.email}
              </a>
            )}
          </div>
          {entry.telegram && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-vanilla/60">
              <Send size={12} /> {entry.telegram}
            </div>
          )}
          {entry.message && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-vanilla/70">{entry.message}</p>}
          <div className="mt-2 text-[0.65rem] text-vanilla/40">Eingetragen am {dateLabel(entry.created_at)}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => statusMut.mutate({ id: entry.id, status: entry.status === "waiting" ? "contacted" : "waiting" })}
            disabled={statusMut.isPending || deleteMut.isPending}
            className="p-2 text-vanilla/45 hover:text-champagne disabled:opacity-40"
            title={entry.status === "waiting" ? "Als benachrichtigt markieren" : "Zurück auf wartend"}
            aria-label={entry.status === "waiting" ? "Als benachrichtigt markieren" : "Zurück auf wartend"}
          >
            {entry.status === "waiting" ? <CheckCircle2 size={16} /> : <RotateCcw size={16} />}
          </button>
          <button
            type="button"
            onClick={() => { if (confirm("Diesen Eintrag wirklich löschen?")) deleteMut.mutate(entry.id); }}
            disabled={statusMut.isPending || deleteMut.isPending}
            className="p-2 text-vanilla/45 hover:text-bordeaux disabled:opacity-40"
            title="Eintrag löschen"
            aria-label="Eintrag löschen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="mt-8 border border-champagne/20 bg-card p-5 space-y-5">
      <div className="flex items-start gap-3">
        <Video className="mt-0.5 text-champagne" size={20} />
        <div>
          <div className="eyebrow text-champagne">Cam-Interessenten</div>
          <h2 className="font-display text-xl text-vanilla">Wollen benachrichtigt werden</h2>
          <p className="mt-1 text-xs leading-relaxed text-vanilla/55">
            Anmeldungen über die Seite „Cam-Sessions“. Wenn du wieder Cam-Sessions anbietest, ruf diese Personen an (Nummer antippen) und markiere sie dann als benachrichtigt.
          </p>
        </div>
      </div>

      {q.isLoading ? (
        <p className="text-xs text-vanilla/50">Liste wird geladen…</p>
      ) : q.isError ? (
        <p className="text-xs text-bordeaux">Liste konnte nicht geladen werden.</p>
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="eyebrow text-champagne/80">Wartend ({waiting.length})</div>
              {waiting.length > 0 && (
                <button type="button" onClick={copyEmails} className="inline-flex items-center gap-1 text-xs text-vanilla/60 hover:text-champagne">
                  <Copy size={12} /> {copied ? "Kopiert" : "Alle Nummern kopieren"}
                </button>
              )}
            </div>
            {waiting.length === 0 ? (
              <p className="border border-dashed border-champagne/15 p-4 text-xs text-vanilla/45">Aktuell hat sich niemand eingetragen.</p>
            ) : (
              <div className="space-y-2">{waiting.map(renderEntry)}</div>
            )}
          </div>
          {contacted.length > 0 && (
            <details className="border-t border-champagne/10 pt-4">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-champagne/80">
                Bereits benachrichtigt ({contacted.length})
              </summary>
              <div className="mt-3 space-y-2">{contacted.map(renderEntry)}</div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
