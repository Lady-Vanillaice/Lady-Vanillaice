import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const activeStatuses = ["pending", "waiting_deposit", "confirmed"] as const;

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

function isActiveBooking(booking: { status: string; updated_at: string | null }) {
  if (booking.status === "confirmed") return true;
  if (!booking.updated_at) return true;
  return new Date(booking.updated_at).getTime() + 24 * 60 * 60_000 > Date.now();
}

const rangeInput = z.object({
  slot_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
});

export const markDuoRangeSingleOnly = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => rangeInput.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: slot, error: slotError } = await db
      .from("availability_slots")
      .select("id, starts_at, ends_at, location, status, buffer_minutes, is_duo, is_content_shoot, duo_partner, is_hidden")
      .eq("id", data.slot_id)
      .single();
    if (slotError || !slot) throw new Error(slotError?.message ?? "Zeitfenster nicht gefunden.");
    if (!slot.is_duo) throw new Error("Dieses Zeitfenster ist bereits nur als Einzeltermin markiert.");
    if (!slot.duo_partner) throw new Error("Für dieses Zeitfenster ist keine Duo-Partnerin hinterlegt.");

    const slotStart = new Date(slot.starts_at).getTime();
    const slotEnd = new Date(slot.ends_at).getTime();
    const rangeStart = new Date(data.starts_at).getTime();
    const rangeEnd = new Date(data.ends_at).getTime();
    if (rangeStart < slotStart || rangeEnd > slotEnd || rangeEnd <= rangeStart) {
      throw new Error("Der Nur-Einzel-Bereich muss vollständig innerhalb des Duo-Zeitfensters liegen.");
    }
    if (rangeEnd - rangeStart < 30 * 60_000) {
      throw new Error("Der Nur-Einzel-Bereich muss mindestens 30 Minuten lang sein.");
    }

    const { data: bookings, error: bookingError } = await db
      .from("bookings")
      .select("id, requested_start, duration_minutes, status, updated_at")
      .eq("slot_id", slot.id)
      .in("status", [...activeStatuses])
      .not("requested_start", "is", null)
      .not("duration_minutes", "is", null);
    if (bookingError) throw new Error(bookingError.message);

    const activeBookings = (bookings ?? []).filter(isActiveBooking).map((booking: any) => {
      const start = new Date(booking.requested_start).getTime();
      return { start, end: start + Number(booking.duration_minutes) * 60_000 };
    });

    const segments = [
      rangeStart > slotStart ? { start: slotStart, end: rangeStart, is_duo: true } : null,
      { start: rangeStart, end: rangeEnd, is_duo: false },
      rangeEnd < slotEnd ? { start: rangeEnd, end: slotEnd, is_duo: true } : null,
    ].filter(Boolean) as Array<{ start: number; end: number; is_duo: boolean }>;

    const bookingSegmentIndexes = new Set<number>();
    for (const booking of activeBookings) {
      const index = segments.findIndex((segment) => booking.start >= segment.start && booking.end <= segment.end);
      if (index < 0) {
        throw new Error("Eine bestehende Anfrage überschneidet eine neue Grenze. Bitte wähle Anfang und Ende außerhalb der Anfrage.");
      }
      bookingSegmentIndexes.add(index);
    }
    if (bookingSegmentIndexes.size > 1) {
      throw new Error("Bestehende Anfragen liegen in mehreren Teilbereichen. Bitte markiere die Bereiche nacheinander.");
    }

    const middleIndex = segments.findIndex((segment) => !segment.is_duo);
    const retainedIndex = bookingSegmentIndexes.size === 1
      ? [...bookingSegmentIndexes][0]
      : middleIndex;

    const common = {
      location: slot.location,
      status: slot.status,
      buffer_minutes: slot.buffer_minutes ?? 30,
      is_content_shoot: slot.is_content_shoot ?? false,
      duo_partner: slot.duo_partner,
      is_hidden: slot.is_hidden ?? false,
    };

    const retained = segments[retainedIndex];
    const { error: updateError } = await db
      .from("availability_slots")
      .update({
        starts_at: new Date(retained.start).toISOString(),
        ends_at: new Date(retained.end).toISOString(),
        is_duo: retained.is_duo,
      })
      .eq("id", slot.id);
    if (updateError) throw new Error(updateError.message);

    const inserts = segments
      .map((segment, index) => ({ segment, index }))
      .filter(({ index }) => index !== retainedIndex)
      .map(({ segment }) => ({
        ...common,
        starts_at: new Date(segment.start).toISOString(),
        ends_at: new Date(segment.end).toISOString(),
        is_duo: segment.is_duo,
      }));
    if (inserts.length) {
      const { error: insertError } = await db.from("availability_slots").insert(inserts);
      if (insertError) throw new Error(insertError.message);
    }

    return {
      ok: true,
      message: "Der gewählte Bereich wird jetzt nur als Einzeltermin angeboten. Die übrigen Bereiche bleiben Duo.",
    };
  });

export const restoreSlotDuoMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ slot_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: slot, error: slotError } = await db
      .from("availability_slots")
      .select("id, duo_partner")
      .eq("id", data.slot_id)
      .single();
    if (slotError || !slot) throw new Error(slotError?.message ?? "Zeitfenster nicht gefunden.");
    if (!slot.duo_partner) throw new Error("Die ursprüngliche Duo-Partnerin ist nicht mehr hinterlegt.");
    const { error } = await db
      .from("availability_slots")
      .update({ is_duo: true })
      .eq("id", data.slot_id);
    if (error) throw new Error(error.message);
    return { ok: true, message: "Der Bereich wird wieder als Duo und Einzel angeboten." };
  });
