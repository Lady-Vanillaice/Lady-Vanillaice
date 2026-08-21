import fs from "node:fs";

const bookingPath = "src/lib/public-booking.functions.ts";
let source = fs.readFileSync(bookingPath, "utf8");

// Load appointments by their real requested time, not only by currently-open
// availability slot ids. This includes bookings whose original slot is hidden,
// held, booked, moved or otherwise no longer part of the open-slot list.
// IMPORTANT: this repository has more than one `.in("slot_id", slotIds)` query.
// Patch the LAST occurrence only — that is the listUpcomingSlots range query.
// Patching the first occurrence would hit proposeBookingTime, where rangeStart/
// rangeEnd do not exist and would crash the public booking flow at runtime.
const slotQueryNeedle =
  '      .in("slot_id", slotIds)\n      .in("status", ["pending", "waiting_deposit", "confirmed"])';
const rangeQueryReplacement =
  '      .gte("requested_start", rangeStart.toISOString())\n      .lt("requested_start", rangeEnd.toISOString())\n      .in("status", ["pending", "waiting_deposit", "confirmed"])';
const slotQueryIndex = source.lastIndexOf(slotQueryNeedle);
if (slotQueryIndex >= 0) {
  source =
    source.slice(0, slotQueryIndex) +
    rangeQueryReplacement +
    source.slice(slotQueryIndex + slotQueryNeedle.length);
}

// Defensive fallback for the public proposal flow: older/stale deployment
// artifacts may still contain a query that references rangeStart/rangeEnd.
// Alias those names to the proposal day's real Berlin bounds so the action
// cannot crash with "rangeStart is not defined" even if an old patch survives.
const proposalBoundsNeedle =
  '    const { dayStart, dayEnd } = getBerlinCalendarDayBounds(slot.starts_at);';
const proposalBoundsReplacement = `${proposalBoundsNeedle}\n    const rangeStart = dayStart;\n    const rangeEnd = dayEnd;`;
const proposalFnStart = source.indexOf("export const proposeBookingTime");
if (proposalFnStart >= 0) {
  const beforeProposal = source.slice(0, proposalFnStart);
  const proposalAndAfter = source.slice(proposalFnStart);
  if (
    proposalAndAfter.includes(proposalBoundsNeedle) &&
    !proposalAndAfter.includes("const rangeStart = dayStart;")
  ) {
    source = beforeProposal + proposalAndAfter.replace(proposalBoundsNeedle, proposalBoundsReplacement);
  }
}

const oldBusy = '    const busy = bookingsBySlot.get(slot.id) ?? [];';
const newBusy = `    const berlinDayKey = (value: string) => new Intl.DateTimeFormat("sv-SE", {\n      timeZone: "Europe/Berlin",\n      year: "numeric",\n      month: "2-digit",\n      day: "2-digit",\n    }).format(new Date(value));\n    const slotDayKey = berlinDayKey(slot.starts_at);\n    // bookingsBySlot now contains every appointment in the requested date range.\n    // Flatten all source-slot buckets and keep only appointments on this Berlin day.\n    const busy = [...bookingsBySlot.values()]\n      .flat()\n      .filter((range) => berlinDayKey(range.starts_at) === slotDayKey);`;
if (source.includes(oldBusy)) {
  source = source.replace(oldBusy, newBusy);
}

if (!source.includes('gte("requested_start", rangeStart.toISOString())')) {
  throw new Error("Day-wide booking query patch could not be applied");
}
if (!source.includes("const busy = [...bookingsBySlot.values()]")) {
  throw new Error("Day-wide booking lookup patch could not be applied");
}
// Safety check: proposeBookingTime must still use slotIds/daySlots. The
// defensive range aliases are allowed, but its query itself must not be
// rewritten to rangeStart/rangeEnd by this patch.
const proposalStart = source.indexOf("export const proposeBookingTime");
const submitStart = source.indexOf("export const submitBooking", proposalStart);
const proposalSection = proposalStart >= 0 && submitStart > proposalStart
  ? source.slice(proposalStart, submitStart)
  : "";
if (!proposalSection.includes('.in("slot_id", slotIds)')) {
  throw new Error("Booking proposal query was accidentally modified");
}
if (!proposalSection.includes("const rangeStart = dayStart;") || !proposalSection.includes("const rangeEnd = dayEnd;")) {
  throw new Error("Booking proposal defensive range aliases are missing");
}
// fix-duo-single-calendar runs before this script and already creates the real
// free_windows plus the day-level windows array used by the public card.
if (!source.includes("free_windows: freeWindows")) {
  throw new Error("Real free-window calculation from duo patch is missing");
}
if (!source.includes("const freeDayWindows = daySlots.flatMap")) {
  throw new Error("Day free-window aggregation from duo patch is missing");
}
fs.writeFileSync(bookingPath, source);

const calendarPath = "src/routes/kalender.tsx";
let calendar = fs.readFileSync(calendarPath, "utf8");
const rawWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}`;
const alwaysLabeledWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}{" — "}{window.is_duo ? tr("Duo verfügbar", "Duo available") : tr("Nur Einzel verfügbar", "Single only available")}`;
const duoOnlyWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}{slot.is_duo ? <> {"— "}{window.is_duo ? tr("Duo verfügbar", "Duo available") : tr("Nur Einzel verfügbar", "Single only available")}</> : null}`;

if (calendar.includes(alwaysLabeledWindowLine)) {
  calendar = calendar.replace(alwaysLabeledWindowLine, duoOnlyWindowLine);
} else if (calendar.includes(rawWindowLine)) {
  calendar = calendar.replace(rawWindowLine, duoOnlyWindowLine);
}

if (!calendar.includes("slot.is_duo ? <>")) {
  throw new Error("Duo-only public free-window label patch could not be applied");
}
fs.writeFileSync(calendarPath, calendar);
