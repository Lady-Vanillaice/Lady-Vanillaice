import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target missing: ${label}`);
  return source.replace(before, after);
}

const bookingPath = "src/lib/public-booking.functions.ts";
let booking = readFileSync(bookingPath, "utf8");

const oldSlotMaps = `    const bufferBySlotId = new Map(
      slotsForDay.map((s) => [s.id, s.buffer_minutes ?? 30]),
    );
    const slotById = new Map(slotsForDay.map((s) => [s.id, s]));`;

const newSlotMaps = `    // Build the slot lookup before loading metadata for hidden manual slots.
    // The day-wide query also returns external appointments whose source slot
    // is hidden and therefore not part of slotsForDay.
    const slotById = new Map(slotsForDay.map((s) => [s.id, s]));
    const activeBookingSlotIds = [...new Set(
      activeBookings.flatMap((activeBooking) =>
        activeBooking.slot_id ? [activeBooking.slot_id] : [],
      ),
    )];

    if (activeBookingSlotIds.length) {
      const { data: activeBookingSlots, error: activeBookingSlotsError } = await supabaseAdmin
        .from("availability_slots")
        .select("id, is_duo, duo_partner, buffer_minutes")
        .in("id", activeBookingSlotIds);
      if (activeBookingSlotsError) throw activeBookingSlotsError;
      for (const activeSlot of activeBookingSlots ?? []) {
        slotById.set(activeSlot.id, activeSlot);
      }
    }

    const bufferBySlotId = new Map(
      slotsForDay.map((s) => [s.id, s.buffer_minutes ?? 30]),
    );
    for (const [slotId, activeSlot] of slotById) {
      if (!bufferBySlotId.has(slotId) && activeSlot.buffer_minutes != null) {
        bufferBySlotId.set(slotId, activeSlot.buffer_minutes);
      }
    }`;

booking = replaceOnce(
  booking,
  oldSlotMaps,
  newSlotMaps,
  "hidden manual slot metadata order",
);

if (!booking.includes("const activeBookingSlotIds = [...new Set(")) {
  throw new Error("Mobile single-only slot metadata patch could not be applied.");
}
writeFileSync(bookingPath, booking);

const adminBookingFunctionsPath = "src/lib/booking.functions.ts";
let adminBookingFunctions = readFileSync(adminBookingFunctionsPath, "utf8");
adminBookingFunctions = replaceOnce(
  adminBookingFunctions,
  '.rpc("set_booking_studio_override", {',
  '.rpc("admin_update_booking_studio", {',
  "booking studio RPC name",
);
writeFileSync(adminBookingFunctionsPath, adminBookingFunctions);

console.log("Mobile booking metadata and studio RPC fixed without changing calendar layout.");
