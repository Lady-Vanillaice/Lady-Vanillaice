import fs from "node:fs";

const path = "src/routes/kalender.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  '<AvailabilityTimeline slotId={slot.id} />',
  '<AvailabilityTimeline slotId={slot.id} duoDay={slot.is_duo} />',
);

s = s.replace(
  'function AvailabilityTimeline({ slotId }: { slotId: string }) {',
  'function AvailabilityTimeline({ slotId, duoDay }: { slotId: string; duoDay: boolean }) {',
);

s = s.replace(
  'isSingleOnly ? tr("Nur Einzel","Single only") : tr("Belegt","Booked")',
  'isSingleOnly ? tr("Nur Einzel belegt","Single only booked") : tr("Belegt","Booked")',
);

s = s.replace(
  '? "bg-orange-500/60 border-x border-orange-700/70"',
  '? "bg-orange-800/80 border-x border-orange-950/80"',
);

s = s.replace(
  'title={`${tr("Frei","Free")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}',
  'title={`${duoDay ? tr("Nur Einzel verfügbar","Single only available") : tr("Frei","Free")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}',
);

s = s.replace(
  'className="absolute top-0 bottom-0 z-10 bg-champagne/50"',
  'className={`absolute top-0 bottom-0 z-10 ${duoDay ? "bg-orange-300/75" : "bg-champagne/50"}`}',
);

const oldLegend = `        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> {tr("nur Einzel", "single only")}</span>`;
const newLegend = `        {duoDay ? (\n          <>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-300" /> {tr("nur Einzel verfügbar", "single only available")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("Duo belegt", "duo booked")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-800" /> {tr("nur Einzel belegt", "single only booked")}</span>\n          </>\n        ) : (\n          <>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-800" /> {tr("nur Einzel belegt", "single only booked")}</span>\n          </>\n        )}`;

s = s.replace(oldLegend, newLegend);

const durationAnchor = `  const windowDurations = windows.map((w) => Math.round((new Date(w.ends_at).getTime() - new Date(w.starts_at).getTime()) / 60_000));\n  const longestWindowMinutes = Math.max(...windowDurations, 30);`;
const durationReplacement = `${durationAnchor}\n  const totalFreeMinutes = windowDurations.reduce((sum, minutes) => sum + minutes, 0);\n  const availabilityLabel = slot.has_booking\n    ? totalFreeMinutes <= 180\n      ? tr("Fast ausgebucht", "Almost fully booked")\n      : tr("Teilweise verfügbar", "Partly available")\n    : tr("Verfügbar", "Available");`;
if (!s.includes("const availabilityLabel = slot.has_booking") && s.includes(durationAnchor)) {
  s = s.replace(durationAnchor, durationReplacement);
}

s = s.replace(
  '<span>{tr("Verfügbar", "Available")}</span>',
  '<span>{availabilityLabel}</span>',
);

fs.writeFileSync(path, s);

const bookingPath = "src/lib/public-booking.functions.ts";
let booking = fs.readFileSync(bookingPath, "utf8");

const freeWindowAnchor = `    let hasFree = false;\n    for (let t = winStart; t + MIN_DURATION_MS <= winEnd; t += STEP_MS) {\n      if (t < nowMs) continue;\n      const reqEnd = t + MIN_DURATION_MS;\n      const conflict = busyRanges.some((b) => t < b.e && reqEnd > b.s);\n      if (!conflict) {\n        hasFree = true;\n        break;\n      }\n    }\n\n    return { ...slot, is_fully_booked: !hasFree, has_booking: hasBooking, is_reserved: false, reserved_until: null as string | null };`;

const freeWindowReplacement = `    // Return the real remaining gaps, not the original released slot bounds.\n    // This keeps the text list aligned with bookings, reservations and buffer time.\n    const mergedBusy: Array<{ s: number; e: number }> = [];\n    for (const range of [...busyRanges].sort((a, b) => a.s - b.s)) {\n      const s = Math.max(range.s, winStart);\n      const e = Math.min(range.e, winEnd);\n      if (e <= s) continue;\n      const last = mergedBusy[mergedBusy.length - 1];\n      if (last && s <= last.e) last.e = Math.max(last.e, e);\n      else mergedBusy.push({ s, e });\n    }\n\n    const freeWindows: Array<typeof slot & { is_fully_booked: boolean }> = [];\n    let cursor = Math.ceil(Math.max(winStart, nowMs) / STEP_MS) * STEP_MS;\n    const addFreeWindow = (start: number, end: number) => {\n      if (end - start < STEP_MS) return;\n      freeWindows.push({\n        ...slot,\n        id: \`\${slot.id}-free-\${freeWindows.length}\`,\n        starts_at: new Date(start).toISOString(),\n        ends_at: new Date(end).toISOString(),\n        is_fully_booked: false,\n      });\n    };\n\n    for (const range of mergedBusy) {\n      if (range.e <= cursor) continue;\n      if (range.s > cursor) addFreeWindow(cursor, Math.min(range.s, winEnd));\n      cursor = Math.max(cursor, range.e);\n      if (cursor >= winEnd) break;\n    }\n    if (cursor < winEnd) addFreeWindow(cursor, winEnd);\n\n    const hasFree = freeWindows.some(\n      (window) => new Date(window.ends_at).getTime() - new Date(window.starts_at).getTime() >= MIN_DURATION_MS,\n    );\n\n    return {\n      ...slot,\n      free_windows: freeWindows,\n      is_fully_booked: !hasFree,\n      has_booking: hasBooking,\n      is_reserved: false,\n      reserved_until: null as string | null,\n    };`;

if (!booking.includes("free_windows: freeWindows") && booking.includes(freeWindowAnchor)) {
  booking = booking.replace(freeWindowAnchor, freeWindowReplacement);
}

const dayWindowAnchor = `    const starts = daySlots.map((s) => new Date(s.starts_at).getTime());\n    const ends = daySlots.map((s) => new Date(s.ends_at).getTime());\n    const duoSlot = daySlots.find((s) => s.is_duo);\n    return {\n      ...slot,\n      starts_at: new Date(Math.min(...starts)).toISOString(),\n      ends_at: new Date(Math.max(...ends)).toISOString(),\n      windows: daySlots.map((s) => ({`;

const dayWindowReplacement = `    const freeDayWindows = daySlots.flatMap((s) => s.free_windows);\n    const visibleWindows = freeDayWindows.length ? freeDayWindows : daySlots;\n    const starts = visibleWindows.map((s) => new Date(s.starts_at).getTime());\n    const ends = visibleWindows.map((s) => new Date(s.ends_at).getTime());\n    const duoSlot = daySlots.find((s) => s.is_duo);\n    return {\n      ...slot,\n      starts_at: new Date(Math.min(...starts)).toISOString(),\n      ends_at: new Date(Math.max(...ends)).toISOString(),\n      windows: freeDayWindows.map((s) => ({`;

if (!booking.includes("const freeDayWindows = daySlots.flatMap") && booking.includes(dayWindowAnchor)) {
  booking = booking.replace(dayWindowAnchor, dayWindowReplacement);
}

fs.writeFileSync(bookingPath, booking);
