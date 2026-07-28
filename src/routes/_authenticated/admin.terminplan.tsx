import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/site/PageHeader";
import { ArrowLeft } from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { de } from "date-fns/locale";

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
  anzahlung_paid: boolean | null;
  anzahlung: number | null;
  bar: number | null;
};

function TerminplanPage() {
  const q = useQuery({
    queryKey: ["admin-terminplan"],
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, guest_name, guest_email, guest_phone, duration, duration_minutes, requested_start, admin_note, anzahlung_paid, anzahlung, bar, message, availability_slots(starts_at, ends_at, location, is_duo, duo_partner, is_content_shoot)",
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
          anzahlung_paid: b.anzahlung_paid,
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

          {q.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}
          {!q.isLoading && groups.length === 0 && (
            <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
              Keine bestätigten Termine.
            </p>
          )}

          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.day.toISOString()}>
                <div className="mb-3 flex items-baseline gap-3 border-b border-champagne/20 pb-2">
                  <div className="font-display text-2xl text-champagne">
                    {format(g.day, "EEEE", { locale: de })}
                  </div>
                  <div className="text-sm text-vanilla/60">
                    {format(g.day, "dd. MMMM yyyy", { locale: de })}
                  </div>
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
              e.anzahlung_paid
                ? "bg-green-700/30 text-green-200"
                : "bg-amber-700/30 text-amber-200"
            }`}
          >
            {e.anzahlung_paid ? "Anzahlung ok" : "Anzahlung offen"}
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
