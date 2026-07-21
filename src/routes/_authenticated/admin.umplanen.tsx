import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { updateBookingStatus, deleteBooking } from "@/lib/booking.functions";
import { PageHeader } from "@/components/site/PageHeader";
import { BookingStatusBadge, type Booking } from "@/components/admin/admin-shared";
import { ArrowLeft, Calendar, MapPin, MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/umplanen")({
  head: () => ({ meta: [{ title: "Umplanen — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminUmplanenPage,
});

function AdminUmplanenPage() {
  const qc = useQueryClient();
  const updateBookingFn = useServerFn(updateBookingStatus);
  const deleteBookingFn = useServerFn(deleteBooking);

  const bookingsQ = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, slot_id, guest_name, guest_email, guest_phone, duration, duration_minutes, requested_start, message, status, admin_note, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: Booking["status"] }) =>
      updateBookingFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBookingFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  const rescheduling = (bookingsQ.data ?? []).filter((b) => b.status === "rescheduling");
  const pending = statusMut.isPending || deleteMut.isPending;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<>Zum <em className="font-script gold-text not-italic">Umplanen</em></>}
        intro="Gäste, die fristgerecht storniert haben — Anzahlung bleibt gültig. Hier kannst du sie kontaktieren und einen neuen Termin vereinbaren."
      />
      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <div className="mb-8">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zum Admin-Bereich
            </Link>
          </div>

          <div className="space-y-3">
            {bookingsQ.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}
            {!bookingsQ.isLoading && rescheduling.length === 0 && (
              <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
                Keine offenen Umplanungen.
              </p>
            )}
            {rescheduling.map((b) => (
              <div key={b.id} className="bg-card border border-champagne/15 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-display text-xl text-vanilla">{b.guest_name}</div>
                    <a href={`mailto:${b.guest_email}`} className="text-xs text-champagne hover:underline">
                      {b.guest_email}
                    </a>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>

                {b.requested_start && (
                  <div className="text-xs text-vanilla/65 mb-3 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <Calendar size={11} className="inline mr-1" />
                      Ursprünglicher Termin:{" "}
                      {format(new Date(b.requested_start), "dd.MM.yyyy · HH:mm", { locale: de })}
                    </span>
                    {b.duration && <span><MapPin size={11} className="inline mr-1" />{b.duration}</span>}
                  </div>
                )}

                <div className="mb-3">
                  <div className="text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 mb-1">
                    Nachricht &amp; Vorlieben
                  </div>
                  <p className="text-sm text-vanilla/75 leading-relaxed bg-anthracite/40 p-3 border border-champagne/10 whitespace-pre-line">
                    <MessageSquare size={11} className="inline mr-1 text-champagne" />
                    {b.message}
                  </p>
                </div>

                {b.admin_note && (
                  <div className="mb-3">
                    <div className="text-[0.6rem] uppercase tracking-[0.2em] text-champagne/70 mb-1">Deine Notiz</div>
                    <p className="text-sm text-vanilla/75 leading-relaxed bg-champagne/5 p-3 border border-champagne/20 whitespace-pre-line">
                      {b.admin_note}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/admin/buchung/$id"
                    params={{ id: b.id }}
                    className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-champagne/40 text-champagne hover:bg-champagne/10"
                  >
                    Details & neuen Termin setzen
                  </Link>
                  <button
                    disabled={pending}
                    onClick={() => statusMut.mutate({ id: b.id, status: "pending" })}
                    className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-vanilla/30 text-vanilla/70 hover:bg-vanilla/5 disabled:opacity-30 inline-flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Zurück auf Neu
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Anfrage von "${b.guest_name}" wirklich endgültig löschen?`)) {
                        deleteMut.mutate(b.id);
                      }
                    }}
                    className="text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 border border-bordeaux/50 text-bordeaux hover:bg-bordeaux/10 disabled:opacity-30 inline-flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
