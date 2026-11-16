import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Plus, Save, Trash2 } from "lucide-react";
import {
  deleteCalendarSpecial,
  listCalendarSpecials,
  saveCalendarSpecial,
} from "@/lib/calendar-special.functions";

export function CalendarSpecialsAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCalendarSpecials);
  const saveFn = useServerFn(saveCalendarSpecial);
  const deleteFn = useServerFn(deleteCalendarSpecial);
  const specialsQ = useQuery({
    queryKey: ["calendar-specials"],
    queryFn: () => listFn(),
  });
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("SPECIAL");
  const [description, setDescription] = useState("");

  const sorted = useMemo(
    () => [...(specialsQ.data ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [specialsQ.data],
  );

  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          date,
          title: title.trim() || "SPECIAL",
          description: description.trim(),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-specials"] });
      setDescription("");
      setTitle("SPECIAL");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (specialDate: string) => deleteFn({ data: { date: specialDate } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-specials"] }),
  });

  return (
    <section className="mt-8 border border-champagne/20 bg-card p-5 space-y-5">
      <div className="flex items-start gap-3">
        <Gift className="text-champagne mt-0.5" size={20} />
        <div>
          <div className="eyebrow text-champagne">SPECIAL</div>
          <h2 className="font-display text-xl text-vanilla">Kalender-Special anlegen</h2>
          <p className="mt-1 text-xs leading-relaxed text-vanilla/55">
            Zum Beispiel Weihnachten, Geburtstag oder ein Geschenk-Special. Öffentlich erscheint am Datum „SPECIAL“ und beim Anklicken dein Zusatztext.
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!date || !description.trim()) return;
          saveMut.mutate();
        }}
        className="grid gap-3"
      >
        <label className="grid gap-1 text-xs text-vanilla/65">
          Datum
          <input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="luxe-input"
          />
        </label>
        <label className="grid gap-1 text-xs text-vanilla/65">
          Titel
          <input
            required
            maxLength={80}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="z. B. Weihnachts-SPECIAL"
            className="luxe-input"
          />
        </label>
        <label className="grid gap-1 text-xs text-vanilla/65">
          Öffentlicher Zusatztext
          <textarea
            required
            maxLength={1200}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="z. B. Zu jeder Session gibt es an diesem Tag eine kleine Weihnachtsüberraschung von mir."
            className="luxe-input resize-y"
          />
        </label>
        <button
          type="submit"
          disabled={saveMut.isPending || !date || !description.trim()}
          className="btn-gold inline-flex w-fit items-center gap-2 disabled:opacity-40"
        >
          {saveMut.isPending ? <Save size={15} /> : <Plus size={15} />}
          {saveMut.isPending ? "Speichere…" : "SPECIAL speichern"}
        </button>
        {saveMut.error && (
          <p className="text-xs text-bordeaux">{(saveMut.error as Error).message}</p>
        )}
      </form>

      {sorted.length > 0 && (
        <div className="border-t border-champagne/15 pt-4 space-y-3">
          <div className="eyebrow text-champagne/80">Aktive Specials</div>
          {sorted.map((special) => (
            <div
              key={special.date}
              className="flex items-start justify-between gap-3 border border-champagne/15 p-3"
            >
              <div className="min-w-0">
                <div className="text-sm text-champagne">
                  {new Date(`${special.date}T12:00:00`).toLocaleDateString("de-DE")}
                  {" · "}
                  {special.title}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-vanilla/60">
                  {special.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Dieses SPECIAL wirklich entfernen?")) {
                    deleteMut.mutate(special.date);
                  }
                }}
                disabled={deleteMut.isPending}
                className="p-2 text-vanilla/45 hover:text-bordeaux disabled:opacity-40"
                aria-label="SPECIAL löschen"
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
