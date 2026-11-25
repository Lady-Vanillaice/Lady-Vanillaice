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

function isBlockingBooking(booking: { status?: string | null; updated_at?: string | null; slot_id?: string | null }) {
  // „Anzahlung fehlt noch“ (wartet auf Anzahlung, noch ohne Kalender-Slot) blockiert nichts.
  if (booking.status === "waiting_deposit" && "slot_id" in booking && !booking.slot_id) return false;
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
      // Bei einem Ablauf (Session/Liegezeit/Kollegin …): nur diese Teile blockieren.
      blocking_ranges: z
        .array(z.object({ start: z.string().datetime(), end: z.string().datetime() }))
        .max(20)
        .optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    if ((data.requested_start && !data.duration_minutes) || (!data.requested_start && data.duration_minutes)) {
      throw new Error("Bitte Datum, Uhrzeit und Dauer gemeinsam ausfüllen.");
    }

    if (!data.requested_start || !data.duration_minutes) {
      const { error } = await context.supabase
        .from("bookings")
        .update({ requested_start: null, duration_minutes: null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error: bookingErr } = await context.supabase
      .from("bookings")
      .select("id, slot_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (bookingErr) throw new Error(bookingErr.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");

    const requestedStart = new Date(data.requested_start);
    if (!Number.isFinite(requestedStart.getTime())) {
      throw new Error("Bitte gib ein gültiges Datum und eine gültige Uhrzeit ein.");
    }
    const requestedEnd = new Date(requestedStart.getTime() + data.duration_minutes * 60_000);

    // „Anzahlung fehlt noch“: Termin blockiert noch nichts – nur Zeit/Dauer merken.
    if (booking.status === "waiting_deposit" && !booking.slot_id) {
      const { error: deferredErr } = await context.supabase
        .from("bookings")
        .update({ requested_start: requestedStart.toISOString(), duration_minutes: data.duration_minutes })
        .eq("id", data.id);
      if (deferredErr) throw new Error(deferredErr.message);
      const { readDeferredSlot, saveDeferredSlot } = await import("./deferred-booking.server");
      const stored = await readDeferredSlot(supabaseAdmin, data.id);
      if (stored) {
        await saveDeferredSlot(supabaseAdmin, data.id, {
          ...stored,
          starts_at: requestedStart.toISOString(),
          ends_at: requestedEnd.toISOString(),
        });
      }
      return { ok: true, slot_id: null };
    }

    const { data: blockers, error: blockersErr } = await supabaseAdmin
      .from("bookings")
      .select("id, slot_id, requested_start, duration_minutes, status, updated_at")
      .neq("id", data.id)
      .in("status", ["pending", "waiting_deposit", "confirmed"])
      .not("requested_start", "is", null)
      .not("duration_minutes", "is", null);
    if (blockersErr) throw new Error(blockersErr.message);

    // Freie Teile anderer Abläufe (unbeaufsichtigte Liegezeit, Kollegin, Pausen) blockieren nicht.
    const { loadFreeLiegezeitHoles } = await import("./session-plan.server");
    const { subtractHoles } = await import("./session-plan");
    const otherHoles = await loadFreeLiegezeitHoles(requestedStart.getTime(), requestedEnd.getTime());
    const ownRanges = data.blocking_ranges?.length
      ? data.blocking_ranges.map((r) => ({ s: new Date(r.start).getTime(), e: new Date(r.end).getTime() }))
      : [{ s: requestedStart.getTime(), e: requestedEnd.getTime() }];
    const conflicts = (blockers ?? []).some((blocked) => {
      if (!isBlockingBooking(blocked)) return false;
      if (!blocked.requested_start || !blocked.duration_minutes) return false;
      const blockedStart = new Date(blocked.requested_start).getTime();
      const blockedEnd = blockedStart + blocked.duration_minutes * 60_000;
      const blockedParts = subtractHoles([{ s: blockedStart, e: blockedEnd }], otherHoles, 0);
      return blockedParts.some((b) => ownRanges.some((own) => own.s < b.e && own.e > b.s));
    });
    if (conflicts) {
      throw new Error("Diese Uhrzeit überschneidet sich mit einem anderen Termin. Bitte wähle eine andere Uhrzeit.");
    }

    let currentSlot: {
      id: string;
      starts_at: string;
      ends_at: string;
      location: string | null;
      location_address: string | null;
      is_duo: boolean | null;
      is_content_shoot: boolean | null;
      duo_partner: string | null;
      is_hidden: boolean | null;
      status?: string | null;
    } | null = null;

    if (booking.slot_id) {
      const { data: slot, error: currentSlotErr } = await supabaseAdmin
        .from("availability_slots")
        .select("id, starts_at, ends_at, location, location_address, is_duo, is_content_shoot, duo_partner, is_hidden, status")
        .eq("id", booking.slot_id)
        .maybeSingle();
      if (currentSlotErr) throw new Error(currentSlotErr.message);
      currentSlot = slot;
    }

    // Eigener (versteckter, gebuchter) Termin-Slot, z. B. aus „Termin eintragen“
    // im Terminplan: Er wird an die neue Uhrzeit/Dauer angepasst, und die frei
    // gewordene Zeit erscheint automatisch wieder im öffentlichen Kalender.
    if (currentSlot && currentSlot.status === "booked" && currentSlot.is_hidden) {
      const { data: others, error: othersErr } = await supabaseAdmin
        .from("bookings")
        .select("id, status, updated_at")
        .eq("slot_id", currentSlot.id)
        .neq("id", data.id)
        .in("status", ["pending", "waiting_deposit", "confirmed"]);
      if (othersErr) throw new Error(othersErr.message);
      const sharedSlot = (others ?? []).some((other) => isBlockingBooking(other));
      if (!sharedSlot) {
        const oldStart = new Date(currentSlot.starts_at).getTime();
        const oldEnd = new Date(currentSlot.ends_at).getTime();
        const newStart = requestedStart.getTime();
        const newEnd = requestedEnd.getTime();

        const { error: resizeErr } = await supabaseAdmin
          .from("availability_slots")
          .update({ starts_at: requestedStart.toISOString(), ends_at: requestedEnd.toISOString() })
          .eq("id", currentSlot.id);
        if (resizeErr) throw new Error(resizeErr.message);

        const { error: updateOwnErr } = await context.supabase
          .from("bookings")
          .update({
            requested_start: requestedStart.toISOString(),
            duration_minutes: data.duration_minutes,
            ...(booking.status === "rescheduling" ? { status: "confirmed" } : {}),
          })
          .eq("id", data.id);
        if (updateOwnErr) throw new Error(updateOwnErr.message);

        // Frei gewordene Teile des alten Zeitraums (vorne und/oder hinten).
        const { releaseFreedParts } = await import("./slot-sync.server");
        await releaseFreedParts(supabaseAdmin, oldStart, oldEnd, newStart, newEnd);
        return { ok: true, slot_id: currentSlot.id };
      }
    }

    const dayStart = new Date(requestedStart);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const { data: openDaySlots, error: slotErr } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, location, location_address, is_duo, is_content_shoot, duo_partner, is_hidden")
      .eq("status", "open")
      .eq("is_hidden", false)
      .lt("starts_at", dayEnd.toISOString())
      .gt("ends_at", dayStart.toISOString())
      .order("starts_at", { ascending: true });
    if (slotErr) throw new Error(slotErr.message);

    const containingSlot = (openDaySlots ?? []).find((slot) => {
      const slotStart = new Date(slot.starts_at).getTime();
      const slotEnd = new Date(slot.ends_at).getTime();
      return requestedStart.getTime() >= slotStart && requestedEnd.getTime() <= slotEnd;
    });

    let nextSlotId: string | null = containingSlot?.id ?? null;

    const stillInsideCurrent = currentSlot
      ? requestedStart.getTime() >= new Date(currentSlot.starts_at).getTime() &&
        requestedEnd.getTime() <= new Date(currentSlot.ends_at).getTime()
      : false;

    if (!nextSlotId && stillInsideCurrent && currentSlot) {
      nextSlotId = currentSlot.id;
    }

    // Wenn der neue Admin-Termin außerhalb aller bestehenden Zeitfenster liegt,
    // bekommt er einen eigenen versteckten Slot. Dadurch bleiben Datum, Uhrzeit,
    // Studio und Terminplan konsistent, ohne einen zweiten Buchungsdatensatz anzulegen.
    if (!nextSlotId) {
      const { data: newSlot, error: createSlotErr } = await supabaseAdmin
        .from("availability_slots")
        .insert({
          starts_at: requestedStart.toISOString(),
          ends_at: requestedEnd.toISOString(),
          status: "booked",
          is_hidden: true,
          location: currentSlot?.location ?? "Individueller Termin",
          location_address: currentSlot?.location_address ?? null,
          is_duo: currentSlot?.is_duo ?? false,
          is_content_shoot: currentSlot?.is_content_shoot ?? false,
          duo_partner: currentSlot?.duo_partner ?? null,
        })
        .select("id")
        .single();
      if (createSlotErr || !newSlot) {
        throw new Error(createSlotErr?.message ?? "Neuer Termin-Slot konnte nicht angelegt werden.");
      }
      nextSlotId = newSlot.id;
    }

    const { error: updateErr } = await context.supabase
      .from("bookings")
      .update({
        requested_start: requestedStart.toISOString(),
        duration_minutes: data.duration_minutes,
        slot_id: nextSlotId,
        ...(booking.status === "rescheduling" ? { status: "confirmed" } : {}),
      })
      .eq("id", data.id);
    if (updateErr) throw new Error(updateErr.message);

    // Den alten Slot wieder freigeben, wenn die Buchung ihn verlassen hat und
    // kein anderer aktiver Termin mehr daran hängt. Versteckte Slots bleiben versteckt.
    if (booking.slot_id && booking.slot_id !== nextSlotId) {
      const { data: remaining, error: remainingErr } = await supabaseAdmin
        .from("bookings")
        .select("id, status, updated_at")
        .eq("slot_id", booking.slot_id)
        .neq("id", data.id)
        .in("status", ["pending", "waiting_deposit", "confirmed"]);
      if (remainingErr) throw new Error(remainingErr.message);

      const hasActiveRemaining = (remaining ?? []).some((other) => isBlockingBooking(other));
      if (!hasActiveRemaining) {
        await supabaseAdmin
          .from("availability_slots")
          .update({ status: "open" })
          .eq("id", booking.slot_id);
      }
    }

    return { ok: true, slot_id: nextSlotId };
  });
