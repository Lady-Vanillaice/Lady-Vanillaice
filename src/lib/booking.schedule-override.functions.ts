import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function isBlockingBooking(booking: { status?: string | null; updated_at?: string | null }) {
  if (booking.status !== "waiting_deposit") return true;
  if (!booking.updated_at) return true;
  return new Date(booking.updated_at).getTime() + 24 * 60 * 60_000 > Date.now();
}

export const updateBookingSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      requested_start: z.string().datetime().nullable(),
      duration_minutes: z.number().int().min(15).max(24 * 60).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    let resolvedSlotId: string | undefined;

    if ((data.requested_start && !data.duration_minutes) || (!data.requested_start && data.duration_minutes)) {
      throw new Error("Bitte Datum, Uhrzeit und Dauer gemeinsam ausfüllen.");
    }

    if (data.requested_start && data.duration_minutes) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: booking, error: bookingErr } = await context.supabase
        .from("bookings")
        .select("id, slot_id, status")
        .eq("id", data.id)
        .maybeSingle();
      if (bookingErr) throw new Error(bookingErr.message);
      if (!booking) throw new Error("Buchung nicht gefunden.");

      const requestedStart = new Date(data.requested_start);
      const requestedEnd = new Date(requestedStart.getTime() + data.duration_minutes * 60_000);
      if (!Number.isFinite(requestedStart.getTime())) {
        throw new Error("Bitte gib eine gültige Uhrzeit ein.");
      }

      const dayStart = new Date(requestedStart);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const { data: openDaySlots, error: slotErr } = await supabaseAdmin
        .from("availability_slots")
        .select("id, starts_at, ends_at, status, is_hidden")
        .eq("status", "open")
        .eq("is_hidden", false)
        .lt("starts_at", dayEnd.toISOString())
        .gt("ends_at", dayStart.toISOString())
        .order("starts_at", { ascending: true });
      if (slotErr) throw new Error(slotErr.message);

      let currentSlot: {
        id: string;
        starts_at: string;
        ends_at: string;
        status: string;
        is_hidden: boolean;
      } | null = null;

      if (booking.slot_id) {
        const { data: slot, error: currentSlotErr } = await supabaseAdmin
          .from("availability_slots")
          .select("id, starts_at, ends_at, status, is_hidden")
          .eq("id", booking.slot_id)
          .maybeSingle();
        if (currentSlotErr) throw new Error(currentSlotErr.message);
        currentSlot = slot;
      }

      const daySlots = [...(openDaySlots ?? [])];
      if (currentSlot && !daySlots.some((slot) => slot.id === currentSlot.id)) {
        daySlots.push(currentSlot);
      }

      const containingSlot = daySlots.find((slot) => {
        const slotStart = new Date(slot.starts_at).getTime();
        const slotEnd = new Date(slot.ends_at).getTime();
        return requestedStart.getTime() >= slotStart && requestedEnd.getTime() <= slotEnd;
      });

      const { data: blockers, error: blockersErr } = await supabaseAdmin
        .from("bookings")
        .select("id, requested_start, duration_minutes, status, updated_at")
        .neq("id", data.id)
        .in("status", ["pending", "waiting_deposit", "confirmed"])
        .not("requested_start", "is", null)
        .not("duration_minutes", "is", null);
      if (blockersErr) throw new Error(blockersErr.message);

      // Admin-Ueberschreibungen duerfen die normale Pause / den Buchungspuffer
      // bewusst unterschreiten. Nur eine echte Termin-Ueberschneidung bleibt
      // gesperrt, damit keine Doppelbuchung entsteht.
      const conflicts = (blockers ?? []).some((blocked) => {
        if (!isBlockingBooking(blocked)) return false;
        if (!blocked.requested_start || !blocked.duration_minutes) return false;
        const blockedStart = new Date(blocked.requested_start).getTime();
        const blockedEnd = blockedStart + blocked.duration_minutes * 60_000;
        return requestedStart.getTime() < blockedEnd && requestedEnd.getTime() > blockedStart;
      });

      if (conflicts) {
        throw new Error("Diese Uhrzeit überschneidet sich mit einem anderen Termin. Bitte wähle eine andere Uhrzeit.");
      }

      if (containingSlot && booking.slot_id !== containingSlot.id) {
        resolvedSlotId = containingSlot.id;
      }
    }

    const { error } = await context.supabase
      .from("bookings")
      .update({
        requested_start: data.requested_start,
        duration_minutes: data.duration_minutes,
        ...(resolvedSlotId ? { slot_id: resolvedSlotId } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
