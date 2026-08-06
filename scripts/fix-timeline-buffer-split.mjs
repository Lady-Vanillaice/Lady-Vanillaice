import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target missing: ${label}`);
  return source.replace(before, after);
}

const calendarPath = "src/routes/kalender.tsx";
let calendar = fs.readFileSync(calendarPath, "utf8");

const before = `  // Booking and reservation ranges include their safety buffer. Gaps between
  // explicitly opened windows are neutral and must never be extended or shown
  // as bookings.
  const raw = q.data.busy
    .map((b) => {
      const kind = b.kind ?? "booked";
      const rangeBuffer = (b.buffer_minutes ?? q.data.buffer_minutes) * 60_000;
      return {
        s: Math.max(winStart, new Date(b.start).getTime() - rangeBuffer),
        e: Math.min(winEnd, new Date(b.end).getTime() + rangeBuffer),
        kind,
      };
    })
    .filter((r) => r.e > r.s)
    .sort((a, b) => a.s - b.s);

  const merged: Array<{ s: number; e: number; kind: "booked" | "reserved" | "unavailable" | "single_only" }> = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && r.s <= last.e && last.kind === r.kind) last.e = Math.max(last.e, r.e);
    else merged.push({ ...r });
  }`;

const after = `  // Session and reservation colours include their own buffer. When two
  // buffers overlap, the shared interval is divided exactly in the middle so
  // the timeline stays continuous without one colour covering another.
  const raw = q.data.busy
    .map((b) => {
      const kind = b.kind ?? "booked";
      const rangeBuffer = (b.buffer_minutes ?? q.data.buffer_minutes) * 60_000;
      const coreStart = new Date(b.start).getTime();
      const coreEnd = new Date(b.end).getTime();
      return {
        s: Math.max(winStart, coreStart - rangeBuffer),
        e: Math.min(winEnd, coreEnd + rangeBuffer),
        coreStart,
        coreEnd,
        kind,
      };
    })
    .filter((r) => r.e > r.s)
    .sort((a, b) => a.coreStart - b.coreStart);

  for (let i = 0; i < raw.length - 1; i += 1) {
    const current = raw[i];
    const next = raw[i + 1];
    if (current.e <= next.s) continue;

    const overlapStart = next.s;
    const overlapEnd = current.e;
    const split = overlapStart + (overlapEnd - overlapStart) / 2;
    current.e = Math.max(current.coreEnd, split);
    next.s = Math.min(next.coreStart, split);
  }

  const merged: Array<{ s: number; e: number; kind: "booked" | "reserved" | "unavailable" | "single_only" }> = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && r.s <= last.e && last.kind === r.kind) {
      last.e = Math.max(last.e, r.e);
    } else {
      merged.push({ s: r.s, e: r.e, kind: r.kind });
    }
  }`;

calendar = replaceOnce(calendar, before, after, "split overlapping timeline buffers");
fs.writeFileSync(calendarPath, calendar);
console.log("Overlapping timeline buffers split at their midpoint.");
