import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target missing: ${label}`);
  return source.replace(before, after);
}

const bookingPath = "src/lib/public-booking.functions.ts";
let booking = readFileSync(bookingPath, "utf8");

const metadataMarker = "const activeBookingSlotIds = [...new Set(";
if (!booking.includes(metadataMarker)) {
  booking = replaceOnce(
    booking,
    `    const bufferBySlotId = new Map(\n      slotsForDay.map((s) => [s.id, s.buffer_minutes ?? 30]),\n    );`,
    `    // The mobile/day-wide query can return bookings whose hidden manual slot\n    // is not part of the visible day-slot list. Load those slot markers as well\n    // so \"single on duo day\" remains orange on every viewport.\n    const activeBookingSlotIds = [...new Set(\n      activeBookings.flatMap((booking) => booking.slot_id ? [booking.slot_id] : []),\n    )];\n    if (activeBookingSlotIds.length) {\n      const { data: activeBookingSlots, error: activeBookingSlotsError } = await supabaseAdmin\n        .from(\"availability_slots\")\n        .select(\"id, is_duo, duo_partner, buffer_minutes\")\n        .in(\"id\", activeBookingSlotIds);\n      if (activeBookingSlotsError) throw activeBookingSlotsError;\n      for (const activeSlot of activeBookingSlots ?? []) {\n        slotById.set(activeSlot.id, activeSlot);\n      }\n    }\n\n    const bufferBySlotId = new Map(\n      slotsForDay.map((s) => [s.id, s.buffer_minutes ?? 30]),\n    );\n    for (const [slotId, activeSlot] of slotById) {\n      if (!bufferBySlotId.has(slotId) && activeSlot.buffer_minutes != null) {\n        bufferBySlotId.set(slotId, activeSlot.buffer_minutes);\n      }\n    }`,
    "load hidden manual slot metadata",
  );
}

if (!booking.includes(metadataMarker)) {
  throw new Error("Mobile single-only slot metadata patch could not be applied.");
}
writeFileSync(bookingPath, booking);

const calendarPath = "src/routes/kalender.tsx";
let calendar = readFileSync(calendarPath, "utf8");
calendar = calendar.replace(
  'className="bg-card border border-champagne/15 p-6 min-h-[300px] public-booking-card"',
  'className="bg-card border border-champagne/15 p-6 min-h-[300px] public-booking-card order-first lg:order-none"',
);

if (!calendar.includes("public-booking-card order-first lg:order-none")) {
  throw new Error("Mobile booking-first order could not be applied.");
}
writeFileSync(calendarPath, calendar);

console.log("Mobile single-only colour and booking/info order patched.");
