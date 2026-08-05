import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const bookingStatusesWithTemporaryExpiry = new Set([
  "pending",
  "waiting_deposit",
]);

async function ensureAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function berlinDayKey(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function isActiveBooking(booking: {
  status: string;
  updated_at: string | null;
}) {
  if (!bookingStatusesWithTemporaryExpiry.has(booking.status))
    return booking.status === "confirmed";
  if (!booking.updated_at) return true;
  return new Date(booking.updated_at).getTime() + 24 * 60 * 60_000 > Date.now();
}

type CalendarSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  status: "open" | "held" | "booked";
  buffer_minutes: number;
  is_duo: boolean;
  is_content_shoot: boolean;
  duo_partner: string | null;
  is_hidden: boolean;
};

function sameSettings(first: CalendarSlot, second: CalendarSlot) {
  return (
    first.location === second.location &&
    first.buffer_minutes === second.buffer_minutes &&
    first.is_duo === second.is_duo &&
    first.is_content_shoot === second.is_content_shoot &&
    first.duo_partner === second.duo_partner &&
    first.is_hidden === second.is_hidden
  );
}

const splitInput = z.object({
  slot_id: z.string().uuid(),
  split_ats: z.array(z.string().datetime()).min(1).max(20),
});

export const splitCalendarSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => splitInput.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data: slot, error: slotError } = await supabaseAdmin
      .from("availability_slots")
      .select(
        "id, starts_at, ends_at, location, status, buffer_minutes, is_duo, is_content_shoot, duo_partner, is_hidden",
      )
      .eq("id", data.slot_id)
      .maybeSingle();
    if (slotError) throw new Error(slotError.message);
    if (!slot) throw new Error("Zeitfenster nicht gefunden.");

    const startMs = new Date(slot.starts_at).getTime();
    const endMs = new Date(slot.ends_at).getTime();
    const splitTimes = [
      ...new Set(data.split_ats.map((value) => new Date(value).getTime())),
    ].sort((a, b) => a - b);
    const boundaries = [startMs, ...splitTimes, endMs];
    if (
      splitTimes.some(
        (value) =>
          !Number.isFinite(value) || value <= startMs || value >= endMs,
      )
    ) {
      throw new Error(
        "Alle Trennzeiten müssen innerhalb des Zeitfensters liegen.",
      );
    }
    if (
      boundaries.some(
        (value, index) =>
          index > 0 && value - boundaries[index - 1] < 30 * 60_000,
      )
    ) {
      throw new Error(
        "Jedes neue Zeitfenster muss mindestens 30 Minuten lang sein.",
      );
    }

    const { data: bookings, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, slot_id, requested_start, duration_minutes, status, updated_at",
      )
      .eq("slot_id", slot.id);
    if (bookingError) throw new Error(bookingError.message);

    const activeBookings = (bookings ?? []).filter(
      (booking) =>
        booking.requested_start &&
        booking.duration_minutes &&
        isActiveBooking(booking),
    );
    const bufferMs = (slot.buffer_minutes ?? 30) * 60_000;
    for (const splitAt of splitTimes) {
      const conflict = activeBookings.find((booking) => {
        const bookingStart = new Date(booking.requested_start!).getTime();
        const bookingEnd = bookingStart + booking.duration_minutes! * 60_000;
        return (
          splitAt > bookingStart - bufferMs && splitAt < bookingEnd + bufferMs
        );
      });
      if (conflict) {
        throw new Error(
          "Eine Trennzeit liegt in einem gebuchten oder reservierten Termin einschließlich Puffer.",
        );
      }
    }

    const { data: meta, error: metaError } = await supabaseAdmin
      .from("availability_slot_admin_meta")
      .select("internal_note")
      .eq("slot_id", slot.id)
      .maybeSingle();
    if (metaError) throw new Error(metaError.message);

    const createdIds: string[] = [];
    const segmentIds = [slot.id];
    try {
      for (let index = 1; index < boundaries.length - 1; index += 1) {
        const { data: created, error: createError } = await supabaseAdmin
          .from("availability_slots")
          .insert({
            starts_at: new Date(boundaries[index]).toISOString(),
            ends_at: new Date(boundaries[index + 1]).toISOString(),
            location: slot.location,
            status: "open",
            buffer_minutes: slot.buffer_minutes ?? 30,
            is_duo: slot.is_duo,
            is_content_shoot: slot.is_content_shoot,
            duo_partner: slot.duo_partner,
            is_hidden: slot.is_hidden,
          })
          .select("id")
          .single();
        if (createError || !created)
          throw new Error(
            createError?.message ??
              "Ein Zeitfenster konnte nicht angelegt werden.",
          );
        createdIds.push(created.id);
        segmentIds.push(created.id);

        if (meta?.internal_note) {
          const { error: createMetaError } = await supabaseAdmin
            .from("availability_slot_admin_meta")
            .insert({
              slot_id: created.id,
              internal_note: meta.internal_note,
              created_by: context.userId,
            });
          if (createMetaError) throw new Error(createMetaError.message);
        }
      }

      for (const booking of bookings ?? []) {
        if (!booking.requested_start) continue;
        const bookingStart = new Date(booking.requested_start).getTime();
        const segmentIndex = boundaries.findIndex(
          (boundary, index) =>
            index < boundaries.length - 1 &&
            bookingStart >= boundary &&
            bookingStart < boundaries[index + 1],
        );
        if (segmentIndex < 0)
          throw new Error(
            "Eine vorhandene Buchung liegt außerhalb des ursprünglichen Zeitfensters.",
          );
        const targetId = segmentIds[segmentIndex];
        if (targetId === slot.id) continue;
        const { error: moveError } = await supabaseAdmin
          .from("bookings")
          .update({ slot_id: targetId })
          .eq("id", booking.id);
        if (moveError) throw new Error(moveError.message);
      }

      const { error: updateError } = await supabaseAdmin
        .from("availability_slots")
        .update({
          ends_at: new Date(boundaries[1]).toISOString(),
          status: "open",
        })
        .eq("id", slot.id);
      if (updateError) throw new Error(updateError.message);
    } catch (error) {
      await supabaseAdmin
        .from("bookings")
        .update({ slot_id: slot.id })
        .in("slot_id", createdIds);
      if (createdIds.length > 0) {
        await supabaseAdmin
          .from("availability_slot_admin_meta")
          .delete()
          .in("slot_id", createdIds);
        await supabaseAdmin
          .from("availability_slots")
          .delete()
          .in("id", createdIds);
      }
      throw error;
    }

    return {
      ok: true,
      created_windows: boundaries.length - 1,
      message: `${boundaries.length - 1} Zeitfenster wurden angelegt. Vorhandene Buchungen blieben unverändert.`,
    };
  });

