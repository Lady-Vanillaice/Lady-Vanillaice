import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  isValidTime,
  parsePlan,
  phaseLabel,
  planToOffsets,
  planTotalMinutes,
  type PlanPhase,
} from "@/lib/session-plan";

/**
 * Ablauf mit genauen Zeiten: Session → Liegezeit → Session …
 * onSave bekommt den neuen Ablauf (oder null zum Entfernen).
 */
export function SessionPlanEditor({
  adminNote,
  defaultStart,
  saving,
  error,
  saved,
  onSave,
}: {
  adminNote: string | null;
  defaultStart: string; // HH:MM
  saving: boolean;
  error: string | null;
  saved: boolean;
  onSave: (phases: PlanPhase[] | null) => void;
}) {
  const [phases, setPhases] = useState<PlanPhase[]>(() => parsePlan(adminNote) ?? []);
  useEffect(() => {
    setPhases(parsePlan(adminNote) ?? []);
  }, [adminNote]);

  const update = (index: number, patch: Partial<PlanPhase>) =>
    setPhases((cur) => cur.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const add = (kind: PlanPhase["kind"]) =>
    setPhases((cur) => {
      const from = cur.length ? cur[cur.length - 1].to : defaultStart || "12:00";
      const [h, m] = from.split(":").map(Number);
      const endMinutes = (h * 60 + m + 60) % 1440;
      const to = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      return [...cur, { kind, from, to, supervised: kind === "liegezeit" ? false : undefined }];
    });

  const allValid = phases.every((p) => isValidTime(p.from) && isValidTime(p.to));
  const total = allValid && phases.length ? planTotalMinutes(phases) : 0;
  const offsets = allValid ? planToOffsets(phases) : [];
  const gaps = offsets.some((p, i) => i > 0 && p.start !== offsets[i - 1].end);

  return (
    <div className="mt-4 border-t border-champagne/20 pt-4 space-y-3">
      <div>
        <div className="text-sm text-vanilla">Ablauf mit genauen Zeiten</div>
        <p className="text-xs text-vanilla/55 mt-1 leading-relaxed">
          Z. B. Session → Liegezeit → Session. Unbeaufsichtigte Liegezeit bleibt im öffentlichen Kalender für andere
          Gäste frei. Beaufsichtigte Liegezeit blockiert wie eine normale Session. Beim Speichern werden Beginn und
          Gesamtdauer des Termins automatisch angepasst.
        </p>
      </div>

      {phases.map((p, index) => (
        <div
          key={index}
          className={`grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end border p-2 ${
            p.kind === "liegezeit"
              ? p.supervised
                ? "border-champagne/40 bg-champagne/5"
                : "border-purple-400/40 bg-purple-500/5"
              : "border-champagne/20"
          }`}
        >
          <label className="col-span-2 sm:col-span-1 text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45">
            Art
            <select
              value={p.kind === "session" ? "session" : p.supervised ? "liegezeit-b" : "liegezeit-u"}
              onChange={(e) => {
                const v = e.target.value;
                update(index, v === "session"
                  ? { kind: "session", supervised: undefined }
                  : { kind: "liegezeit", supervised: v === "liegezeit-b" });
              }}
              className="input-luxe w-full mt-1 normal-case tracking-normal"
            >
              <option value="session">Session</option>
              <option value="liegezeit-u">Liegezeit unbeaufsichtigt (Zeit bleibt frei)</option>
              <option value="liegezeit-b">Liegezeit beaufsichtigt (blockiert)</option>
            </select>
          </label>
          <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45">
            Von
            <input type="time" value={p.from} onChange={(e) => update(index, { from: e.target.value })} className="input-luxe w-full mt-1" />
          </label>
          <label className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45">
            Bis
            <input type="time" value={p.to} onChange={(e) => update(index, { to: e.target.value })} className="input-luxe w-full mt-1" />
          </label>
          <button
            type="button"
            onClick={() => setPhases((cur) => cur.filter((_, i) => i !== index))}
            className="p-2 text-vanilla/45 hover:text-bordeaux justify-self-end"
            aria-label="Abschnitt entfernen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => add("session")} className="btn-outline-gold !py-2 !px-3 !text-[0.65rem] inline-flex items-center gap-1">
          <Plus size={13} /> Session
        </button>
        <button type="button" onClick={() => add("liegezeit")} className="btn-outline-gold !py-2 !px-3 !text-[0.65rem] inline-flex items-center gap-1">
          <Plus size={13} /> Liegezeit
        </button>
      </div>

      {phases.length > 0 && allValid && (
        <div className="border border-champagne/20 bg-anthracite/30 p-3 text-sm space-y-1">
          {phases.map((p, i) => (
            <div key={i} className={p.kind === "liegezeit" && !p.supervised ? "text-purple-200" : "text-vanilla/85"}>
              {p.from}–{p.to} Uhr · {phaseLabel(p)}
            </div>
          ))}
          <div className="pt-1 text-xs text-champagne">
            Gesamt: {Math.floor(total / 60)} Std.{total % 60 ? ` ${total % 60} Min.` : ""} ({phases[0].from}–{phases[phases.length - 1].to} Uhr)
          </div>
          {gaps && <div className="text-xs text-amber-200">Hinweis: Zwischen den Abschnitten gibt es Lücken oder Überschneidungen.</div>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving || !allValid || phases.length === 0}
          onClick={() => onSave(phases)}
          className="btn-outline-gold disabled:opacity-40"
        >
          {saving ? "Speichere…" : "Ablauf speichern"}
        </button>
        {parsePlan(adminNote) && (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (confirm("Ablauf entfernen? Beginn und Dauer des Termins bleiben wie sie sind.")) onSave(null);
            }}
            className="text-xs text-vanilla/50 underline hover:text-bordeaux"
          >
            Ablauf entfernen
          </button>
        )}
        {saved && <span className="text-xs text-green-300">✓ gespeichert</span>}
      </div>
      {!allValid && <p className="text-xs text-bordeaux">Bitte bei jedem Abschnitt Von und Bis eintragen.</p>}
      {error && <p className="text-xs text-bordeaux">{error}</p>}
    </div>
  );
}
