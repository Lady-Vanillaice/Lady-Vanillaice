import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Video } from "lucide-react";
import { useState, type FormEvent } from "react";
import { deleteCalendarCamTime, listAllCalendarCamTimes, saveCalendarCamTime } from "@/lib/calendar-cam.functions";

const todayKey = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value + "T12:00:00"));

/** Admin: Zeiten für Cam-Sessions eintragen – erscheinen lila im öffentlichen Kalender. */
export function CalendarCamAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllCalendarCamTimes);
  const saveFn = useServerFn(saveCalendarCamTime);
  const deleteFn = useServerFn(deleteCalendarCamTime);
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("20:00");
  const [to, setTo] = useState("22:00");
  const [note, setNote] = useState("");

  const q = useQuery({ queryKey: ["calendar-cam-admin"], queryFn: () => listFn() });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["calendar-cam-admin"] });
    qc.invalidateQueries({ queryKey: ["calendar-cam-times"] });
  };
  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { date, from, to, note: note.trim() || null } }),
    onSuccess: () => { setDate(""); setNote(""); refresh(); },
  });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteFn({ data: { id } }), onSuccess: refresh });

  const upcoming = (q.data ?? []).filter((entry) => entry.date >= todayKey());

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!date) return;
    saveMut.mutate();
  };

  return (
    <section className="mt-8 border border-purple-400/40 bg-card p-5 space-y-5">
      <div className="flex items-start gap-3">
        <Video className="mt-0.5 text-purple-300" size={20} />
        <div>
          <div className="eyebrow text-purple-300">Camsession-Zeiten</div>
          <h2 className="font-display text-xl text-vanilla">Cam-Sessions im Kalender anzeigen</h2>
          <p className="mt-1 text-xs leading-relaxed text-vanilla/55">
            Trag ein, wann du Cam-Sessions anbietest. Der Tag bekommt im öffentlichen Kalender einen lila Punkt mit „Cam“ und die Uhrzeit wird angezeigt. Studio-Zeitfenster bleiben davon unberührt.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="eyebrow block mb-1">Datum</label>
          <input type="date" required min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Von</label>
          <input type="time" required value={from} onChange={(e) => setFrom(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div>
          <label className="eyebrow block mb-1">Bis</label>
          <input type="time" required value={to} onChange={(e) => setTo(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="eyebrow block mb-1">Hinweis (optional)</label>
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="input-luxe !py-2" placeholder="öffentlich sichtbar" />
        </div>
        <button type="submit" disabled={saveMut.isPending || !date} className="col-span-2 sm:col-span-4 inline-flex items-center justify-center gap-2 border border-purple-400/60 bg-purple-500/15 px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-purple-200 hover:bg-purple-500/25 disabled:opacity-40">
          <Plus size={14} /> {saveMut.isPending ? "Speichere…" : "Cam-Zeit eintragen"}
        </button>
        {saveMut.error instanceof Error && <p className="col-span-2 sm:col-span-4 text-xs text-bordeaux">{saveMut.error.message}</p>}
      </form>

      {q.isLoading ? (
        <p className="text-xs text-vanilla/50">Wird geladen…</p>
      ) : upcoming.length === 0 ? (
        <p className="border border-dashed border-purple-400/25 p-4 text-xs text-vanilla/45">Keine kommenden Cam-Zeiten eingetragen.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-3 border border-purple-400/25 bg-purple-500/[0.06] p-3">
              <div>
                <div className="text-sm text-vanilla">{dateLabel(entry.date)}</div>
                <div className="text-xs text-purple-200">{entry.from} – {entry.to} Uhr</div>
                {entry.note && <div className="mt-1 text-xs text-vanilla/60">{entry.note}</div>}
              </div>
              <button
                type="button"
                onClick={() => { if (confirm("Diese Cam-Zeit löschen?")) deleteMut.mutate(entry.id); }}
                disabled={deleteMut.isPending}
                className="p-2 text-vanilla/45 hover:text-bordeaux disabled:opacity-40"
                aria-label="Cam-Zeit löschen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
