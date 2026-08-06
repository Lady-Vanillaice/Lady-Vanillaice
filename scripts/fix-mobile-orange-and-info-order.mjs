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

const calendarPath = "src/routes/kalender.tsx";
let calendar = readFileSync(calendarPath, "utf8");
calendar = calendar.replace(
  'className="lg:col-span-5 public-booking-stack"',
  'className="lg:col-span-5 public-booking-stack flex flex-col"',
);
calendar = calendar.replace(
  'className="bg-card border border-champagne/15 p-6 min-h-[300px] public-booking-card"',
  'className="bg-card border border-champagne/15 p-6 min-h-[300px] public-booking-card order-first lg:order-none"',
);

if (!calendar.includes("public-booking-stack flex flex-col")) {
  throw new Error("Mobile booking stack layout could not be applied.");
}
if (!calendar.includes("public-booking-card order-first lg:order-none")) {
  throw new Error("Mobile booking-first order could not be applied.");
}
writeFileSync(calendarPath, calendar);

const stylesPath = "src/styles.css";
let styles = readFileSync(stylesPath, "utf8");
const styleMarker = "/* Force booking before calendar information boxes on mobile. */";
if (!styles.includes(styleMarker)) {
  styles += `\n\n${styleMarker}\n@media (max-width: 1023px) {\n  .public-booking-stack {\n    display: flex !important;\n    flex-direction: column !important;\n  }\n\n  .public-booking-card {\n    order: -1 !important;\n  }\n}\n`;
}
writeFileSync(stylesPath, styles);

console.log("Mobile orange classification and booking/info order fixed.");
