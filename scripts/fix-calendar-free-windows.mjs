import fs from "node:fs";

const path = "src/lib/public-booking.functions.ts";
let source = fs.readFileSync(path, "utf8");
const startMarker = 'export const listUpcomingSlots = createServerFn({ method: "GET" }).handler(async () => {';
const start = source.indexOf(startMarker);
if (start < 0) throw new Error("listUpcomingSlots start marker not found");

const endMarker = '\n\n/**\n * Customer enters earliest start + latest end (HH:mm) + duration.';
const end = source.indexOf(endMarker, start);
if (end < 0) throw new Error("listUpcomingSlots end marker not found");

const replacement = `export const listUpcomingSlots = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  let { data: openSlots, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, location, buffer_minutes, status, is_duo, is_content_shoot, duo_partner")
    .eq("status", "open")
    .eq("is_hidden", false)
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(200);

  if (error) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fallback = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, location, buffer_minutes, status, is_duo, is_content_shoot, duo_partner")
      .eq("status", "open")
      .eq("is_hidden", false)
      .gt("ends_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(200);
    if (fallback.error) throw new Error("Termine konnten nicht geladen werden.");
    openSlots = fallback.data;
  }

  const slots = openSlots ?? [];
  if (!slots.length) return [];

  const dayKey = (value: string) => new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

  const slotsByDay = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = dayKey(slot.starts_at);
    slotsByDay.set(key, [...(slotsByDay.get(key) ?? []), slot]);
  }

  const orderedKeys = [...slotsByDay.keys()].sort();
  const firstBounds = getBerlinCalendarDayBounds(slotsByDay.get(orderedKeys[0])![0].starts_at);
  const lastBounds = getBerlinCalendarDayBounds(slotsByDay.get(orderedKeys[orderedKeys.length - 1])![0].starts_at);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: bookings, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("requested_start, duration_minutes, status, updated_at")
    .gte("requested_start", firstBounds.dayStart.toISOString())
    .lt("requested_start", lastBounds.dayEnd.toISOString())
    .in("status", ["waiting_deposit", "confirmed"])
    .not("requested_start", "is", null)
    .not("duration_minutes", "is", null);
  if (bookingError) throw bookingError;

  const busyByDay = new Map<string, Array<{ s: number; e: number }>>();
  for (const booking of bookings ?? []) {
    if (!isActiveBlockingBooking(booking) || !booking.requested_start || !booking.duration_minutes) continue;
    const s = new Date(booking.requested_start).getTime();
    const e = s + booking.duration_minutes * 60_000;
    const bookingDay = dayKey(booking.requested_start);
    busyByDay.set(bookingDay, [...(busyByDay.get(bookingDay) ?? []), { s, e }]);

    const endDay = dayKey(new Date(e - 1).toISOString());
    if (endDay !== bookingDay) {
      busyByDay.set(endDay, [...(busyByDay.get(endDay) ?? []), { s, e }]);
    }
  }

  const mergeRanges = (ranges: Array<{ s: number; e: number }>) => {
    const merged: Array<{ s: number; e: number }> = [];
    for (const range of [...ranges].sort((a, b) => a.s - b.s)) {
      const last = merged[merged.length - 1];
      if (last && range.s <= last.e) last.e = Math.max(last.e, range.e);
      else merged.push({ ...range });
    }
    return merged;
  };

  const results = [] as Array<any>;
  for (const key of orderedKeys) {
    const daySlots = [...(slotsByDay.get(key) ?? [])].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    if (!daySlots.length) continue;

    const released = mergeRanges(daySlots.map((slot) => ({
      s: new Date(slot.starts_at).getTime(),
      e: new Date(slot.ends_at).getTime(),
    })));
    const busy = mergeRanges(busyByDay.get(key) ?? []);
    const free: Array<{ s: number; e: number }> = [];

    for (const window of released) {
      let cursor = Math.max(window.s, nowMs);
      for (const block of busy) {
        if (block.e <= cursor || block.s >= window.e) continue;
        if (block.s > cursor) free.push({ s: cursor, e: Math.min(block.s, window.e) });
        cursor = Math.max(cursor, block.e);
        if (cursor >= window.e) break;
      }
      if (cursor < window.e) free.push({ s: cursor, e: window.e });
    }

    const clippedFree = free.filter((range) => range.e > range.s);
    const bookableFree = clippedFree.filter((range) => range.e - range.s >= 60 * 60_000);
    const representative = daySlots.find((slot) => !slot.is_duo) ?? daySlots[0];
    const duoSlot = daySlots.find((slot) => slot.is_duo);
    const dayIsDuo = daySlots.some((slot) => slot.is_duo);

    const windows = clippedFree.map((range, index) => {
      const sourceSlot = daySlots.find((slot) => {
        const s = new Date(slot.starts_at).getTime();
        const e = new Date(slot.ends_at).getTime();
        return range.s >= s && range.s < e;
      }) ?? representative;
      return {
        id: sourceSlot.id + "-free-" + index,
        starts_at: new Date(range.s).toISOString(),
        ends_at: new Date(range.e).toISOString(),
        location: sourceSlot.location,
        buffer_minutes: sourceSlot.buffer_minutes,
        status: sourceSlot.status,
        is_duo: sourceSlot.is_duo,
        is_content_shoot: sourceSlot.is_content_shoot,
        duo_partner: sourceSlot.duo_partner,
        is_fully_booked: range.e - range.s < 60 * 60_000,
      };
    });

    const visibleRanges = clippedFree.length ? clippedFree : released;
    results.push({
      ...representative,
      starts_at: new Date(Math.min(...visibleRanges.map((r) => r.s))).toISOString(),
      ends_at: new Date(Math.max(...visibleRanges.map((r) => r.e))).toISOString(),
      windows,
      is_duo: dayIsDuo,
      is_content_shoot: daySlots.some((slot) => slot.is_content_shoot),
      duo_partner: duoSlot?.duo_partner ?? representative.duo_partner,
      has_booking: (busyByDay.get(key) ?? []).length > 0,
      is_fully_booked: bookableFree.length === 0,
      is_reserved: false,
      reserved_until: null as string | null,
    });
  }

  return results;
});`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(path, source);
