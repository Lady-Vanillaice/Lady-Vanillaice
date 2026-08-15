import fs from "node:fs";

const bookingPath = "src/lib/public-booking.functions.ts";
let source = fs.readFileSync(bookingPath, "utf8");

const oldBusy = '    const busy = bookingsBySlot.get(slot.id) ?? [];';
const newBusy = `    // A calendar day may consist of several open slot rows. A booking attached
    // to any one of those rows blocks that real time for the whole displayed day.
    // Otherwise the public card can falsely show a large free range from a sibling slot.
    const berlinDayKey = (value: string) => new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
    const slotDayKey = berlinDayKey(slot.starts_at);
    const sameDayOpenSlotIds = slots
      .filter((candidate) => berlinDayKey(candidate.starts_at) === slotDayKey)
      .map((candidate) => candidate.id);
    const busy = sameDayOpenSlotIds.flatMap((slotId) => bookingsBySlot.get(slotId) ?? []);`;

if (source.includes(oldBusy)) {
  source = source.replace(oldBusy, newBusy);
}

const oldFreeCheck = `    let hasFree = false;\n    for (let t = winStart; t + MIN_DURATION_MS <= winEnd; t += STEP_MS) {\n      if (t < nowMs) continue;\n      const reqEnd = t + MIN_DURATION_MS;\n      const conflict = busyRanges.some((b) => t < b.e && reqEnd > b.s);\n      if (!conflict) {\n        hasFree = true;\n        break;\n      }\n    }\n\n    return { ...slot, is_fully_booked: !hasFree, has_booking: hasBooking, is_reserved: false, reserved_until: null as string | null };`;

const newFreeCheck = `    // Derive the actual remaining gaps. These are the only times shown in the\n    // public \"Teilweise verfügbar\" list.\n    const mergedBusy: Array<{ s: number; e: number }> = [];\n    for (const range of [...busyRanges].sort((a, b) => a.s - b.s)) {\n      const s = Math.max(range.s, winStart);\n      const e = Math.min(range.e, winEnd);\n      if (e <= s) continue;\n      const previous = mergedBusy[mergedBusy.length - 1];\n      if (previous && s <= previous.e) previous.e = Math.max(previous.e, e);\n      else mergedBusy.push({ s, e });\n    }\n\n    const free_windows: Array<typeof slot & { is_fully_booked: boolean }> = [];\n    let cursor = Math.ceil(Math.max(winStart, nowMs) / STEP_MS) * STEP_MS;\n    const addFreeWindow = (start: number, end: number) => {\n      if (end - start < STEP_MS) return;\n      free_windows.push({\n        ...slot,\n        id: slot.id + \"-free-\" + free_windows.length,\n        starts_at: new Date(start).toISOString(),\n        ends_at: new Date(end).toISOString(),\n        is_fully_booked: end - start < MIN_DURATION_MS,\n      });\n    };\n\n    for (const range of mergedBusy) {\n      if (range.e <= cursor) continue;\n      if (range.s > cursor) addFreeWindow(cursor, Math.min(range.s, winEnd));\n      cursor = Math.max(cursor, range.e);\n      if (cursor >= winEnd) break;\n    }\n    if (cursor < winEnd) addFreeWindow(cursor, winEnd);\n\n    const hasFree = free_windows.some(\n      (window) => new Date(window.ends_at).getTime() - new Date(window.starts_at).getTime() >= MIN_DURATION_MS,\n    );\n\n    return {\n      ...slot,\n      free_windows,\n      is_fully_booked: !hasFree,\n      has_booking: hasBooking,\n      is_reserved: false,\n      reserved_until: null as string | null,\n    };`;

if (!source.includes("free_windows,") && source.includes(oldFreeCheck)) {
  source = source.replace(oldFreeCheck, newFreeCheck);
}

const oldDayWindows = `    const starts = daySlots.map((s) => new Date(s.starts_at).getTime());\n    const ends = daySlots.map((s) => new Date(s.ends_at).getTime());\n    const duoSlot = daySlots.find((s) => s.is_duo);\n    return {\n      ...slot,\n      starts_at: new Date(Math.min(...starts)).toISOString(),\n      ends_at: new Date(Math.max(...ends)).toISOString(),\n      windows: daySlots.map((s) => ({`;

const newDayWindows = `    const freeDayWindows = daySlots.flatMap((s) => s.free_windows ?? []);\n    const visibleWindows = freeDayWindows.length ? freeDayWindows : daySlots;\n    const starts = visibleWindows.map((s) => new Date(s.starts_at).getTime());\n    const ends = visibleWindows.map((s) => new Date(s.ends_at).getTime());\n    const duoSlot = daySlots.find((s) => s.is_duo);\n    return {\n      ...slot,\n      starts_at: new Date(Math.min(...starts)).toISOString(),\n      ends_at: new Date(Math.max(...ends)).toISOString(),\n      windows: freeDayWindows.map((s) => ({`;

if (!source.includes("const freeDayWindows = daySlots.flatMap") && source.includes(oldDayWindows)) {
  source = source.replace(oldDayWindows, newDayWindows);
}

if (!source.includes("sameDayOpenSlotIds.flatMap")) {
  throw new Error("Day-wide booking aggregation patch could not be applied");
}
if (!source.includes("free_windows,")) {
  throw new Error("Real free-window calculation patch could not be applied");
}
if (!source.includes("const freeDayWindows = daySlots.flatMap")) {
  throw new Error("Public day-window aggregation patch could not be applied");
}

fs.writeFileSync(bookingPath, source);

const calendarPath = "src/routes/kalender.tsx";
let calendar = fs.readFileSync(calendarPath, "utf8");
const oldWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}`;
const newWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}{" — "}{window.is_duo ? tr("Duo verfügbar", "Duo available") : tr("Nur Einzel verfügbar", "Single only available")}`;
if (!calendar.includes("window.is_duo ? tr(\"Duo verfügbar\"")) {
  calendar = calendar.replace(oldWindowLine, newWindowLine);
}
if (!calendar.includes("window.is_duo ? tr(\"Duo verfügbar\"")) {
  throw new Error("Public free-window label patch could not be applied");
}
fs.writeFileSync(calendarPath, calendar);
