import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const STEP_MINUTES = 15;

type BusyRange = { starts_at: string; ends_at: string };

async function repairKnownManualOvernightBooking() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const oldStart = "2026-07-30T18:00:00.000Z";
  const oldEnd = "2026-07-30T20:00:00.000Z";
  const correctedStart = "2026-07-30T21:00:00.000Z";
  const correctedEnd = "2026-07-30T23:00:00.000Z";

  const { data: matches, error: matchError } = await db
    .from("bookings")
    .select("id, slot_id")
    .eq("status", "confirmed")
    .eq("duration_minutes", 120)
    .like("guest_email", "manuell+%@intern.local")
    .like("message", "%Manuell durch Admin eingetragen.%")
    .gte("requested_start", oldStart)
    .lt("requested_start", "2026-07-30T18:01:00.000Z")
    .limit(1);

  if (matchError) throw matchError;
  const booking = matches?.[0];
  if (!booking?.slot_id) return false;

  const { data: slot, error: slotError } = await db
    .from("availability_slots")
    .select("id, location, buffer_minutes, is_duo, is_content_shoot, duo_partner")
    .eq("id", booking.slot_id)
    .single();
  if (slotError || !slot) throw slotError ?? new Error("Kalenderslot fehlt");

  const { data: neighbouring, error: neighbouringError } = await db
    .from("availability_slots")
    .select("id, starts_at, ends_at")
    .eq("status", "open")
    .eq("location", slot.location)
    .lte("starts_at", oldEnd)
    .gte("ends_at", oldStart)
    .order("starts_at", { ascending: true });
  if (neighbouringError) throw neighbouringError;

  const sameInstant = (a: string, b: string) =>
    new Date(a).getTime() === new Date(b).getTime();
  const left = neighbouring?.find((entry: any) => sameInstant(entry.ends_at, oldStart));
  const right = neighbouring?.find((entry: any) => sameInstant(entry.starts_at, oldEnd));
  const covering = neighbouring?.find(
    (entry: any) =>
      new Date(entry.starts_at).getTime() <= new Date(oldStart).getTime() &&
      new Date(entry.ends_at).getTime() >= new Date(oldEnd).getTime(),
  );

  if (left && right && left.id !== right.id) {
    const { error } = await db
      .from("availability_slots")
      .update({ ends_at: right.ends_at })
      .eq("id", left.id);
    if (error) throw error;
    const { error: deleteError } = await db
      .from("availability_slots")
      .delete()
      .eq("id", right.id);
    if (deleteError) throw deleteError;
  } else if (left) {
    const { error } = await db
      .from("availability_slots")
      .update({ ends_at: oldEnd })
      .eq("id", left.id);
    if (error) throw error;
  } else if (right) {
    const { error } = await db
      .from("availability_slots")
      .update({ starts_at: oldStart })
      .eq("id", right.id);
    if (error) throw error;
  } else if (!covering) {
    const { error } = await db.from("availability_slots").insert({
      starts_at: oldStart,
      ends_at: oldEnd,
      location: slot.location,
      status: "open",
      buffer_minutes: slot.buffer_minutes ?? 45,
      is_duo: slot.is_duo ?? false,
      is_content_shoot: slot.is_content_shoot ?? false,
      duo_partner: slot.duo_partner ?? null,
      is_hidden: false,
    });
    if (error) throw error;
  }

  const { error: moveSlotError } = await db
    .from("availability_slots")
    .update({ starts_at: correctedStart, ends_at: correctedEnd })
    .eq("id", slot.id);
  if (moveSlotError) throw moveSlotError;

  const { error: moveBookingError } = await db
    .from("bookings")
    .update({ requested_start: correctedStart, duration_minutes: 120 })
    .eq("id", booking.id);
  if (moveBookingError) throw moveBookingError;

  return true;
}

