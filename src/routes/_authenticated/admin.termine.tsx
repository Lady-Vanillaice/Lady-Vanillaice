import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateBookingStatus, deleteBooking, createManualBooking } from "@/lib/booking.functions";
import { PageHeader } from "@/components/site/PageHeader";
import { BookingCard, useConfirmAmounts, ManualBookingForm, type Booking, type Slot } from "@/components/admin/admin-shared";
import { ArrowLeft, CalendarPlus } from "lucide-react";

type StatusTab = "offen" | "wartend" | "geschlossen";

function statusBucket(b: Booking): StatusTab | null {
  const s = b.status;
  if (s === "cancelled" || s === "declined") return "geschlossen";
  if (s === "waiting_deposit") return "wartend";
  if (s === "confirmed") return b.anzahlung_paid ? null : "wartend";
  // pending / rescheduling / open: älter als 24h → geschlossen, sonst offen
  const ageMs = Date.now() - new Date(b.created_at).getTime();
  if (ageMs > 24 * 60 * 60 * 1000) return "geschlossen";
  return "offen";
}

const TAB_META: Record<StatusTab, { label: string; empty: string }> = {
  offen: { label: "Offen", empty: "Keine offenen Anfragen." },
  wartend: { label: "Wartend", empty: "Keine wartenden Anfragen." },
  geschlossen: { label: "Geschlossen", empty: "Keine geschlossenen Anfragen." },
};

export const Route = createFileRoute("/_authenticated/admin/termine")({
  head: () => ({ meta: [{ title: "Termin-Anfragen — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminTerminePage,
});

function AdminTerminePage() {
  return <BookingsList kind="standard" />;
}

export type BookingKind = "standard" | "custom" | "duo" | "contentdreh";

const KIND_META: Record<BookingKind, { accent: string; rest: string; intro: string; empty: string }> = {
  standard: {
    accent: "Termin",
    rest: "Anfragen",
    intro: "Alle regulären Buchungsanfragen aus dem Kalender.",
    empty: "Keine Termin-Anfragen.",
  },
  custom: {
    accent: "Custom",
    rest: "Anfragen",
    intro: "Anfragen für Custom Content (Bilder, Videos, Outfits).",
    empty: "Keine Custom-Anfragen.",
  },
  duo: {
    accent: "Duo",
    rest: "Anfragen",
    intro: "Anfragen für Duo Sessions.",
    empty: "Keine Duo-Anfragen.",
  },
  contentdreh: {
    accent: "Content Dreh",
    rest: "Anfragen",
    intro: "Anfragen für Content-Dreh-Termine.",
    empty: "Keine Content-Dreh-Anfragen.",
  },
};

function matchKind(b: Booking, kind: BookingKind): boolean {
  const isCustom = b.duration === "Custom Content";
  const isContentdreh = b.duration === "Content Dreh";
  const isDuo = (b.message ?? "").startsWith("[DUO SESSION ANFRAGE]") || b.duration === "Duo Session";
  if (kind === "custom") return isCustom;
  if (kind === "contentdreh") return isContentdreh;
  if (kind === "duo") return isDuo;
  return !isCustom && !isContentdreh && !isDuo;
}

export function BookingsList({ kind }: { kind: BookingKind }) {
  const qc = useQueryClient();
  const updateBookingFn = useServerFn(updateBookingStatus);
  const deleteBookingFn = useServerFn(deleteBooking);
  const createManualBookingFn = useServerFn(createManualBooking);

  const slotsQ = useQuery({
    queryKey: ["admin-slots"],
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase
        .from("availability_slots")
        .select(
          "id, starts_at, ends_at, location, is_duo, is_content_shoot, duo_partner, status, availability_slot_admin_meta(internal_note)",
        )
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
        } as Slot;
      });
    },
  });

  const bookingsQ = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, slot_id, guest_name, guest_email, guest_phone, duration, duration_minutes, requested_start, message, status, admin_note, anzahlung_paid, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });

  const statusMut = useMutation({
    mutationFn: (v: {
      id: string;
      status: Booking["status"];
      decline_reason?: "services_not_offered" | "slot_taken" | "not_yet_offered" | "no_response";
      anzahlung?: number;
      bar?: number;
      confirmation_note?: string;
    }) => updateBookingFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  const deleteBookingMut = useMutation({
    mutationFn: (id: string) => deleteBookingFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  const manualMut = useMutation({
    mutationFn: (input: {
      starts_at: string;
      ends_at: string;
      location: string;
      guest_name: string;
      guest_contact?: string | null;
      source?: string | null;
      internal_note?: string | null;
    }) => createManualBookingFn({ data: input }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-slots"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["admin-bookings"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["public-slots"], refetchType: "all" }),
        qc.invalidateQueries({ queryKey: ["slot-availability"], refetchType: "all" }),
      ]);
    },
  });

  const confirmAmounts = useConfirmAmounts((v) => statusMut.mutate(v));

  const [tab, setTab] = useState<StatusTab>("offen");
  const kindFiltered = (bookingsQ.data ?? []).filter((b) => matchKind(b, kind));
  const counts: Record<StatusTab, number> = { offen: 0, wartend: 0, geschlossen: 0 };
  for (const b of kindFiltered) {
    const bucket = statusBucket(b);
    if (bucket) counts[bucket]++;
  }
  const filtered = kindFiltered.filter((b) => statusBucket(b) === tab);
  const meta = KIND_META[kind];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={
          <>
            {meta.accent} <em className="font-script gold-text not-italic">{meta.rest}</em>
          </>
        }
        intro={meta.intro}
      />
      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <div className="mb-8">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zum Admin-Bereich
            </Link>
          </div>

          {kind === "standard" && (
            <details className="mb-6 bg-card border border-champagne/15">
              <summary className="cursor-pointer px-5 py-3 text-sm text-vanilla/80 hover:text-champagne flex items-center gap-2">
                <CalendarPlus size={16} className="text-champagne" />
                Externen Termin manuell eintragen (Telegram, E-Mail …)
              </summary>
              <div className="p-5 pt-2 border-t border-champagne/10">
                <ManualBookingForm
                  onCreate={(v) => manualMut.mutateAsync(v)}
                  pending={manualMut.isPending}
                />
              </div>
            </details>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(TAB_META) as StatusTab[]).map((t) => {
              const active = t === tab;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    active
                      ? "btn-gold !py-2 !px-4 !text-[0.65rem]"
                      : "btn-outline-gold !py-2 !px-4 !text-[0.65rem]"
                  }
                >
                  {TAB_META[t].label} ({counts[t]})
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {bookingsQ.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}
            {!bookingsQ.isLoading && filtered.length === 0 && (
              <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
                {TAB_META[tab].empty}
              </p>
            )}
            {filtered.map((b) => {
              const slot = slotsQ.data?.find((s) => s.id === b.slot_id);
              return (
                <BookingCard
                  key={b.id}
                  b={b}
                  slot={slot}
                  pending={statusMut.isPending || deleteBookingMut.isPending}
                  onConfirm={() => confirmAmounts(b.id)}
                  onDecline={(reason) =>
                    statusMut.mutate({ id: b.id, status: "declined", decline_reason: reason })
                  }
                  onDelete={() => deleteBookingMut.mutate(b.id)}

                />
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
