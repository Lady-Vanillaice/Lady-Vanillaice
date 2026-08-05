import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/public-booking.functions.ts";
let text = readFileSync(path, "utf8");

if (!text.includes("const bookingLookback = new Date(dayStart.getTime()")) {
  text = text.replace(
    "    const daySlotIds = slotsForDay.map((s) => s.id);\n\n    const { data: bookings } = await supabaseAdmin",
    "    const bookingLookback = new Date(dayStart.getTime() - 24 * 60 * 60_000);\n\n    const { data: bookings } = await supabaseAdmin",
  );

  text = text.replace(
    '      .in("slot_id", daySlotIds)\n',
    '      .gte("requested_start", bookingLookback.toISOString())\n      .lt("requested_start", dayEnd.toISOString())\n',
  );

  text = text.replace(
    "    const activeBookings = (bookings ?? []).filter((b) => isActiveBlockingBooking(b));",
    `    const activeBookings = (bookings ?? []).filter((b) => {
      if (!isActiveBlockingBooking(b) || !b.requested_start || !b.duration_minutes) return false;
      const appointmentStart = new Date(b.requested_start).getTime();
      const appointmentEnd = appointmentStart + b.duration_minutes * 60_000;
      return appointmentStart < dayEnd.getTime() && appointmentEnd > dayStart.getTime();
    });`,
  );
}

if (!text.includes("const bookingLookback = new Date(dayStart.getTime()") || text.includes('.in("slot_id", daySlotIds)')) {
  throw new Error("Public calendar appointment sync could not be applied.");
}

writeFileSync(path, text);
console.log("Public calendar now includes every overlapping confirmed appointment.");
