import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

function berlinDayKey(value: string | Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

type CalendarSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  status: string;
  buffer_minutes: number | null;
  is_duo: boolean | null;
  is_content_shoot: boolean | null;
  duo_partner: string | null;
  is_hidden: boolean | null;
};

function sameSettings(first: CalendarSlot, second: CalendarSlot) {
  return (
    first.location === second.location
    && (first.buffer_minutes ?? 30) === (second.buffer_minutes ?? 30)
    && Boolean(first.is_duo) === Boolean(second.is_duo)
    && Boolean(first.is_content_shoot) === Boolean(second.is_content_shoot)
    && (first.duo_partner ?? null) === (second.duo_partner ?? null)
    && Boolean(first.is_hidden) === Boolean(second.is_hidden)
  );
}

export const mergeCalendarDayPreservingBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ day_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allSlots, error: slotError } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, location, status, buffer_minutes, is_duo, is_content_shoot, duo_partner, is_hidden")
      .order("starts_at", { ascending: true });
    if (slotError) throw new Error(slotError.message);

    const slots = ((allSlots ?? []) as CalendarSlot[])
      .filter((slot) => berlinDayKey(slot.starts_at) === data.day_key)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    if (slots.length < 2) {
      return { ok: true, merged_groups: 0, message: "Der Tag ist bereits zusammengeführt." };
    }

    const groups: CalendarSlot[][] = [];
    for (const slot of slots) {
      const current = groups[groups.length - 1];
      if (!current) {
        groups.push([slot]);
        continue;
      }
      const previous = current[current.length - 1];
      if (sameSettings(previous, slot)) current.push(slot);
      else groups.push([slot]);
    }

    let mergedGroups = 0;
    for (const group of groups.filter((items) => items.length > 1)) {
      const anchor = group[0];
      const memberIds = group.map((slot) => slot.id);
      const redundantIds = memberIds.slice(1);
      const startsAt = group.reduce(
        (min, slot) => new Date(slot.starts_at).getTime() < new Date(min).getTime() ? slot.starts_at : min,
        group[0].starts_at,
      );
      const endsAt = group.reduce(
        (max, slot) => new Date(slot.ends_at).getTime() > new Date(max).getTime() ? slot.ends_at : max,
        group[0].ends_at,
      );

      const { error: moveBookingsError } = await supabaseAdmin
        .from("bookings")
        .update({ slot_id: anchor.id })
        .in("slot_id", redundantIds);
      if (moveBookingsError) throw new Error(moveBookingsError.message);

      const { error: updateAnchorError } = await supabaseAdmin
        .from("availability_slots")
        .update({ starts_at: startsAt, ends_at: endsAt, status: "open" })
        .eq("id", anchor.id);
      if (updateAnchorError) throw new Error(updateAnchorError.message);

      const { error: deleteMetaError } = await supabaseAdmin
        .from("availability_slot_admin_meta")
        .delete()
        .in("slot_id", redundantIds);
      if (deleteMetaError) throw new Error(deleteMetaError.message);

      const { error: deleteSlotsError } = await supabaseAdmin
        .from("availability_slots")
        .delete()
        .in("id", redundantIds);
      if (deleteSlotsError) throw new Error(deleteSlotsError.message);

      mergedGroups += 1;
    }

    return {
      ok: true,
      merged_groups: mergedGroups,
      message: mergedGroups > 0
        ? "Die Zeitfenster wurden zu einem durchgehenden Zeitraum verbunden. Lücken zwischen den bisherigen Zeiten sind jetzt ebenfalls buchbar."
        : "Es gab keine Zeitfenster mit übereinstimmenden Einstellungen, die zusammengeführt werden konnten.",
    };
  });
