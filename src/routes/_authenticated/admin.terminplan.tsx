import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/site/PageHeader";
import { ArrowLeft, CalendarPlus, Download, Crown } from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { ManualBookingForm, type ManualBookingValues } from "@/components/admin/admin-shared";
import { createManualBooking } from "@/lib/booking.functions";
import { listCustomers } from "@/lib/customers.functions";

export const Route = createFileRoute("/_authenticated/admin/terminplan")({
  head: () => ({ meta: [{ title: "Terminplan — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: TerminplanPage,
});

type Entry = {
  id: string;
  start: string;
  end: string | null;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  duration: string | null;
  duration_minutes: number | null;
  location: string | null;
  is_duo: boolean;
  duo_partner: string | null;
  is_content_shoot: boolean;
  admin_note: string | null;
  guest_wish: string | null;
  anzahlung_paid: boolean | null;
  deposit_exemption_reason: string | null;
  anzahlung: number | null;
  bar: number | null;
};

function TerminplanPage() {
  const qc = useQueryClient();
  const createManualBookingFn = useServerFn(createManualBooking);
  const listCustomersFn = useServerFn(listCustomers);
  const customersQ = useQuery({ queryKey: ["customers"], queryFn: () => listCustomersFn() });
  const manualMut = useMutation({
    mutationFn: (input: ManualBookingValues) => createManualBookingFn({ data: input }),
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
          "id, guest_name, guest_email, guest_phone, duration, duration_minutes, requested_start, admin_note, anzahlung_paid, deposit_exemption_reason, anzahlung, bar, message, availability_slots(starts_at, ends_at, location, is_duo, duo_partner, is_content_shoot)",
        )
        .eq("status", "confirmed");
      if (error) throw error;
      const rows = (data ?? []).map((b) => {
        const slot = Array.isArray(b.availability_slots)
          ? b.availability_slots[0]
          : (b.availability_slots as {
              starts_at: string;
              ends_at: string;
              location: string;
              is_duo: boolean;
              duo_partner: string | null;
              is_content_shoot: boolean;
            } | null);
        const start = b.requested_start ?? slot?.starts_at ?? null;
        if (!start) return null;
        // Prefer the actual booking duration over the availability window end,
        // otherwise a short booking inside a long window would display the window's end time.
        const end = b.duration_minutes
          ? new Date(new Date(start).getTime() + b.duration_minutes * 60_000).toISOString()
          : (slot?.ends_at ?? null);
        return {
          id: b.id,
          start,
          end,
          guest_name: b.guest_name,
          guest_email: b.guest_email,
          guest_phone: b.guest_phone,
          duration: b.duration,
          duration_minutes: b.duration_minutes,
          location: slot?.location ?? null,
          is_duo: slot?.is_duo ?? false,
          duo_partner: slot?.duo_partner ?? null,
          is_content_shoot: slot?.is_content_shoot ?? false,
          admin_note: b.admin_note,
          guest_wish: b.message,
          anzahlung_paid: b.anzahlung_paid,
          deposit_exemption_reason: b.deposit_exemption_reason,
          anzahlung: b.anzahlung != null ? Number(b.anzahlung) : null,
bar: b.bar != null ? Number(b.bar) : null,
        } as Entry;
      });
      return rows
        .filter((r): r is Entry => r !== null)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    },
  });

  const now = Date.now();
  const upcoming = (q.data ?? []).filter((e) => new Date(e.end ?? e.start).getTime() >= now);
  const past = (q.data ?? []).filter((e) => new Date(e.end ?? e.start).getTime() < now).reverse();

  // Gruppierung nach Tag
  const groups: { day: Date; items: Entry[] }[] = [];
  for (const e of upcoming) {
    const d = startOfDay(new Date(e.start));
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.day, d)) last.items.push(e);
    else groups.push({ day: d, items: [e] });
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
              <ManualBookingForm onCreate={(values) => manualMut.mutateAsync(values)} pending={manualMut.isPending} customers={customersQ.data ?? []} />
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
              <div key={g.day.toISOString()}>
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
                    <EntryCard key={e.id} e={e} />
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
                  <EntryCard key={e.id} e={e} />
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
  function downloadDayPlan() {
    const width = 1200;
    const side = 62;
    const contentWidth = width - side * 2;
    const canvas = document.createElement("canvas");
    const measure = canvas.getContext("2d");
    if (!measure) return;

    measure.font = '24px Arial, sans-serif';
    const wishLines = items.map((entry) =>
      wrapCanvasText(measure, entry.guest_wish?.trim() || "Kein Wunsch eingetragen.", contentWidth - 92),
    );
    const rowHeights = wishLines.map((lines) => 250 + Math.max(1, lines.length) * 32);
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
      const appointmentType = entry.is_duo
        ? `DUO · ${entry.duo_partner?.trim() || "Partnerin"}`
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
      ctx.fillStyle = entry.anzahlung_paid || entry.deposit_exemption_reason ? "#9fc8a8" : "#e0b26d";
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText(
        entry.deposit_exemption_reason
          ? "Keine Anzahlung vereinbart"
          : `Anzahlung: ${(entry.anzahlung ?? 0).toLocaleString("de-DE")} € · ${entry.anzahlung_paid ? "BEZAHLT" : "OFFEN"}`,
        right,
        y + 113,
      );
      ctx.fillStyle = vanilla;
      ctx.fillText(`Bar: ${(entry.bar ?? 0).toLocaleString("de-DE")} €`, right, y + 151);

      ctx.textAlign = "left";
      ctx.fillStyle = gold;
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.fillText("WUNSCH", left, y + 204);
      ctx.fillStyle = vanilla;
      ctx.font = '24px Arial, sans-serif';
      wishLines[index].forEach((line, lineIndex) => {
        ctx.fillText(line, left, y + 240 + lineIndex * 32);
      });

      y += rowHeight;
    });

    ctx.textAlign = "center";
    ctx.fillStyle = softGold;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText("INTERNE TAGESÜBERSICHT · LADY-VANILLAICE.COM", width / 2, height - 70);

    const link = document.createElement("a");
    link.download = `lady-vanilla-ice-tagesplan-${format(day, "yyyy-MM-dd")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
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

function EntryCard({ e }: { e: Entry }) {
  const duration = e.duration_minutes
    ? `${e.duration_minutes} Minuten (${(e.duration_minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.)`
    : (e.duration ?? "—");
  const startTime = format(new Date(e.start), "HH:mm");
  const endTime = e.end ? format(new Date(e.end), "HH:mm") : null;
  const timeRange = endTime ? `${startTime}–${endTime} Uhr` : `${startTime} Uhr`;

  return (
    <Link
      to="/admin/buchung/$id"
      params={{ id: e.id }}
      className="block bg-card border border-champagne/15 p-4 hover:border-champagne/50 transition"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-lg text-vanilla">{e.guest_name}</span>
          <span
            className={`text-[0.5rem] uppercase tracking-[0.16em] px-1.5 py-0.5 ${
              e.anzahlung_paid || e.deposit_exemption_reason
                ? "bg-green-700/30 text-green-200"
                : "bg-amber-700/30 text-amber-200"
            }`}
          >
            {e.deposit_exemption_reason ? "Keine Anzahlung" : e.anzahlung_paid ? "Anzahlung ok" : "Anzahlung offen"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-champagne">
          <span>
            {e.is_duo
              ? `Duo – mit ${e.duo_partner?.trim() || "Partnerin"}`
              : "Single"}
          </span>
          {e.is_content_shoot ? (
            <span className="border border-champagne/30 px-1.5 py-0.5 text-vanilla/80">
              Content
            </span>
          ) : null}
        </div>

        <div className="text-sm text-vanilla/75">
          <span className="text-vanilla/50">Zeit:</span> {timeRange}
        </div>
        <div className="text-sm text-vanilla/75">
          <span className="text-vanilla/50">Dauer:</span> {duration}
        </div>
        <div className="text-sm text-vanilla/75">
          <span className="text-vanilla/50">Anzahlung:</span>{" "}
          {(e.anzahlung ?? 0).toLocaleString("de-DE")} €
        </div>
        <div className="text-sm text-vanilla/75">
          <span className="text-vanilla/50">Bar:</span>{" "}
          {(e.bar ?? 0).toLocaleString("de-DE")} €
        </div>
      </div>
    </Link>
  );
}
