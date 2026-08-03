import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createSlot, deleteSlot, getCalendarFeedUrl, mergeSlots, splitSlot, updateSlotBuffer, updateSlotTimes, setSlotHidden } from "@/lib/booking.functions";
import { useState } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import {
  NewSlotForm,
  StatusBadge,
  type Slot,
} from "@/components/admin/admin-shared";
import { Trash2, MapPin, ArrowLeft, Eye, EyeOff, CalendarPlus, Copy, Pencil, Save, X, Download, Crown, Scissors, Combine } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/kalender")({
  head: () => ({ meta: [{ title: "Kalender — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminKalenderPage,
});

function AdminKalenderPage() {
  const qc = useQueryClient();
  const createSlotFn = useServerFn(createSlot);
  const deleteSlotFn = useServerFn(deleteSlot);
  const updateSlotTimesFn = useServerFn(updateSlotTimes);
  const splitSlotFn = useServerFn(splitSlot);
  const mergeSlotsFn = useServerFn(mergeSlots);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [splittingSlotId, setSplittingSlotId] = useState<string | null>(null);

  const slotsQ = useQuery({
    queryKey: ["admin-slots"],
    queryFn: async (): Promise<Slot[]> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("availability_slots")
        .select(
          "id, starts_at, ends_at, location, is_duo, is_content_shoot, duo_partner, status, buffer_minutes, is_hidden, availability_slot_admin_meta(internal_note)",
        )
        .gt("ends_at", nowIso)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const meta = row.availability_slot_admin_meta as
          | { internal_note: string | null }
          | { internal_note: string | null }[]
          | null;
        const metaRow = Array.isArray(meta) ? meta[0] ?? null : meta;
        return {
          id: row.id,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          location: row.location,
          is_duo: row.is_duo,
          is_content_shoot: row.is_content_shoot,
          duo_partner: row.duo_partner,
          status: row.status,
          internal_note: metaRow?.internal_note ?? null,
          buffer_minutes: row.buffer_minutes ?? 30,
          is_hidden: (row as { is_hidden?: boolean }).is_hidden ?? false,
        } as Slot;
      });
    },
  });

  const createMut = useMutation({
    mutationFn: (input: {
      starts_at: string;
      ends_at: string;
      location: string;
      is_duo?: boolean;
      is_content_shoot?: boolean;
      duo_partner?: string | null;
      internal_note?: string | null;
      buffer_minutes?: number;
      is_hidden?: boolean;
    }) => createSlotFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-slots"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSlotFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-slots"] }),
  });

  const updateTimesMut = useMutation({
    mutationFn: (v: { id: string; starts_at: string; ends_at: string }) =>
      updateSlotTimesFn({ data: v }),
    onSuccess: () => {
      setEditingSlotId(null);
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
    },
  });

  const splitMut = useMutation({
    mutationFn: (v: { id: string; split_at: string }) => splitSlotFn({ data: v }),
    onSuccess: () => {
      setSplittingSlotId(null);
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
    },
  });

  const mergeMut = useMutation({
    mutationFn: (v: { first_id: string; second_id: string }) => mergeSlotsFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-slots"] }),
    onError: (error) => alert(error instanceof Error ? error.message : "Zeitfenster konnten nicht zusammengeführt werden."),
  });

  const mergeDayMut = useMutation({
    mutationFn: async (slots: Slot[]) => {
      const ordered = [...slots].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
      let anchor = ordered[0] ?? null;
      let mergedCount = 0;

      for (const next of ordered.slice(1)) {
        if (!anchor) {
          anchor = next;
          continue;
        }
        if (!canMergeSlots(anchor, next)) {
          anchor = next;
          continue;
        }
        await mergeSlotsFn({ data: { first_id: anchor.id, second_id: next.id } });
        anchor = { ...anchor, ends_at: next.ends_at };
        mergedCount += 1;
      }

      if (mergedCount === 0) {
        throw new Error("An diesem Tag gibt es keine direkt angrenzenden Zeitfenster mit gleichen Einstellungen.");
      }
      return mergedCount;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-slots"] }),
    onError: (error) => alert(error instanceof Error ? error.message : "Zeitfenster konnten nicht zusammengeführt werden."),
  });

  const updateBufferFn = useServerFn(updateSlotBuffer);
  const bufferMut = useMutation({
    mutationFn: (v: { id: string; buffer_minutes: number }) => updateBufferFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-slots"] }),
  });

  const setHiddenFn = useServerFn(setSlotHidden);
  const hiddenMut = useMutation({
    mutationFn: (v: { id: string; is_hidden: boolean }) => setHiddenFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-slots"] }),
  });

  const slotsByDay = new Map<string, Slot[]>();
  for (const slot of slotsQ.data ?? []) {
    const dayKey = format(new Date(slot.starts_at), "yyyy-MM-dd");
    slotsByDay.set(dayKey, [...(slotsByDay.get(dayKey) ?? []), slot]);
  }
  const groupedSlots = [...slotsByDay.entries()].map(([dayKey, slots]) => ({
    dayKey,
    date: new Date(slots[0]?.starts_at ?? dayKey),
    slots,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<>Kalender &amp; <em className="font-script gold-text not-italic">Termine</em></>}
        intro="Verfügbarkeiten pflegen und externe Termine eintragen."
      />
      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <div className="mb-8 flex flex-wrap gap-3 items-center">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zum Admin-Bereich
            </Link>
            <CalendarSubscribeButton />
          </div>

          <NewSlotForm onCreate={(v) => createMut.mutateAsync(v)} pending={createMut.isPending} />

          <FreeSlotImageExport slots={slotsQ.data ?? []} loading={slotsQ.isLoading} />

          <div className="mt-8 space-y-6">
            {slotsQ.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}
            {slotsQ.data?.length === 0 && (
              <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
                Noch keine Zeitfenster angelegt.
              </p>
            )}
            {groupedSlots.map((group) => (
              <section key={group.dayKey} className="border border-champagne/15 bg-card">
                <header className="flex flex-wrap items-end justify-between gap-2 border-b border-champagne/15 px-4 py-3">
                  <div>
                    <div className="eyebrow text-champagne">{format(group.date, "EEEE", { locale: de })}</div>
                    <h2 className="font-display text-xl text-vanilla">
                      {format(group.date, "dd.MM.yyyy", { locale: de })}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-vanilla/55">
                      {group.slots.length} {group.slots.length === 1 ? "Zeitfenster" : "Zeitfenster"} an diesem Tag
                    </p>
                    {group.slots.some((slot, index) => {
                      const next = group.slots[index + 1];
                      return Boolean(next && canMergeSlots(slot, next));
                    }) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Alle direkt angrenzenden freien Zeitfenster dieses Tages zusammenführen? Gebuchte und reservierte Zeiten bleiben unverändert.")) {
                            mergeDayMut.mutate(group.slots);
                          }
                        }}
                        disabled={mergeDayMut.isPending || mergeMut.isPending || splitMut.isPending}
                        className="btn-outline-gold !py-1.5 !px-3 !text-[0.58rem]"
                      >
                        <Combine size={12} />
                        Alle angrenzenden verbinden
                      </button>
                    )}
                  </div>
                </header>
                <div className="divide-y divide-champagne/10">
                  {group.slots.map((s, slotIndex) => {
                    const nextSlot = group.slots[slotIndex + 1] ?? null;
                    const canMergeWithNext = Boolean(
                      s.status === "open"
                      && nextSlot?.status === "open"
                      && new Date(s.ends_at).getTime() === new Date(nextSlot.starts_at).getTime(),
                    );
                    const durationMinutes = Math.round((new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 60_000);
                    const durationLabel = durationMinutes >= 60
                      ? `${Math.floor(durationMinutes / 60)} Std.${durationMinutes % 60 ? ` ${durationMinutes % 60} Min.` : ""}`
                      : `${durationMinutes} Min.`;
                    return (
                      <div
                        key={s.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${
                          s.is_hidden ? "bg-anthracite/25 opacity-85" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-vanilla font-medium flex flex-wrap items-center gap-2">
                            <span className="text-[0.6rem] uppercase tracking-[0.2em] text-champagne/70 mr-1">
                              Zeitfenster
                            </span>
                            <span>
                              {format(new Date(s.starts_at), "HH:mm", { locale: de })}
                              {" – "}
                              {format(new Date(s.ends_at), "HH:mm", { locale: de })}
                            </span>
                            <span className="text-xs text-vanilla/45">({durationLabel})</span>
                            {s.is_duo && s.duo_partner && (
                              <span className="text-champagne">· mit {s.duo_partner}</span>
                            )}
                            {s.is_hidden && (
                              <span className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.2em] px-2 py-0.5 bg-bordeaux/40 text-vanilla">
                                <EyeOff size={11} /> Unsichtbar
                              </span>
                            )}
                          </div>
                          <div className="text-[0.7rem] text-vanilla/45 mt-0.5 italic">
                            Kein einzelner Buchungsslot — Kunden wählen darin Startzeit und Dauer frei ab 30 Min.
                          </div>
                          <div className="text-xs text-vanilla/55 mt-1 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1 min-w-0"><MapPin size={11} /> <span className="truncate">{s.location}</span></span>
                            {s.is_duo && <span className="text-champagne uppercase tracking-[0.2em]">Duo{s.duo_partner ? ` · ${s.duo_partner}` : ""}</span>}
                            {s.is_content_shoot && <span className="text-champagne uppercase tracking-[0.2em]">Content</span>}
                            <StatusBadge status={s.status} />
                            <label className="inline-flex items-center gap-1.5 text-vanilla/60" title="Mindestpause zwischen zwei Buchungen innerhalb dieses Fensters">
                              Puffer
                              <input
                                type="number" min={0} max={240} step={15}
                                defaultValue={s.buffer_minutes ?? 30}
                                onBlur={(e) => {
                                  const v = Math.max(0, Math.min(240, Number(e.target.value) || 0));
                                  if (v !== (s.buffer_minutes ?? 30)) bufferMut.mutate({ id: s.id, buffer_minutes: v });
                                }}
                                className="w-16 bg-anthracite/40 border border-champagne/20 px-2 py-0.5 text-vanilla text-xs"
                              />
                              Min
                            </label>
                          </div>
                          {editingSlotId === s.id && (
                            <SlotTimeEditor
                              slot={s}
                              pending={updateTimesMut.isPending}
                              onCancel={() => setEditingSlotId(null)}
                              onSave={(value) => updateTimesMut.mutateAsync({ id: s.id, ...value })}
                            />
                          )}
                          {splittingSlotId === s.id && (
                            <SlotSplitEditor
                              slot={s}
                              pending={splitMut.isPending}
                              onCancel={() => setSplittingSlotId(null)}
                              onSave={(splitAt) => splitMut.mutateAsync({ id: s.id, split_at: splitAt })}
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1 sm:shrink-0">
                          {s.status === "open" && (
                            <button
                              onClick={() => {
                                setEditingSlotId(null);
                                setSplittingSlotId(splittingSlotId === s.id ? null : s.id);
                              }}
                              disabled={splitMut.isPending || mergeMut.isPending}
                              className="text-vanilla/50 hover:text-champagne transition p-2"
                              aria-label="Zeitfenster aufteilen"
                              title="An einer Uhrzeit in zwei freie Zeitfenster teilen"
                            >
                              <Scissors size={16} />
                            </button>
                          )}
                          {canMergeWithNext && nextSlot && (
                            <button
                              onClick={() => {
                                if (confirm(`Diese beiden Zeitfenster verbinden: ${format(new Date(s.starts_at), "HH:mm")}–${format(new Date(nextSlot.ends_at), "HH:mm")} Uhr?`)) {
                                  mergeMut.mutate({ first_id: s.id, second_id: nextSlot.id });
                                }
                              }}
                              disabled={splitMut.isPending || mergeMut.isPending}
                              className="text-vanilla/50 hover:text-champagne transition p-2"
                              aria-label="Mit folgendem Zeitfenster zusammenführen"
                              title="Mit dem direkt folgenden Zeitfenster verbinden"
                            >
                              <Combine size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingSlotId(editingSlotId === s.id ? null : s.id)}
                            disabled={updateTimesMut.isPending}
                            className="text-vanilla/50 hover:text-champagne transition p-2"
                            aria-label="Zeitfenster bearbeiten"
                            title="Beginn oder Ende ändern"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => hiddenMut.mutate({ id: s.id, is_hidden: !s.is_hidden })}
                            disabled={hiddenMut.isPending}
                            className="text-vanilla/50 hover:text-champagne transition p-2"
                            aria-label={s.is_hidden ? "Sichtbar schalten" : "Unsichtbar schalten"}
                            title={s.is_hidden ? "Öffentlich sichtbar schalten" : "Unsichtbar schalten"}
                          >
                            {s.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Dieses Zeitfenster löschen?")) deleteMut.mutate(s.id);
                            }}
                            className="text-vanilla/40 hover:text-destructive transition p-2"
                            aria-label="Löschen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function canMergeSlots(first: Slot, second: Slot) {
  return (
    first.status === "open"
    && second.status === "open"
    && new Date(first.ends_at).getTime() === new Date(second.starts_at).getTime()
    && first.location === second.location
    && (first.buffer_minutes ?? 30) === (second.buffer_minutes ?? 30)
    && Boolean(first.is_duo) === Boolean(second.is_duo)
    && Boolean(first.is_content_shoot) === Boolean(second.is_content_shoot)
    && (first.duo_partner ?? null) === (second.duo_partner ?? null)
    && Boolean(first.is_hidden) === Boolean(second.is_hidden)
    && (first.internal_note ?? null) === (second.internal_note ?? null)
  );
}

function FreeSlotImageExport({ slots, loading }: { slots: Slot[]; loading: boolean }) {
  const freeSlots = slots.filter(
    (slot) =>
      slot.status === "open" &&
      !slot.is_hidden &&
      new Date(slot.ends_at).getTime() > Date.now(),
  );

  function downloadImage() {
    if (freeSlots.length === 0) return;

    const width = 1080;
    const outerPadding = 54;
    const headerHeight = 270;
    const rowHeight = 132;
    const footerHeight = 116;
    const height = Math.max(720, headerHeight + freeSlots.length * rowHeight + footerHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const background = "#0b0b0c";
    const card = "#12100e";
    const gold = "#d8b676";
    const softGold = "#8f7448";
    const vanilla = "#f4ead8";
    const muted = "#a99d8d";

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(width / 2, 80, 20, width / 2, 100, width * 0.75);
    gradient.addColorStop(0, "rgba(216,182,118,0.13)");
    gradient.addColorStop(1, "rgba(11,11,12,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(outerPadding, outerPadding, width - outerPadding * 2, height - outerPadding * 2);
    ctx.strokeStyle = softGold;
    ctx.lineWidth = 1;
    ctx.strokeRect(outerPadding + 13, outerPadding + 13, width - (outerPadding + 13) * 2, height - (outerPadding + 13) * 2);

    // Crown monogram used in the website header.
    const crownX = width / 2;
    const crownY = 92;
    ctx.strokeStyle = gold;
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(crownX - 48, crownY + 20);
    ctx.lineTo(crownX - 58, crownY - 28);
    ctx.lineTo(crownX - 22, crownY - 2);
    ctx.lineTo(crownX, crownY - 40);
    ctx.lineTo(crownX + 22, crownY - 2);
    ctx.lineTo(crownX + 58, crownY - 28);
    ctx.lineTo(crownX + 48, crownY + 20);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crownX - 46, crownY + 36);
    ctx.lineTo(crownX + 46, crownY + 36);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = gold;
    ctx.font = '44px Georgia, "Times New Roman", serif';
    ctx.fillText("LADY VANILLA ICE", width / 2, 180);
    ctx.fillStyle = vanilla;
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText("F R E I E   T E R M I N E", width / 2, 225);

    freeSlots.forEach((slot, index) => {
      const y = headerHeight + index * rowHeight;
      const start = new Date(slot.starts_at);
      const end = new Date(slot.ends_at);

      ctx.fillStyle = card;
      ctx.fillRect(outerPadding + 28, y, width - (outerPadding + 28) * 2, rowHeight - 18);
      ctx.strokeStyle = "rgba(216,182,118,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(outerPadding + 28, y, width - (outerPadding + 28) * 2, rowHeight - 18);

      ctx.textAlign = "left";
      ctx.fillStyle = gold;
      ctx.font = 'bold 25px Arial, sans-serif';
      ctx.fillText(format(start, "dd.MM.yyyy", { locale: de }), outerPadding + 58, y + 42);

      ctx.fillStyle = vanilla;
      ctx.font = '34px Georgia, "Times New Roman", serif';
      ctx.fillText(
        `${format(start, "HH:mm", { locale: de })} – ${format(end, "HH:mm", { locale: de })} Uhr`,
        outerPadding + 58,
        y + 84,
      );

      ctx.textAlign = "right";
      ctx.fillStyle = muted;
      ctx.font = '22px Arial, sans-serif';
      const studio = slot.location.length > 34 ? `${slot.location.slice(0, 31)}…` : slot.location;
      ctx.fillText(studio, width - outerPadding - 58, y + 48);

      const tags = [
        slot.is_duo ? `DUO${slot.duo_partner ? ` · ${slot.duo_partner}` : ""}` : "",
        slot.is_content_shoot ? "CONTENT" : "",
      ].filter(Boolean).join("  ·  ");
      if (tags) {
        ctx.fillStyle = gold;
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillText(tags, width - outerPadding - 58, y + 82);
      }
    });

    ctx.textAlign = "center";
    ctx.fillStyle = softGold;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText("BUCHUNGSANFRAGE · LADY-VANILLAICE.COM", width / 2, height - 72);

    const link = document.createElement("a");
    link.download = `lady-vanilla-ice-freie-termine-${format(new Date(), "yyyy-MM-dd")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <section className="mt-8 border border-champagne/35 bg-card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-champagne">
            <Crown size={19} strokeWidth={1.4} />
            <h2 className="font-display text-2xl">Freie Termine als Bild</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-vanilla/55">
            Übersicht aller zukünftigen, sichtbaren und frei buchbaren Zeitfenster – gestaltet im Lady-Vanilla-Ice-Look.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadImage}
          disabled={loading || freeSlots.length === 0}
          className="btn-gold shrink-0 !py-2.5 !px-4 !text-[0.65rem] disabled:opacity-40"
        >
          <Download size={14} />
          Als Bild herunterladen
        </button>
      </div>

      <div className="mt-5 overflow-hidden border border-champagne/20">
        {loading ? (
          <p className="p-5 text-sm text-vanilla/50">Freie Termine werden geladen…</p>
        ) : freeSlots.length === 0 ? (
          <p className="p-5 text-sm text-vanilla/50">Aktuell sind keine freien, sichtbaren Termine vorhanden.</p>
        ) : (
          <div className="divide-y divide-champagne/10">
            {freeSlots.map((slot) => (
              <div key={slot.id} className="grid grid-cols-[1fr_auto] gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-display text-lg text-vanilla">
                    {format(new Date(slot.starts_at), "EEEE, dd.MM.yyyy", { locale: de })}
                  </div>
                  <div className="mt-1 text-xs text-vanilla/55 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      {format(new Date(slot.starts_at), "HH:mm", { locale: de })} –{" "}
                      {format(new Date(slot.ends_at), "HH:mm", { locale: de })} Uhr
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} /> {slot.location}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[0.55rem] uppercase tracking-[0.16em] text-champagne">
                  {slot.is_duo ? "Duo" : slot.is_content_shoot ? "Content" : "Frei"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SlotSplitEditor({
  slot,
  pending,
  onSave,
  onCancel,
}: {
  slot: Slot;
  pending: boolean;
  onSave: (splitAt: string) => Promise<unknown>;
  onCancel: () => void;
}) {
  const startMs = new Date(slot.starts_at).getTime();
  const endMs = new Date(slot.ends_at).getTime();
  const midpoint = new Date(Math.round(((startMs + endMs) / 2) / (15 * 60_000)) * 15 * 60_000);
  const inputFormat = "yyyy-MM-dd'T'HH:mm";
  const [splitAt, setSplitAt] = useState(format(midpoint, inputFormat));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const value = new Date(splitAt);
    if (!splitAt || Number.isNaN(value.getTime())) {
      setError("Bitte eine gültige Trennzeit auswählen.");
      return;
    }
    try {
      await onSave(value.toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zeitfenster konnte nicht geteilt werden.");
    }
  }

  return (
    <div className="mt-4 border border-champagne/25 bg-anthracite/30 p-4">
      <div className="eyebrow text-champagne mb-3">Zeitfenster aufteilen</div>
      <label className="block text-[0.6rem] uppercase tracking-[0.16em] text-vanilla/45 mb-1">
        Trennen um
      </label>
      <input
        type="datetime-local"
        value={splitAt}
        min={format(new Date(startMs + 30 * 60_000), inputFormat)}
        max={format(new Date(endMs - 30 * 60_000), inputFormat)}
        step={900}
        onChange={(event) => setSplitAt(event.target.value)}
        className="input-luxe !py-2 max-w-xs"
      />
      <p className="mt-2 text-[0.65rem] text-vanilla/45">
        Beide Teile müssen mindestens 30 Minuten lang sein. Buchungen und Reservierungen bleiben geschützt.
      </p>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} disabled={pending} className="btn-gold !py-2 !px-3 !text-[0.65rem]">
          <Scissors size={12} /> {pending ? "Teilt…" : "Jetzt aufteilen"}
        </button>
        <button type="button" onClick={onCancel} disabled={pending} className="btn-outline-gold !py-2 !px-3 !text-[0.65rem]">
          <X size={12} /> Abbrechen
        </button>
      </div>
    </div>
  );
}

function SlotTimeEditor({
  slot,
  pending,
  onSave,
  onCancel,
}: {
  slot: Slot;
  pending: boolean;
  onSave: (value: { starts_at: string; ends_at: string }) => Promise<unknown>;
  onCancel: () => void;
}) {
  const startDate = new Date(slot.starts_at);
  const endDate = new Date(slot.ends_at);
  const [date, setDate] = useState(format(startDate, "yyyy-MM-dd"));
  const [start, setStart] = useState(format(startDate, "HH:mm"));
  const [end, setEnd] = useState(format(endDate, "HH:mm"));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const startsAt = new Date(`${date}T${start}:00`);
    const endsAt = new Date(`${date}T${end}:00`);
    if (end <= start) endsAt.setDate(endsAt.getDate() + 1);
    try {
      await onSave({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zeitfenster konnte nicht gespeichert werden.");
    }
  }

  return (
    <div className="mt-4 border border-champagne/25 bg-anthracite/30 p-4">
      <div className="eyebrow text-champagne mb-3">Zeitfenster bearbeiten</div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[0.6rem] uppercase tracking-[0.16em] text-vanilla/45 mb-1">Datum</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div>
          <label className="block text-[0.6rem] uppercase tracking-[0.16em] text-vanilla/45 mb-1">Von</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input-luxe !py-2" />
        </div>
        <div>
          <label className="block text-[0.6rem] uppercase tracking-[0.16em] text-vanilla/45 mb-1">Bis</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input-luxe !py-2" />
        </div>
      </div>
      <p className="mt-2 text-[0.65rem] text-vanilla/45">
        Liegt „Bis“ vor „Von“, endet das Zeitfenster automatisch am folgenden Tag.
      </p>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} disabled={pending} className="btn-gold !py-2 !px-3 !text-[0.65rem]">
          <Save size={12} /> {pending ? "Speichert…" : "Speichern"}
        </button>
        <button type="button" onClick={onCancel} disabled={pending} className="btn-outline-gold !py-2 !px-3 !text-[0.65rem]">
          <X size={12} /> Abbrechen
        </button>
      </div>
    </div>
  );
}

function CalendarSubscribeButton() {
  const getUrl = useServerFn(getCalendarFeedUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [webcalUrl, setWebcalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const { token } = await getUrl();
    // Immer die öffentliche Produktions-Domain verwenden — Preview-URLs (id-preview--…)
    // sind nicht stabil und werden von Apple Kalender teils abgelehnt.
    const host = window.location.hostname;
    const isProd = host === "lady-vanillaice.com" || host === "www.lady-vanillaice.com";
    const base = isProd ? window.location.origin : "https://lady-vanillaice.com";
    const feed = `${base}/api/public/calendar/${token}.ics`;
    const webcalFeed = feed.replace(/^https?:\/\//, "webcal://");
    setUrl(feed);
    setWebcalUrl(webcalFeed);
  }

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  if (!url) {
  return (
    <button
      type="button"
      onClick={load}
      className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]"
    >
      Kalender-Feed (iCal) anzeigen
    </button>
  );
}
  return (
    <div className="flex-1 min-w-0 text-xs text-vanilla/70 border border-champagne/20 p-3 bg-card space-y-3">
      <div className="flex flex-wrap gap-2">
       {webcalUrl && (
  <button
    type="button"
    onClick={() => {
      window.location.href = webcalUrl;
    }}
    className="btn-gold !py-2 !px-3 !text-[0.65rem]"
  >
    <CalendarPlus size={13} /> In Apple Kalender öffnen
  </button>
)}
        <button onClick={copyUrl} className="btn-outline-gold !py-2 !px-3 !text-[0.65rem]">
          <Copy size={13} /> Vollständige URL kopieren
        </button>
      </div>
      <div>
        <div className="text-champagne mb-1">
          Abo-URL {copied && <span className="text-vanilla/50">· kopiert</span>}
        </div>
        <div className="font-mono break-all text-vanilla/80 select-all">{url}</div>
      </div>
      <div className="text-vanilla/50">
        Am iPhone am besten direkt „In Apple Kalender öffnen“ antippen. Beim manuellen Einfügen muss die URL mit https://lady-vanillaice.com beginnen.
      </div>
    </div>
  );
}