function isActiveBlockingBooking(booking: { status?: string | null; updated_at?: string | null }) {
  if (booking.status !== "waiting_deposit") return true;
  if (!booking.updated_at) return true;
  return new Date(booking.updated_at).getTime() + 24 * 60 * 60_000 > Date.now();
}

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function listBusyRanges(slotId: string): Promise<BusyRange[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("requested_start, duration_minutes, status, updated_at")
    .eq("slot_id", slotId)
    .in("status", ["pending", "waiting_deposit", "confirmed"])
    .not("requested_start", "is", null)
    .not("duration_minutes", "is", null);

  if (error) throw new Error("Verfügbarkeiten konnten nicht geprüft werden.");

  return (data ?? []).flatMap((booking) => {
    if (!isActiveBlockingBooking(booking)) return [];
    if (!booking.requested_start || !booking.duration_minutes) return [];
    const startsAt = new Date(booking.requested_start).getTime();
    return [{
      starts_at: booking.requested_start,
      ends_at: new Date(startsAt + booking.duration_minutes * 60_000).toISOString(),
    }];
  });
}

const bookingInput = z.object({
  slot_id: z.string().uuid().optional(),
  guest_name: z.string().trim().min(1).max(120),
  guest_email: z.string().trim().email().max(255),
  guest_phone: z.string().trim().min(6).max(40).optional().nullable(),
  duration: z.string().trim().max(80).optional().nullable(),
  duration_minutes: z.number().int().min(15).max(1440).optional(),
  duration_label: z.string().trim().max(80).optional(),
  requested_start: z.string().datetime().optional(),
  message: z.string().trim().min(5).max(2000),
  age_confirmed: z.literal(true),
});

const startTimesInput = z.object({
  slot_id: z.string().uuid(),
  duration_minutes: z.number().int().min(15).max(1440),
});

const proposeInput = z.object({
  slot_id: z.string().uuid(),
  duration_minutes: z.number().int().min(15).max(1440),
  earliest_start_iso: z.string().datetime(),
  latest_end_iso: z.string().datetime(),
});

/**
 * Returns every 15-minute start time inside the day window where:
 *   start + duration fits before window end (minus end-buffer),
 *   AND no overlap (including buffer) with existing pending/confirmed bookings.
 */
export const listAvailableStartTimes = createServerFn({ method: "POST" })
  .inputValidator((d) => startTimesInput.parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();

    const { data: slot, error: slotErr } = await supabase
      .from("availability_slots")
      .select("id, starts_at, ends_at, buffer_minutes, status, is_duo, is_content_shoot, is_hidden")
      .eq("id", data.slot_id)
      .maybeSingle();

    if (slotErr || !slot || slot.status !== "open" || slot.is_hidden) return [];

    const winStart = new Date(slot.starts_at).getTime();
    const winEnd = new Date(slot.ends_at).getTime();
    const buffer = (slot.buffer_minutes ?? 30) * 60_000;
    const dur = data.duration_minutes * 60_000;

    const busy = await listBusyRanges(data.slot_id);

    const busyRanges: Array<{ s: number; e: number }> = busy.map((b) => ({
      s: new Date(b.starts_at).getTime() - buffer,
      e: new Date(b.ends_at).getTime() + buffer,
    }));

    const times: string[] = [];
    const stepMs = STEP_MINUTES * 60_000;
    const nowMs = Date.now();

    for (let t = winStart; t + dur <= winEnd; t += stepMs) {
      if (t < nowMs) continue;
      const reqEnd = t + dur;
      const conflict = busyRanges.some((b) => t < b.e && reqEnd > b.s);
      if (!conflict) times.push(new Date(t).toISOString());
    }
    return times;
  });

/**
 * Returns the day-window + anonymized busy ranges for the timeline view.
 * No customer PII — only start/end times of blocked periods so the UI
 * can render a "belegt / frei" bar for the day.
 */