const mergeInput = z.object({
  day_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot_ids: z.array(z.string().uuid()).min(2).max(50),
});

export const mergeCalendarSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => mergeInput.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const uniqueIds = [...new Set(data.slot_ids)];
    const { data: rows, error: slotError } = await supabaseAdmin
      .from("availability_slots")
      .select(
        "id, starts_at, ends_at, location, status, buffer_minutes, is_duo, is_content_shoot, duo_partner, is_hidden",
      )
      .in("id", uniqueIds);
    if (slotError) throw new Error(slotError.message);
    if ((rows ?? []).length !== uniqueIds.length)
      throw new Error("Mindestens ein Zeitfenster wurde nicht gefunden.");

    const slots = [...(rows as CalendarSlot[])].sort(
      (first, second) =>
        new Date(first.starts_at).getTime() -
        new Date(second.starts_at).getTime(),
    );
    if (slots.some((slot) => berlinDayKey(slot.starts_at) !== data.day_key)) {
      throw new Error(
        "Es können nur Zeitfenster desselben Kalendertages zusammengeführt werden.",
      );
    }
    if (slots.some((slot) => !sameSettings(slots[0], slot))) {
      throw new Error(
        "Studio, Puffer, Sichtbarkeit, Duo- und Content-Einstellungen müssen übereinstimmen.",
      );
    }

    const { data: metas, error: metaError } = await supabaseAdmin
      .from("availability_slot_admin_meta")
      .select("slot_id, internal_note")
      .in("slot_id", uniqueIds);
    if (metaError) throw new Error(metaError.message);
    const notes = new Map(
      (metas ?? []).map((meta) => [meta.slot_id, meta.internal_note ?? null]),
    );

    const anchor = slots[0];
    const redundantIds = slots.slice(1).map((slot) => slot.id);
    const startsAt = slots[0].starts_at;
    const endsAt = slots.reduce(
      (latest, slot) =>
        new Date(slot.ends_at).getTime() > new Date(latest).getTime()
          ? slot.ends_at
          : latest,
      slots[0].ends_at,
    );

    const timeLabel = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
    });
    const noteEntries = slots.flatMap((slot) => {
      const note = notes.get(slot.id)?.trim();
      if (!note) return [];
      return [
        `${timeLabel.format(new Date(slot.starts_at))}–${timeLabel.format(new Date(slot.ends_at))}: ${note}`,
      ];
    });
    const combinedNote = [...new Set(noteEntries)].join("\n\n") || null;
    const originalAnchorNote = notes.get(anchor.id) ?? null;
    const anchorHadMeta = notes.has(anchor.id);

    if (combinedNote) {
      const { error: saveNoteError } = await supabaseAdmin
        .from("availability_slot_admin_meta")
        .upsert(
          {
            slot_id: anchor.id,
            internal_note: combinedNote,
            created_by: context.userId,
          },
          { onConflict: "slot_id" },
        );
      if (saveNoteError) throw new Error(saveNoteError.message);
    }

    const restoreAnchorNote = async () => {
      if (anchorHadMeta) {
        await supabaseAdmin
          .from("availability_slot_admin_meta")
          .update({ internal_note: originalAnchorNote })
          .eq("slot_id", anchor.id);
      } else {
        await supabaseAdmin
          .from("availability_slot_admin_meta")
          .delete()
          .eq("slot_id", anchor.id);
      }
    };

    const { data: movedBookings, error: bookingReadError } = await supabaseAdmin
      .from("bookings")
      .select("id, slot_id")
      .in("slot_id", redundantIds);
    if (bookingReadError) {
      await restoreAnchorNote();
      throw new Error(bookingReadError.message);
    }

    const { error: updateAnchorError } = await supabaseAdmin
      .from("availability_slots")
      .update({ starts_at: startsAt, ends_at: endsAt, status: "open" })
      .eq("id", anchor.id);
    if (updateAnchorError) {
      await restoreAnchorNote();
      throw new Error(updateAnchorError.message);
    }

    const { error: moveBookingsError } = await supabaseAdmin
      .from("bookings")
      .update({ slot_id: anchor.id })
      .in("slot_id", redundantIds);
    if (moveBookingsError) {
      await supabaseAdmin
        .from("availability_slots")
        .update({
          starts_at: anchor.starts_at,
          ends_at: anchor.ends_at,
          status: anchor.status,
        })
        .eq("id", anchor.id);
      await restoreAnchorNote();
      throw new Error(moveBookingsError.message);
    }

    const { error: deleteSlotsError } = await supabaseAdmin
      .from("availability_slots")
      .delete()
      .in("id", redundantIds);
    if (deleteSlotsError) {
      for (const booking of movedBookings ?? []) {
        await supabaseAdmin
          .from("bookings")
          .update({ slot_id: booking.slot_id })
          .eq("id", booking.id);
      }
      await supabaseAdmin
        .from("availability_slots")
        .update({
          starts_at: anchor.starts_at,
          ends_at: anchor.ends_at,
          status: anchor.status,
        })
        .eq("id", anchor.id);
      await restoreAnchorNote();
      throw new Error(deleteSlotsError.message);
    }

    return {
      ok: true,
      merged_windows: slots.length,
      message: `${slots.length} Zeitfenster wurden verbunden. Vorhandene Buchungszeiten und interne Notizen blieben erhalten; bisherige Lücken sind jetzt buchbar.`,
    };
  });
