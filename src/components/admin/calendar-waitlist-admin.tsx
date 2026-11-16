import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Mail, RotateCcw, Trash2, Users } from "lucide-react";
import {
  deleteCalendarWaitlistEntry,
  listCalendarWaitlist,
  setCalendarWaitlistStatus,
} from "@/lib/calendar-waitlist.functions";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value + "T12:00:00"));
}

export function CalendarWaitlistAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCalendarWaitlist);
  const statusFn = useServerFn(setCalendarWaitlistStatus);
  const deleteFn = useServerFn(deleteCalendarWaitlistEntry);

  const q = useQuery({
    queryKey: ["calendar-waitlist"],
    queryFn: () => listFn(),
  });

  const statusMut = useMutation({
    mutationFn: (value: { id: string; status: "waiting" | "contacted" }) =>
      statusFn({ data: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-waitlist"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-waitlist"] }),
  });

  const waiting = (q.data ?? []).filter((entry) => entry.status === "waiting");
  const contacted = (q.data ?? []).filter((entry) => entry.status === "contacted");

  const renderEntry = (entry: (typeof waiting)[number]) => (
    <div
      key={entry.id}
      className="border border-champagne/15 bg-anthracite/25 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-champagne">{dateLabel(entry.waitlist_date)}</div>
          <div className="mt-1 text-sm text-vanilla">{entry.name}</div>
          <a
            href={"mailto:" + entry.email}
            className="mt-1 inline-flex items-center gap-1 text-xs text-vanilla/60 hover:text-champagne"
          >
            <Mail size={12} />
            {entry.email}
          </a>
          <div className="mt-2 text-xs text-vanilla/70">
            Kann von <span className="text-champagne">{entry.available_from}</span>
            {" bis "}
            <span className="text-champagne">{entry.available_to}</span> Uhr
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              statusMut.mutate({
                id: entry.id,
                status: entry.status === "waiting" ? "contacted" : "waiting",
              })
            }
            disabled={statusMut.isPending || deleteMut.isPending}
            className="p-2 text-vanilla/45 hover:text-champagne disabled:opacity-40"
            title={entry.status === "waiting" ? "Als kontaktiert markieren" : "Zurück auf wartend"}
            aria-label={entry.status === "waiting" ? "Als kontaktiert markieren" : "Zurück auf wartend"}
          >
            {entry.status === "waiting" ? <CheckCircle2 size={16} /> : <RotateCcw size={16} />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Diesen Wartelisten-Eintrag wirklich löschen?")) {
                deleteMut.mutate(entry.id);
              }
            }}
            disabled={statusMut.isPending || deleteMut.isPending}
            className="p-2 text-vanilla/45 hover:text-bordeaux disabled:opacity-40"
            title="Wartelisten-Eintrag löschen"
            aria-label="Wartelisten-Eintrag löschen"
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
        <Users className="mt-0.5 text-champagne" size={20} />
        <div>
          <div className="eyebrow text-champagne">Warteliste</div>
          <h2 className="font-display text-xl text-vanilla">Interessenten für belegte Tage</h2>
          <p className="mt-1 text-xs leading-relaxed text-vanilla/55">
            Name, E-Mail und das mögliche Zeitfenster pro belegtem Tag.
          </p>
        </div>
      </div>

      {q.isLoading ? (
        <p className="text-xs text-vanilla/50">Warteliste wird geladen…</p>
      ) : q.isError ? (
        <p className="text-xs text-bordeaux">Warteliste konnte nicht geladen werden.</p>
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="eyebrow text-champagne/80">Wartend</div>
              <span className="text-xs text-vanilla/45">{waiting.length}</span>
            </div>
            {waiting.length === 0 ? (
              <p className="border border-dashed border-champagne/15 p-4 text-xs text-vanilla/45">
                Aktuell wartet niemand auf einen belegten Tag.
              </p>
            ) : (
              <div className="space-y-2">{waiting.map(renderEntry)}</div>
            )}
          </div>

          {contacted.length > 0 && (
            <details className="border-t border-champagne/10 pt-4">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-champagne/80">
                Bereits kontaktiert ({contacted.length})
              </summary>
              <div className="mt-3 space-y-2">{contacted.map(renderEntry)}</div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