export const getSlotAvailability = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slot_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: slot } = await supabase
      .from("availability_slots")
      .select("id, starts_at, ends_at, buffer_minutes, status, is_hidden")
      .eq("id", data.slot_id)
      .maybeSingle();

    if (!slot) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dayStart = new Date(slot.starts_at);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const { data: daySlots } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, buffer_minutes, status, is_hidden")
      .in("status", ["open", "held", "booked"])
      .lt("starts_at", dayEnd.toISOString())
      .gt("ends_at", dayStart.toISOString())
      .order("starts_at", { ascending: true });

    const slotsForDay = daySlots?.length ? daySlots : [slot];
    const visibleOpenSlots = slotsForDay.filter((s) => s.status === "open" && !s.is_hidden);
    const timelineSlots = visibleOpenSlots.length ? visibleOpenSlots : slotsForDay;
    const daySlotIds = slotsForDay.map((s) => s.id);

    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("slot_id, requested_start, duration_minutes, status, updated_at")
      .in("slot_id", daySlotIds)
      // A plain inquiry is not a reservation. Only a confirmed booking or a
      // booking explicitly waiting for its deposit blocks the public timeline.
      .in("status", ["waiting_deposit", "confirmed"])
      .not("requested_start", "is", null)
      .not("duration_minutes", "is", null);

    const activeBookings = (bookings ?? []).filter((b) => isActiveBlockingBooking(b));
    const activeBookingSlotIds = new Set(
      activeBookings.flatMap((b) => b.slot_id ? [b.slot_id] : []),
    );

    const busyFromBookings = activeBookings.flatMap((b) => {
      if (!b.requested_start || !b.duration_minutes) return [];
      const s = new Date(b.requested_start).getTime();
      return [{
        start: b.requested_start,
        end: new Date(s + b.duration_minutes * 60_000).toISOString(),
        kind: b.status === "confirmed" ? "booked" as const : "reserved" as const,
      }];
    });

    const busyFromClosedSlots = slotsForDay.flatMap((s) => {
      if (s.status !== "booked" && s.status !== "held") return [];
      // A closed slot with a concrete booking must use that booking's exact
      // start/end. Adding the whole slot as well would paint the entire
      // availability window as occupied.
      if (activeBookingSlotIds.has(s.id)) return [];
      return [{
        start: s.starts_at,
        end: s.ends_at,
        // Closed availability is not proof of a customer booking. The
        // bookings table above is authoritative for red/grey customer ranges.
        kind: "unavailable" as const,
      }];
    });

    const sortedOpen = [...timelineSlots]
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    // The visible availability defines what can still be requested, but it must
    // not cap the timeline. Manually entered/confirmed bookings can sit outside
    // that window (including across midnight), so include every blocking range
    // when deriving the displayed bounds.
    const blockingRanges = [...busyFromClosedSlots, ...busyFromBookings];
    const starts = [
      ...sortedOpen.map((s) => new Date(s.starts_at).getTime()),
      ...blockingRanges.map((range) => new Date(range.start).getTime()),
    ];
    const ends = [
      ...sortedOpen.map((s) => new Date(s.ends_at).getTime()),
      ...blockingRanges.map((range) => new Date(range.end).getTime()),
    ];
    const timelineStart = Math.min(...starts);
    const timelineEnd = Math.max(...ends);
    const unavailableGaps: Array<{ start: string; end: string; kind: "unavailable" }> = [];
    let cursor = timelineStart;
    for (const s of sortedOpen) {
      const sStart = new Date(s.starts_at).getTime();
      const sEnd = new Date(s.ends_at).getTime();
      if (sStart > cursor) {
        unavailableGaps.push({
          start: new Date(cursor).toISOString(),
          end: new Date(sStart).toISOString(),
          kind: "unavailable",
        });
      }
      cursor = Math.max(cursor, sEnd);
    }
    if (cursor < timelineEnd) {
      unavailableGaps.push({
        start: new Date(cursor).toISOString(),
        end: new Date(timelineEnd).toISOString(),
        kind: "unavailable",
      });
    }

    return {
      starts_at: new Date(timelineStart).toISOString(),
      ends_at: new Date(timelineEnd).toISOString(),
      buffer_minutes: slot.buffer_minutes ?? 30,
      status: slot.status,
      busy: [...unavailableGaps, ...blockingRanges],
    };
  });

/**
 * Customer enters earliest start + latest end (HH:mm) + duration.
 * The server proposes a concrete start time that fits the day window and
 * is automatically packed against existing bookings (right after the
 * previous one, or right before the next one) to minimize fragmentation.
 *
 * Returns a single proposed { start, end } ISO pair, or an error message.
 */
