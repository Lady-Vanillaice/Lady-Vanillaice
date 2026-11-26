import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { listLongtermClients, updateLongtermEntry, type LongtermClient } from "@/lib/longterm.functions";
import { parseSessionType } from "@/lib/session-type";
import { currentPartStart, isFreePhase, parsePlan, phaseDisplay, planPhaseTimes } from "@/lib/session-plan";
import { realLocation } from "@/lib/slot-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/site/PageHeader";
import { ArrowLeft, CalendarPlus, Download, Crown } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ManualBookingForm, type ManualBookingValues } from "@/components/admin/admin-shared";
import { CustomContentForm } from "@/components/admin/custom-content-form";
import { saveCanvasAsPng } from "@/lib/download-image.client";
import { createManualBooking } from "@/lib/booking.functions";
import { listBookingSessionClosures } from "@/lib/booking-session-closure.functions";
import { SessionClosureControls } from "@/components/admin/SessionClosureControls";
import { listCustomers, type CustomerRow } from "@/lib/customers.functions";
import { listStudios } from "@/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/admin/terminplan")({
  head: () => ({ meta: [{ title: "Terminplan — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: TerminplanPage,
});

type Entry = {
  id: string;
  start: string;
  calendar_day_start: string;
  end: string | null;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  duration: string | null;
  duration_minutes: number | null;
  location: string | null;
  location_address: string | null;
  is_duo: boolean;
  duo_partner: string | null;
  is_content_shoot: boolean;
  admin_note: string | null;
  guest_wish: string | null;
  anzahlung_paid: boolean | null;
  deposit_exemption_reason: string | null;
  anzahlung: number | null;
  bar: number | null;
  cash_received_at: string | null;
  is_liegezeit_only: boolean;
};

function hasNoDeposit(entry: Pick<Entry, "deposit_exemption_reason" | "anzahlung" | "bar">) {
  return Boolean(entry.deposit_exemption_reason) || (Number(entry.anzahlung ?? 0) === 0 && Number(entry.bar ?? 0) > 0);
}

function berlinDayKey(value: string | Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function TerminplanPage() {
  const qc = useQueryClient();
  const listClosures = useServerFn(listBookingSessionClosures);
  const closuresQ = useQuery({ queryKey: ["booking-session-closures"], queryFn: () => listClosures() });
  const closures = new Map((closuresQ.data ?? []).map(item => [item.booking_id, item]));
  const createManualBookingFn = useServerFn(createManualBooking);
  const listCustomersFn = useServerFn(listCustomers);
  const listStudiosFn = useServerFn(listStudios);
  const studiosQ = useQuery({ queryKey: ["admin-studios"], queryFn: () => listStudiosFn() });
  const customersQ = useQuery({ queryKey: ["customers"], queryFn: () => listCustomersFn() });
  const manualMut = useMutation({
    mutationFn: (input: ManualBookingValues) => createManualBookingFn({
      data: {
        ...input,
        deposit_exemption_reason: input.deposit_exemption_reason === "spontaneous" ? "exception" : input.deposit_exemption_reason,
      },
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["admin-bookings"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["admin-slots"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["cashbook"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["customers"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["public-slots"], refetchType: "all" }),
      ]);
    },
  });
  const q = useQuery({
    queryKey: ["admin-terminplan"],
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, status, slot_id, guest_name, guest_email, guest_phone, duration, duration_minutes, requested_start, admin_note, anzahlung_paid, deposit_exemption_reason, anzahlung, bar, cash_received_at, message, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, duo_partner, is_content_shoot)",
        )
        .in("status", ["confirmed", "rescheduling", "waiting_deposit"]);
      if (error) throw error;
      // Aus „wartet auf Anzahlung“ nur selbst eingetragene Termine mit
      // „Anzahlung fehlt noch“ zeigen (noch ohne Kalender-Slot).
      const visibleBookings = (data ?? []).filter((b: any) =>
        b.status !== "waiting_deposit" || (!b.slot_id && /Manuell durch Admin eingetragen/.test(b.message ?? "")),
      );
      const rows = visibleBookings.map((b) => {
        const slot = Array.isArray(b.availability_slots)
          ? b.availability_slots[0]
          : (b.availability_slots as {
              starts_at: string;
              ends_at: string;
              location: string;
              location_address: string | null;
              is_duo: boolean;
              duo_partner: string | null;
              is_content_shoot: boolean;
            } | null);
        const start = b.requested_start ?? slot?.starts_at ?? null;
        if (!start) return null;
        const isLiegezeitOnly = b.duration?.startsWith("Nur Liegezeit") ?? false;
        const liegezeitMinutes = isLiegezeitOnly
          ? Number(b.duration?.match(/(\d+) Minuten/)?.[1] ?? 0)
          : null;
        const durationMinutes = b.duration_minutes ?? (liegezeitMinutes || null);
        const end = durationMinutes
          ? new Date(new Date(start).getTime() + durationMinutes * 60_000).toISOString()
          : (slot?.ends_at ?? null);
        return {
          id: b.id,
          start,
          // Termine nach Mitternacht bleiben im Terminplan dem Starttag
          // ihres ursprünglichen Kalender-Zeitfensters zugeordnet.
          calendar_day_start: slot?.starts_at ?? start,
          end,
          guest_name: b.guest_name,
          guest_email: b.guest_email,
          guest_phone: b.guest_phone,
          duration: b.duration,
          duration_minutes: durationMinutes,
          is_liegezeit_only: isLiegezeitOnly,
          location: b.studio_override?.trim() || realLocation(slot?.location) || null,
          location_address: b.studio_address_override?.trim() || slot?.location_address || null,
          is_duo: parseSessionType(b.admin_note)?.isDuo ?? slot?.is_duo ?? false,
          duo_partner: parseSessionType(b.admin_note)
            ? parseSessionType(b.admin_note)?.partner ?? null
            : slot?.duo_partner?.replace("OPTIONAL_DUO::", "") ?? null,
          is_content_shoot: slot?.is_content_shoot ?? false,
          admin_note: b.admin_note,
          guest_wish: b.message,
          anzahlung_paid: b.anzahlung_paid,
          deposit_exemption_reason: b.deposit_exemption_reason,
          anzahlung: b.anzahlung != null ? Number(b.anzahlung) : null,
          bar: b.bar != null ? Number(b.bar) : null,
          cash_received_at: b.cash_received_at,
        } as Entry;
      });
      return rows
        .filter((r): r is Entry => r !== null)
        .sort((a, b) => {
          // Ist ein Teil eines Ablaufs vorbei, rutscht der Gast zur Uhrzeit seines nächsten Teils.
          const now = Date.now();
          const ta = currentPartStart(a.start, a.admin_note, now)?.s ?? new Date(a.start).getTime();
          const tb = currentPartStart(b.start, b.admin_note, now)?.s ?? new Date(b.start).getTime();
          return ta - tb;
        });
    },
    refetchInterval: 60_000,
  });

  const todayKey = berlinDayKey(new Date());
  const upcoming = (q.data ?? []).filter((e) => berlinDayKey(e.calendar_day_start) >= todayKey);
  const past = (q.data ?? []).filter((e) => berlinDayKey(e.calendar_day_start) < todayKey).reverse();

  const groups: { dayKey: string; day: Date; items: Entry[] }[] = [];
  for (const e of upcoming) {
    const dayKey = berlinDayKey(e.calendar_day_start);
    const last = groups[groups.length - 1];
    if (last?.dayKey === dayKey) last.items.push(e);
    else groups.push({
      dayKey,
      // Mittags-UTC verhindert Datumsverschiebungen bei der reinen Anzeige.
      day: new Date(`${dayKey}T12:00:00.000Z`),
      items: [e],
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<>Mein <em className="font-script gold-text not-italic">Terminplan</em></>}
        intro="Alle bestätigten Termine chronologisch — nach Tag und Uhrzeit sortiert."
      />
      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <LongtermOverview />
          <div className="mb-8">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zum Admin-Bereich
            </Link>
          </div>

          <details className="mb-8 bg-card border border-champagne/25">
            <summary className="cursor-pointer px-5 py-4 text-sm text-vanilla/80 hover:text-champagne flex items-center gap-2">
              <CalendarPlus size={16} className="text-champagne" />
              Neuen externen Termin eintragen
            </summary>
            <div className="p-5 border-t border-champagne/15">
              <ManualBookingForm onCreate={(values) => manualMut.mutateAsync(values)} pending={manualMut.isPending} customers={customersQ.data ?? []} studios={studiosQ.data} />
            </div>
          </details>

          <details className="mb-8 bg-card border border-champagne/25">
            <summary className="cursor-pointer px-5 py-4 text-sm text-vanilla/80 hover:text-champagne flex items-center gap-2">
              <Crown size={16} className="text-champagne" />
              Custom Content eintragen
            </summary>
            <div className="p-5 border-t border-champagne/15">
              <CustomContentForm
                onCreate={(values) => manualMut.mutateAsync(values)}
                pending={manualMut.isPending}
                studios={studiosQ.data}
              />
            </div>
          </details>

          {q.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}
          {!q.isLoading && groups.length === 0 && (
            <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
              Keine bestätigten Termine.
            </p>
          )}

          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.dayKey}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-champagne/20 pb-3">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <div className="font-display text-2xl text-champagne">
                      {format(g.day, "EEEE", { locale: de })}
                    </div>
                    <div className="text-sm text-vanilla/60">
                      {format(g.day, "dd. MMMM yyyy", { locale: de })}
                    </div>
                  </div>
                  <DayPlanDownloadButton day={g.day} items={g.items} />
                </div>
                <div className="space-y-2">
                  {g.items.map((e) => (
                    <EntryCard key={e.id} e={e} closure={closures.get(e.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {past.length > 0 && (
            <details className="mt-16">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-vanilla/55 hover:text-champagne">
                Vergangene Termine ({past.length})
              </summary>
              <div className="mt-4 space-y-2 opacity-60">
                {past.map((e) => (
                  <EntryCard key={e.id} e={e} closure={closures.get(e.id)} />
                ))}
              </div>
            </details>
          )}
        </div>
      </section>
    </>
  );
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      if (lines.length > 0) lines.push("");
      continue;
    }
    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : ["—"];
}

function DayPlanDownloadButton({ day, items }: { day: Date; items: Entry[] }) {
  async function downloadDayPlan() {
    const width = 1200;
    const side = 62;
    const contentWidth = width - side * 2;
    const canvas = document.createElement("canvas");
    const measure = canvas.getContext("2d");
    if (!measure) return;

    const rowHeights = items.map(() => 220);
    const headerHeight = 290;
    const footerHeight = 112;
    const height = Math.max(
      780,
      headerHeight + rowHeights.reduce((sum, value) => sum + value, 0) + footerHeight,
    );

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
    const glow = ctx.createRadialGradient(width / 2, 80, 20, width / 2, 100, width * 0.8);
    glow.addColorStop(0, "rgba(216,182,118,0.14)");
    glow.addColorStop(1, "rgba(11,11,12,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(side, side, width - side * 2, height - side * 2);
    ctx.strokeStyle = softGold;
    ctx.lineWidth = 1;
    ctx.strokeRect(side + 14, side + 14, width - (side + 14) * 2, height - (side + 14) * 2);

    const crownX = width / 2;
    const crownY = 98;
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
    ctx.fillText("LADY VANILLA ICE", width / 2, 190);
    ctx.fillStyle = vanilla;
    ctx.font = '25px Arial, sans-serif';
    ctx.fillText("T A G E S P L A N", width / 2, 232);
    ctx.fillStyle = muted;
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText(
      format(day, "EEEE, dd. MMMM yyyy", { locale: de }),
      width / 2,
      268,
    );

    let y = headerHeight;
    items.forEach((entry, index) => {
      const rowHeight = rowHeights[index];
      const start = new Date(entry.start);
      const end = entry.end ? new Date(entry.end) : null;
      const duration = entry.duration_minutes
        ? `${entry.duration_minutes} Min. · ${(entry.duration_minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`
        : entry.duration || "—";
      const appointmentType = entry.is_liegezeit_only
        ? "LIEGEZEIT · KEINE SESSION"
        : entry.is_duo
          ? `DUO · ${entry.duo_partner?.trim() || "Partnerin"}`
          : entry.duration === "Custom Content"
            ? "CUSTOM CONTENT"
            : entry.is_content_shoot
              ? "CONTENT"
              : "SINGLE";

      ctx.fillStyle = card;
      ctx.fillRect(side + 28, y, contentWidth - 56, rowHeight - 18);
      ctx.strokeStyle = "rgba(216,182,118,0.34)";
      ctx.lineWidth = 1;
      ctx.strokeRect(side + 28, y, contentWidth - 56, rowHeight - 18);

      const left = side + 58;
      const right = width - side - 58;
      ctx.textAlign = "left";
      ctx.fillStyle = vanilla;
      ctx.font = 'bold 34px Georgia, "Times New Roman", serif';
      ctx.fillText(entry.guest_name, left, y + 48);

      ctx.textAlign = "right";
      ctx.fillStyle = gold;
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.fillText(appointmentType, right, y + 43);

      ctx.textAlign = "left";
      ctx.fillStyle = gold;
      ctx.font = 'bold 25px Arial, sans-serif';
      const time = end
        ? `${format(start, "HH:mm")} – ${format(end, "HH:mm")} Uhr`
        : `${format(start, "HH:mm")} Uhr`;
      ctx.fillText(time, left, y + 91);

      ctx.fillStyle = muted;
      ctx.font = '21px Arial, sans-serif';
      ctx.fillText(`Dauer: ${duration}`, left, y + 127);
      ctx.fillText(`Studio: ${entry.location || "—"}`, left, y + 161);

      ctx.textAlign = "right";
      ctx.fillStyle = entry.anzahlung_paid || hasNoDeposit(entry) ? "#9fc8a8" : "#e0b26d";
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText(
        hasNoDeposit(entry)
          ? "Keine Anzahlung vereinbart"
          : `Anzahlung: ${(entry.anzahlung ?? 0).toLocaleString("de-DE")} € · ${entry.anzahlung_paid ? "BEZAHLT" : "OFFEN"}`,
        right,
        y + 113,
      );
      ctx.fillStyle = vanilla;
      ctx.fillText(`Bar: ${(entry.bar ?? 0).toLocaleString("de-DE")} €`, right, y + 151);

      y += rowHeight;
    });

    ctx.textAlign = "center";
    ctx.fillStyle = softGold;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText("INTERNE TAGESÜBERSICHT · LADY-VANILLAICE.COM", width / 2, height - 70);

    try {
      await saveCanvasAsPng(
        canvas,
        `lady-vanilla-ice-tagesplan-${format(day, "yyyy-MM-dd")}.png`,
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Das Bild konnte nicht gespeichert werden.");
    }
  }

  return (
    <button
      type="button"
      onClick={downloadDayPlan}
      className="btn-outline-gold !py-2 !px-3 !text-[0.6rem] shrink-0"
      title="Alle Informationen dieses Tages als Bild herunterladen"
    >
      <Crown size={12} />
      <Download size={12} />
      Tagesplan als Bild
    </button>
  );
}

function EntryCard({ e, closure }: { e: Entry; closure?: { report_decision: string } }) {
  const duration = e.duration_minutes
    ? `${e.duration_minutes} Minuten (${(e.duration_minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.)`
    : (e.duration ?? "—");
  const startTime = format(new Date(e.start), "HH:mm");
  const endTime = e.end ? format(new Date(e.end), "HH:mm") : null;
  const timeRange = endTime ? `${startTime}–${endTime} Uhr` : `${startTime} Uhr`;

  // Sessions vor dem 29.10.2026 gelten als bereits abgeschlossen (Altbestand).
  const berlinDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(e.start));
  const isLegacyCompleted = berlinDay < "2026-10-29";
  const isCompleted = Boolean(closure) || isLegacyCompleted;
  const isPastSession = (e.end ? new Date(e.end).getTime() : new Date(e.start).getTime()) <= Date.now();

  return (
    <div className={isCompleted ? "border border-green-500/60 bg-green-950/35 p-4" : isPastSession ? "border border-red-400/60 bg-red-950/45 p-4" : "border border-champagne/15 bg-card p-4"}>
    <Link
      to="/admin/buchung/$id"
      params={{ id: e.id }}
      className="block hover:text-champagne transition"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-lg text-vanilla">{e.guest_name}</span>
          {e.is_liegezeit_only ? <span className="border border-champagne bg-champagne/15 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-champagne">Liegezeit · keine Session</span> : null}
          <span
            className={`text-[0.5rem] uppercase tracking-[0.16em] px-1.5 py-0.5 ${
              e.anzahlung_paid || hasNoDeposit(e)
                ? "bg-green-700/30 text-green-200"
                : "bg-amber-700/30 text-amber-200"
            }`}
          >
            {hasNoDeposit(e) ? "Keine Anzahlung" : e.anzahlung_paid ? "Anzahlung ok" : "Anzahlung offen"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-champagne">
          {!e.is_liegezeit_only ? <span>
            {e.is_duo
              ? `Duo – mit ${e.duo_partner?.trim() || "Partnerin"}`
              : "Single"}
          </span> : null}
          {e.is_content_shoot ? (
            <span className="border border-champagne/30 px-1.5 py-0.5 text-vanilla/80">
              {e.duration === "Custom Content" ? "Custom Content" : "Content"}
            </span>
          ) : null}
        </div>

        <div className="text-sm text-vanilla/75">
          <span className="text-vanilla/50">Zeit:</span> {timeRange}
        </div>
        {(() => {
          const plan = parsePlan(e.admin_note);
          if (!plan) return null;
          const now = Date.now();
          const times = planPhaseTimes(e.start, plan);
          const next = currentPartStart(e.start, e.admin_note, now);
          return (
            <div className="border-l-2 border-champagne/50 pl-3 space-y-1 text-sm">
              {next && (
                <div className="mb-1 inline-block bg-champagne px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-background">
                  {next.s <= now ? "Jetzt" : "Weiter um"} {next.from} Uhr · {phaseDisplay(next)}
                </div>
              )}
              {times.map((p, i) => (
                <div
                  key={i}
                  className={`${p.e <= now ? "line-through opacity-45 " : ""}${isFreePhase(p) ? "text-purple-200" : p.kind === "session" ? "text-vanilla/85" : "text-champagne"}`}
                >
                  {p.from}–{p.to} Uhr · {phaseDisplay(p)}
                </div>
              ))}
            </div>
          );
        })()}
        <div className="text-sm text-vanilla/75">
          <span className="text-vanilla/50">Dauer:</span> {duration}
        </div>
        <div className="text-sm text-vanilla/75">
          <span className="text-vanilla/50">Anzahlung:</span>{" "}
          {(e.anzahlung ?? 0).toLocaleString("de-DE")} €
        </div>
        <div className="text-sm text-vanilla/75">
          <span className="text-vanilla/50">Restzahlung:</span>{" "}
          {(e.bar ?? 0).toLocaleString("de-DE")} €
          {e.cash_received_at && (e.bar ?? 0) > 0 ? <span className="ml-2 text-green-300">✓ bezahlt {format(new Date(e.cash_received_at), "dd.MM.")}</span> : null}
        </div>
      </div>
    </Link>
    <CustomerQuickInfo email={e.guest_email} name={e.guest_name} />
    <SessionClosureControls bookingId={e.id} completed={isCompleted} reportDecision={closure?.report_decision ?? (isLegacyCompleted ? "without_report" : undefined)} amount={e.bar ?? 0} paidAt={e.cash_received_at} guestEmail={e.guest_email} sessionStart={e.start} sessionPlace={e.location} isDuo={e.is_duo} duoPartner={e.duo_partner} />
    </div>
  );
}


/** Ganz oben im Terminplan: laufende Langzeiterziehungen mit Laufzeit-Ende. */
function CustomerQuickInfo({ email, name }: { email: string | null; name?: string | null }) {
  const listCustomersFn = useServerFn(listCustomers);
  const q = useQuery({ queryKey: ["customers"], queryFn: () => listCustomersFn(), staleTime: 5 * 60_000 });
  const key = (email ?? "").trim().toLowerCase();
  const nameKey = (name ?? "").trim().toLowerCase();
  const list = (q.data as CustomerRow[] | undefined) ?? [];
  const hasInfo = (c: CustomerRow) => Boolean(c.note || c.booking_profile?.tabus || c.booking_profile?.safeword);
  const customer =
    (key ? list.find((c) => c.email?.toLowerCase() === key && hasInfo(c)) : undefined) ??
    (nameKey.length >= 2
      ? list.find((c) => hasInfo(c) && (c.note?.pseudonym?.trim().toLowerCase() === nameKey || c.names.some((n) => n.trim().toLowerCase() === nameKey)))
      : undefined);
  if (!customer) return null;
  const pick = (field: "tabus" | "safeword" | "vorlieben" | "gesundheit") => customer.note?.[field]?.trim() || customer.booking_profile?.[field]?.trim() || null;
  const items: Array<[string, string | null, boolean]> = [
    ["Safeword", pick("safeword"), true],
    ["Tabus", pick("tabus"), true],
    ["Sonderregeln", customer.note?.special_rules?.trim() || null, true],
    ["Gesundheit", pick("gesundheit"), false],
    ["Vorlieben", pick("vorlieben"), false],
    ["Notiz", customer.note?.admin_note?.trim() || null, false],
  ];
  const filled = items.filter(([, v]) => v);
  if (!filled.length) return null;
  return (
    <details className="mt-3 border border-champagne/25 bg-background/40">
      <summary className="cursor-pointer px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] text-champagne">
        Kunden-Info{pick("safeword") ? ` · Safeword: ${pick("safeword")}` : ""}
      </summary>
      <div className="space-y-2 px-3 pb-3 text-sm">
        {filled.map(([label, value, important]) => (
          <div key={label}>
            <div className={`text-[0.6rem] uppercase tracking-[0.16em] ${important ? "text-bordeaux" : "text-vanilla/50"}`}>{label}</div>
            <div className="whitespace-pre-wrap text-vanilla/85">{value}</div>
          </div>
        ))}
        <Link to="/admin/kunden" className="inline-block text-[0.65rem] uppercase tracking-[0.14em] text-champagne/80 hover:text-champagne">Kundenkartei öffnen →</Link>
      </div>
    </details>
  );
}

function LongtermOverview() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const listFn = useServerFn(listLongtermClients);
  const q = useQuery({ queryKey: ["longterm-clients"], queryFn: () => listFn(), refetchInterval: 5 * 60_000 });
  const todayKey = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
  const daysLeft = (bis: string) => Math.round((Date.parse(`${bis}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86_400_000);
  const fmt = (iso: string) => iso.split("-").reverse().join(".");
  // Abgelaufene nur noch 14 Tage lang zeigen, damit man ans Verlängern denkt.
  const rows = (q.data ?? []).filter((c) => daysLeft(c.bis) >= -14);
  if (q.isLoading || rows.length === 0) return null;
  return (
    <div className="mb-8 border border-champagne/40 bg-champagne/[0.06] p-4">
      <div className="eyebrow mb-3 text-champagne">Langzeiterziehung</div>
      <div className="space-y-2">
        {rows.map((c) => {
          const left = daysLeft(c.bis);
          const tone = left < 0 ? "text-bordeaux" : left <= 3 ? "text-amber-200" : "text-vanilla/70";
          return (
            <div key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-champagne/10 pb-2 last:border-0 last:pb-0">
              <div>
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                  className="font-medium text-vanilla underline decoration-champagne/40 underline-offset-4 hover:text-champagne"
                >
                  {c.kunde}
                </button>
                <span className="ml-2 text-xs uppercase tracking-[0.14em] text-champagne">{c.paket}</span>
                <span className="ml-2 text-xs text-vanilla/50">{c.betrag.toLocaleString("de-DE")} €</span>
              </div>
              <div className={`text-sm ${tone}`}>
                bis {fmt(c.bis)}
                {left < 0 ? " · abgelaufen" : left === 0 ? " · endet heute" : ` · noch ${left} ${left === 1 ? "Tag" : "Tage"}`}
              </div>
              {editingId === c.id && <LongtermEditForm client={c} onDone={() => setEditingId(null)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LongtermEditForm({ client, onDone }: { client: LongtermClient; onDone: () => void }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateLongtermEntry);
  const [kunde, setKunde] = useState(client.kunde);
  const [paket, setPaket] = useState(client.paket);
  const [betrag, setBetrag] = useState(String(client.betrag).replace(".", ","));
  const [zahlungsart, setZahlungsart] = useState(client.zahlungsart ?? "");
  const [bis, setBis] = useState(client.bis);
  const [notiz, setNotiz] = useState(client.notiz);
  const mut = useMutation({
    mutationFn: () => {
      const amount = Number(betrag.replace(/\s|€/g, "").replace(",", "."));
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Bitte einen gültigen Betrag eingeben.");
      if (!kunde.trim()) throw new Error("Bitte einen Namen eingeben.");
      if (!bis) throw new Error("Bitte „Laufzeit bis“ eintragen.");
      return updateFn({ data: { id: client.id, kunde: kunde.trim(), paket, betrag: amount, zahlungsart: zahlungsart || null, bis, notiz } });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["longterm-clients"] }),
        qc.invalidateQueries({ queryKey: ["cashbook"] }),
      ]);
      onDone();
    },
  });
  const field = "text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45";
  return (
    <div className="mt-2 w-full grid grid-cols-2 gap-2 border border-champagne/25 bg-card p-3">
      <label className={`${field} col-span-2`}>Name<input value={kunde} onChange={(e) => setKunde(e.target.value)} className="input-luxe w-full mt-1 normal-case tracking-normal" /></label>
      <label className={field}>Paket
        <select value={paket} onChange={(e) => setPaket(e.target.value)} className="input-luxe w-full mt-1 normal-case tracking-normal">
          {["Basis", "Intensiv", "Premium", "Individuell"].map((p) => <option key={p}>{p}</option>)}
          {!["Basis", "Intensiv", "Premium", "Individuell"].includes(paket) && <option>{paket}</option>}
        </select>
      </label>
      <label className={field}>Betrag (€)<input inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} className="input-luxe w-full mt-1" /></label>
      <label className={field}>Zahlungsart
        <select value={zahlungsart} onChange={(e) => setZahlungsart(e.target.value)} className="input-luxe w-full mt-1 normal-case tracking-normal">
          <option value="">—</option>
          {["Bar", "PayPal", "Überweisung", "Karte", "Sonstige"].map((m) => <option key={m}>{m}</option>)}
          {zahlungsart && !["Bar", "PayPal", "Überweisung", "Karte", "Sonstige"].includes(zahlungsart) && <option>{zahlungsart}</option>}
        </select>
      </label>
      <label className={field}>Laufzeit bis<input type="date" value={bis} onChange={(e) => setBis(e.target.value)} className="input-luxe w-full mt-1" /></label>
      <label className={`${field} col-span-2`}>Notiz<input value={notiz} onChange={(e) => setNotiz(e.target.value)} maxLength={500} className="input-luxe w-full mt-1 normal-case tracking-normal" /></label>
      <div className="col-span-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={mut.isPending} onClick={() => mut.mutate()} className="btn-outline-gold !py-2 !px-4 !text-[0.65rem] disabled:opacity-40">
          {mut.isPending ? "Speichere…" : "Speichern"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-vanilla/50 underline">Abbrechen</button>
        {mut.error && <span className="text-xs text-bordeaux">{(mut.error as Error).message}</span>}
      </div>
    </div>
  );
}
