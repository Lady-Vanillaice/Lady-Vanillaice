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

calendar = calendar.replace(
  'className="mt-6 border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed"',
  'className="mt-6 border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed public-calendar-info-box"',
);
calendar = calendar.replaceAll(
  'className="mt-4 border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed"',
  'className="mt-4 border border-champagne/40 bg-champagne/5 p-4 text-xs text-vanilla/75 leading-relaxed public-calendar-info-box"',
);

if (!calendar.includes("public-booking-stack flex flex-col")) {
  throw new Error("Mobile booking stack layout could not be applied.");
}
if (!calendar.includes("public-booking-card order-first lg:order-none")) {
  throw new Error("Mobile booking-first order could not be applied.");
}
if ((calendar.match(/public-calendar-info-box/g) ?? []).length < 3) {
  throw new Error("The three mobile calendar information boxes could not be marked.");
}
writeFileSync(calendarPath, calendar);

const stylesPath = "src/styles.css";
let styles = readFileSync(stylesPath, "utf8");
const styleMarker = "/* Force booking before calendar information boxes on mobile. */";
if (!styles.includes(styleMarker)) {
  styles += `\n\n${styleMarker}\n@media (max-width: 1023px) {\n  .public-booking-stack {\n    display: flex !important;\n    flex-direction: column !important;\n  }\n\n  .public-booking-card {\n    order: -1 !important;\n  }\n}\n`;
}

const infoOrderMarker = "/* Keep the three public calendar info boxes after the booking request on mobile. */";
if (!styles.includes(infoOrderMarker)) {
  styles += `\n\n${infoOrderMarker}\n@media (max-width: 1023px) {\n  /* apply-calendar-form-enhancements moves the three boxes into the calendar column.\n     Flatten that column on mobile so the booking column can sit between the calendar\n     card and those information boxes. Desktop keeps the two-column structure. */\n  .public-calendar-layout {\n    display: flex !important;\n    flex-direction: column !important;\n  }\n\n  .public-calendar-layout > .lg\\:col-span-7 {\n    display: contents !important;\n  }\n\n  .public-calendar-layout > .lg\\:col-span-7 > .bg-card {\n    order: 0 !important;\n  }\n\n  .public-calendar-layout > .public-booking-stack {\n    order: 10 !important;\n    display: flex !important;\n    flex-direction: column !important;\n  }\n\n  .public-booking-card {\n    order: 0 !important;\n  }\n\n  .public-calendar-info-box {\n    order: 20 !important;\n  }\n}\n`;
}
writeFileSync(stylesPath, styles);

const adminBookingFunctionsPath = "src/lib/booking.functions.ts";
let adminBookingFunctions = readFileSync(adminBookingFunctionsPath, "utf8");
adminBookingFunctions = replaceOnce(
  adminBookingFunctions,
  '.rpc("set_booking_studio_override", {',
  '.rpc("admin_update_booking_studio", {',
  "booking studio RPC name",
);
writeFileSync(adminBookingFunctionsPath, adminBookingFunctions);

console.log("Mobile orange classification, booking/info order, and studio RPC fixed.");