export const proposeBookingTime = createServerFn({ method: "POST" })
  .inputValidator((d) => proposeInput.parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();

    const { data: slot } = await supabase
      .from("availability_slots")
      .select("id, starts_at, ends_at, buffer_minutes, status, is_duo, is_content_shoot, is_hidden")
      .eq("id", data.slot_id)
      .maybeSingle();

    if (!slot || slot.status !== "open" || slot.is_hidden) {
      return { ok: false as const, reason: "Dieser Termin ist nicht mehr verfügbar." };
    }

    const buffer = (slot.buffer_minutes ?? 30) * 60_000;
    const dur = data.duration_minutes * 60_000;
    const stepMs = STEP_MINUTES * 60_000;

    const dayStart = new Date(slot.starts_at);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: daySlots } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, buffer_minutes, status, is_duo, is_content_shoot, is_hidden")
      .in("status", ["open", "held", "booked"])
      .lt("starts_at", dayEnd.toISOString())
      .gt("ends_at", dayStart.toISOString())
      .order("starts_at", { ascending: true });

    const openDaySlots = (daySlots ?? [slot]).filter((s) => s.status === "open" && !s.is_hidden);
    if (openDaySlots.length === 0) {
      return { ok: false as const, reason: "Dieser Termin ist nicht mehr verfügbar." };
    }

    // Customer's window arrives as ISO datetimes already anchored to the slot day
    // in the customer's local timezone — so no server-side HH:mm parsing needed.
    const custEarliest = new Date(data.earliest_start_iso).getTime();
    const custLatest = new Date(data.latest_end_iso).getTime();

    if (!Number.isFinite(custEarliest) || !Number.isFinite(custLatest)) {
      return { ok: false as const, reason: "Bitte gib ein gültiges Zeitfenster an." };
    }

    if (custLatest - custEarliest < data.duration_minutes * 60_000) {
      return { ok: false as const, reason: "Dein Zeitfenster ist kürzer als die gewünschte Dauer." };
    }

    const nowMs = Date.now();
    const slotIds = (daySlots ?? [slot]).map((s) => s.id);
    const { data: dayBookings } = await supabaseAdmin
      .from("bookings")
      .select("requested_start, duration_minutes, status, updated_at")
      .in("slot_id", slotIds)
      .in("status", ["pending", "waiting_deposit", "confirmed"])
      .not("requested_start", "is", null)
      .not("duration_minutes", "is", null);

    const busy = (dayBookings ?? []).flatMap((b) => {
      if (!isActiveBlockingBooking(b)) return [];
      if (!b.requested_start || !b.duration_minutes) return [];
      const startsAt = new Date(b.requested_start).getTime();
      return [{
        starts_at: b.requested_start,
        ends_at: new Date(startsAt + b.duration_minutes * 60_000).toISOString(),
      }];
    });
    const busyRanges: Array<{ s: number; e: number }> = busy
      .map((b) => ({ s: new Date(b.starts_at).getTime(), e: new Date(b.ends_at).getTime() }))
      .sort((a, b) => a.s - b.s);
    for (const closed of (daySlots ?? []).filter((s) => s.status === "booked")) {
      busyRanges.push({ s: new Date(closed.starts_at).getTime(), e: new Date(closed.ends_at).getTime() });
    }
    busyRanges.sort((a, b) => a.s - b.s);

    const fits = (t: number, searchStart: number, searchEnd: number) => {
      if (t < searchStart) return false;
      if (t + dur > searchEnd) return false;
      return !busyRanges.some((b) => t < b.e + buffer && t + dur > b.s - buffer);
    };

    // Strategy: prefer packing.
    // 1. Try right after each existing booking (b.e + buffer, rounded up to 15-min).
    // 2. Try right before each existing booking (b.s - buffer - dur, rounded down to 15-min).
    // 3. Fallback: earliest valid 15-min boundary inside the search window.
    const roundUp = (t: number) => {
      const r = t % stepMs;
      return r === 0 ? t : t + (stepMs - r);
    };
    const roundDown = (t: number) => t - (t % stepMs);

    const valid: number[] = [];
    for (const openSlot of openDaySlots) {
      const searchStart = roundUp(Math.max(custEarliest, new Date(openSlot.starts_at).getTime(), nowMs));
      const searchEnd = Math.min(custLatest, new Date(openSlot.ends_at).getTime());
      if (searchEnd - searchStart < dur) continue;

      const candidates: number[] = [];
      for (const b of busyRanges) {
        candidates.push(roundUp(b.e + buffer));
        candidates.push(roundDown(b.s - buffer - dur));
      }
      for (let t = searchStart; t + dur <= searchEnd; t += stepMs) {
        candidates.push(t);
        if (candidates.length > 400) break;
      }
      valid.push(...candidates.filter((t) => fits(t, searchStart, searchEnd)));
    }

    valid.sort((a, b) => a - b);
    if (valid.length === 0) {
      return { ok: false as const, reason: "In deinem Zeitfenster ist leider keine passende Lücke frei. Wähle bitte ein weiteres Fenster oder eine kürzere Dauer." };
    }

    // Prefer the one closest (in either direction) to an existing booking edge — this packs the day tightly.
    let best = valid[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const t of valid) {
      let dist = Number.POSITIVE_INFINITY;
      for (const b of busyRanges) {
        const dEnd = Math.abs(t - (b.e + buffer));
        const dStart = Math.abs(t + dur - (b.s - buffer));
        dist = Math.min(dist, dEnd, dStart);
      }
      if (busyRanges.length === 0) dist = t - custEarliest; // no bookings → just earliest
      if (dist < bestDist) { bestDist = dist; best = t; }
    }

    return {
      ok: true as const,
      start: new Date(best).toISOString(),
      end: new Date(best + dur).toISOString(),
    };
  });
