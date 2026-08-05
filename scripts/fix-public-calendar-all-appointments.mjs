import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/public-booking.functions.ts";
let text = readFileSync(path, "utf8");

if (!text.includes("const bookingLookback = new Date(dayStart.getTime()")) {
  const pattern = /    const \{ data: bookings \} = await supabaseAdmin[\s\S]*?    const activeBookings = \(bookings \?\? \[\]\)\.filter\(\(b\) => isActiveBlockingBooking\(b\)\);/;
  const replacement = `    const bookingLookback = new Date(dayStart.getTime() - 24 * 60 * 60_000);
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("slot_id, requested_start, duration_minutes, status, updated_at")
      // The Terminplan is the source of truth. A confirmed/manual appointment
      // can lose its original slot reference when calendar windows are merged
      // or deleted, so filtering only by slot_id makes real appointments vanish
      // from the public occupancy bar. Load every blocking appointment around
      // this day and keep the ones whose actual time overlaps the shown day.
      .in("status", ["waiting_deposit", "confirmed"])
      .gte("requested_start", bookingLookback.toISOString())
      .lt("requested_start", dayEnd.toISOString())
      .not("requested_start", "is", null)
      .not("duration_minutes", "is", null);

    const activeBookings = (bookings ?? []).filter((b) => {
      if (!isActiveBlockingBooking(b) || !b.requested_start || !b.duration_minutes) return false;
      const bookingStart = new Date(b.requested_start).getTime();
      const bookingEnd = bookingStart + b.duration_minutes * 60_000;
      return bookingStart < dayEnd.getTime() && bookingEnd > dayStart.getTime();
    });`;

  if (!pattern.test(text)) {
    throw new Error("Public calendar booking query could not be located.");
  }
  text = text.replace(pattern, replacement);
}

text = text.replace("    const daySlotIds = slotsForDay.map((s) => s.id);\n\n", "");

writeFileSync(path, text);
console.log("Public calendar now includes every overlapping confirmed appointment.");