export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => bookingInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let insertData: {
      slot_id?: string | null;
      guest_name: string;
      guest_email: string;
      guest_phone?: string | null;
      duration?: string | null;
      duration_minutes?: number | null;
      requested_start?: string | null;
      message: string;
    } = {
      guest_name: data.guest_name,
      guest_email: data.guest_email,
      guest_phone: data.guest_phone ?? null,
      duration: data.duration ?? data.duration_label ?? null,
      duration_minutes: data.duration_minutes ?? null,
      requested_start: data.requested_start ?? null,
      message: data.message,
    };

    if (data.slot_id && data.requested_start && data.duration_minutes) {
      // Slot-based booking: re-validate availability (race protection).
      const supabase = publicClient();
      const { data: slot } = await supabase
        .from("availability_slots")
        .select("id, starts_at, ends_at, buffer_minutes, status, location, is_duo, is_content_shoot, is_hidden")
        .eq("id", data.slot_id)
        .maybeSingle();

      if (!slot || slot.status !== "open" || slot.is_hidden) {
        throw new Error("Dieser Termin ist nicht mehr verfügbar. Bitte wähle einen anderen Tag.");
      }

      const reqStart = new Date(data.requested_start).getTime();
      const reqEnd = reqStart + data.duration_minutes * 60_000;
      let targetSlot = slot;
      let winStart = new Date(targetSlot.starts_at).getTime();
      let winEnd = new Date(targetSlot.ends_at).getTime();

      if (reqStart < winStart || reqEnd > winEnd) {
        const dayStart = new Date(slot.starts_at);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        const { data: dayOpenSlots } = await supabaseAdmin
          .from("availability_slots")
          .select("id, starts_at, ends_at, buffer_minutes, status, location, is_duo, is_content_shoot, is_hidden")
          .eq("status", "open")
          .eq("is_hidden", false)
          .lt("starts_at", dayEnd.toISOString())
          .gt("ends_at", dayStart.toISOString())
          .order("starts_at", { ascending: true });
        const containingSlot = (dayOpenSlots ?? []).find((s) => {
          const sStart = new Date(s.starts_at).getTime();
          const sEnd = new Date(s.ends_at).getTime();
          return reqStart >= sStart && reqEnd <= sEnd;
        });
        if (containingSlot) {
          targetSlot = containingSlot;
          winStart = new Date(targetSlot.starts_at).getTime();
          winEnd = new Date(targetSlot.ends_at).getTime();
        }
      }

      if (reqStart < winStart || reqEnd > winEnd) {
        throw new Error("Die gewünschte Dauer passt nicht in das Tagesfenster. Bitte wähle eine andere Startzeit oder Dauer.");
      }

      const buffer = (targetSlot.buffer_minutes ?? 30) * 60_000;
      const busy = await listBusyRanges(targetSlot.id);
      const conflict = busy.some((b) => {
        const bs = new Date(b.starts_at).getTime() - buffer;
        const be = new Date(b.ends_at).getTime() + buffer;
        return reqStart < be && reqEnd > bs;
      });
      if (conflict) {
        throw new Error("Diese Zeit ist gerade vergeben worden. Bitte wähle eine andere Startzeit.");
      }

      insertData = {
        ...insertData,
        slot_id: targetSlot.id,
        duration: data.duration_label ?? null,
        duration_minutes: data.duration_minutes,
        requested_start: new Date(reqStart).toISOString(),
      };
    }

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert(insertData)
      .select("id")
      .single();

    if (error || !row) {
      console.error("Failed to insert booking", error);
      throw new Error(
        "Diese Anfrage konnte nicht gespeichert werden. Bitte versuche es später erneut.",
      );
    }

    // Fire-and-track emails (best effort).
    try {
      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
      const wishDate = data.requested_start
        ? new Date(data.requested_start).toLocaleString("de-DE", {
            dateStyle: "full",
            timeStyle: "short",
          })
        : "noch offen";
      const guestData = {
        guestName: data.guest_name,
        wishDate,
        duration: data.duration_label ?? data.duration ?? "noch offen",
        message: data.message,
      };
      await Promise.all([
        enqueueTransactionalEmail({
          templateName: "booking-confirmation",
          recipientEmail: data.guest_email,
          templateData: guestData,
          idempotencyKey: `booking-confirm-${row.id}`,
        }),
        enqueueTransactionalEmail({
          templateName: "booking-notification",
          recipientEmail: "info@herzblutmadl.com",
          templateData: { type: "Session", ...guestData, guestEmail: data.guest_email, bookingId: row.id },
          idempotencyKey: `booking-notify-${row.id}`,
        }),
      ]);
    } catch (err) {
      console.error("Failed to enqueue booking emails", err);
    }

    try {
      const { sendNewBookingPush } = await import("@/lib/push-notifications.server");
      await sendNewBookingPush({
        bookingId: row.id,
        guestName: data.guest_name,
        requestedStart: insertData.requested_start ?? null,
      });
    } catch (err) {
      console.error("Failed to send booking push notification", err);
    }

    return { id: row.id };
  });

/**
 * Public read of upcoming day-windows for the calendar view.
 * Booked/held time ranges block only their own hours.
 * Open slots are flagged 'is_fully_booked' when no 60-minute window is free
 * any more (considering pending/confirmed bookings + buffer).
 */
export const listUpcomingSlots = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, location, buffer_minutes, status, is_duo, is_content_shoot, duo_partner")
    .eq("status", "open")
    .eq("is_hidden", false)
    .gt("ends_at", now)
    .order("starts_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("Public slot read failed, using server fallback", error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fallback, error: fallbackError } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, location, buffer_minutes, status, is_duo, is_content_shoot, duo_partner")
      .eq("status", "open")
      .eq("is_hidden", false)
      .gt("ends_at", now)
      .order("starts_at", { ascending: true })
      .limit(200);

    if (fallbackError) throw new Error("Termine konnten nicht geladen werden.");
    return (fallback ?? []).map((s) => ({ ...s, windows: [s], is_fully_booked: false, has_booking: false, is_reserved: false, reserved_until: null as string | null }));
  }

  const slots = data ?? [];
  if (slots.length === 0) return [];

  const openSlots = slots;
  const dayKeys = Array.from(new Set(slots.map((s) => new Date(s.starts_at).toISOString().slice(0, 10))));
  const rangeStart = new Date(`${dayKeys[0]}T00:00:00.000Z`);
  const rangeEnd = new Date(`${dayKeys[dayKeys.length - 1]}T00:00:00.000Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const slotIds = openSlots.map((s) => s.id);

  const { data: closedSlots } = await supabaseAdmin
    .from("availability_slots")
    .select("id, starts_at, ends_at, status")
    .in("status", ["held", "booked"])
    .lt("starts_at", rangeEnd.toISOString())
    .gt("ends_at", rangeStart.toISOString())
    .order("starts_at", { ascending: true });

  const bookingsBySlot = new Map<string, BusyRange[]>();
  if (slotIds.length > 0) {
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("slot_id, requested_start, duration_minutes, status, updated_at")
      .in("slot_id", slotIds)
      .in("status", ["pending", "waiting_deposit", "confirmed"])
      .not("requested_start", "is", null)
      .not("duration_minutes", "is", null);

    (bookings ?? []).forEach((b) => {
      if (!isActiveBlockingBooking(b)) return;
      if (!b.slot_id || !b.requested_start || !b.duration_minutes) return;
      const startsAt = new Date(b.requested_start).getTime();
      const range: BusyRange = {
        starts_at: b.requested_start,
        ends_at: new Date(startsAt + b.duration_minutes * 60_000).toISOString(),
      };
      const list = bookingsBySlot.get(b.slot_id) ?? [];
      list.push(range);
      bookingsBySlot.set(b.slot_id, list);
    });
  }

  const MIN_DURATION_MS = 60 * 60_000;
  const STEP_MS = 15 * 60_000;

  const enrichedSlots = slots.map((slot) => {
      const winStart = new Date(slot.starts_at).getTime();
      const winEnd = new Date(slot.ends_at).getTime();
    const buffer = (slot.buffer_minutes ?? 30) * 60_000;
    const busy = bookingsBySlot.get(slot.id) ?? [];
      // Alle real belegten Slots am selben Tag (booked ODER held) sperren
      // ihre Stunden innerhalb dieses offenen Fensters. Der Tag darf erst
      // dann als voll gelten, wenn wirklich kein 60-Minuten-Fenster mehr
      // frei ist.
      const sameDayClosed = (closedSlots ?? []).filter((s) => {
        if (s.id === slot.id) return false;
        return new Date(s.starts_at).toISOString().slice(0, 10) === new Date(slot.starts_at).toISOString().slice(0, 10);
      });
      const hasBooking = busy.length > 0 || sameDayClosed.length > 0;
    const busyRanges = busy.map((b) => ({
      s: new Date(b.starts_at).getTime() - buffer,
      e: new Date(b.ends_at).getTime() + buffer,
    }));
      for (const closed of sameDayClosed) {
        busyRanges.push({
          s: new Date(closed.starts_at).getTime() - buffer,
          e: new Date(closed.ends_at).getTime() + buffer,
        });
      }

    let hasFree = false;
    for (let t = winStart; t + MIN_DURATION_MS <= winEnd; t += STEP_MS) {
      if (t < nowMs) continue;
      const reqEnd = t + MIN_DURATION_MS;
      const conflict = busyRanges.some((b) => t < b.e && reqEnd > b.s);
      if (!conflict) {
        hasFree = true;
        break;
      }
    }

    return { ...slot, is_fully_booked: !hasFree, has_booking: hasBooking, is_reserved: false, reserved_until: null as string | null };
  });

  const byDay = new Map<string, (typeof enrichedSlots)[number]>();
  for (const slot of enrichedSlots) {
    const key = new Date(slot.starts_at).toISOString().slice(0, 10);
    const current = byDay.get(key);
    if (!current) {
      byDay.set(key, slot);
      continue;
    }
    const currentIsBookable = current.status === "open" && !current.is_fully_booked;
    const slotIsBookable = slot.status === "open" && !slot.is_fully_booked;
    if (slotIsBookable && !currentIsBookable) {
      byDay.set(key, slot);
      continue;
    }
    if (slotIsBookable === currentIsBookable && slot.status === "open" && current.status !== "open") {
      byDay.set(key, slot);
    }
  }

  return [...byDay.entries()].map(([dayKey, slot]) => {
    const daySlots = enrichedSlots.filter((s) => new Date(s.starts_at).toISOString().slice(0, 10) === dayKey);
    const starts = daySlots.map((s) => new Date(s.starts_at).getTime());
    const ends = daySlots.map((s) => new Date(s.ends_at).getTime());
    const duoSlot = daySlots.find((s) => s.is_duo);
    return {
      ...slot,
      starts_at: new Date(Math.min(...starts)).toISOString(),
      ends_at: new Date(Math.max(...ends)).toISOString(),
      windows: daySlots.map((s) => ({
        id: s.id,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        location: s.location,
        buffer_minutes: s.buffer_minutes,
        status: s.status,
        is_duo: s.is_duo,
        is_content_shoot: s.is_content_shoot,
        duo_partner: s.duo_partner,
        is_fully_booked: s.is_fully_booked,
      })),
      is_duo: daySlots.some((s) => s.is_duo),
      is_content_shoot: daySlots.some((s) => s.is_content_shoot),
      duo_partner: duoSlot?.duo_partner ?? slot.duo_partner,
      has_booking: daySlots.some((s) => s.has_booking),
      is_fully_booked: !daySlots.some((s) => s.status === "open" && !s.is_fully_booked),
      is_reserved: false,
    };
  });
});
