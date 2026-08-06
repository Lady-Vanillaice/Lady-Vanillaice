import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target missing: ${label}`);
  return source.replace(before, after);
}

const publicBookingPath = "src/lib/public-booking.functions.ts";
let publicBooking = fs.readFileSync(publicBookingPath, "utf8");

publicBooking = replaceOnce(
  publicBooking,
  `.select("id, starts_at, ends_at, buffer_minutes, status, is_hidden")\n      .in("status", ["open", "held", "booked"])`,
  `.select("id, starts_at, ends_at, buffer_minutes, status, is_hidden, is_duo, duo_partner")\n      .in("status", ["open", "held", "booked"])`,
  "public day slot classification fields",
);

publicBooking = replaceOnce(
  publicBooking,
  `    const bufferBySlotId = new Map(\n      slotsForDay.map((s) => [s.id, s.buffer_minutes ?? 30]),\n    );`,
  `    const bufferBySlotId = new Map(\n      slotsForDay.map((s) => [s.id, s.buffer_minutes ?? 30]),\n    );\n    const slotById = new Map(slotsForDay.map((s) => [s.id, s]));`,
  "public slot metadata map",
);

publicBooking = replaceOnce(
  publicBooking,
  `        kind: b.status === "confirmed" ? "booked" as const : "reserved" as const,\n        buffer_minutes: b.slot_id ? (bufferBySlotId.get(b.slot_id) ?? 30) : 30,`,
  `        kind:\n          b.status === "confirmed"\n            ? (() => {\n                const bookingSlot = b.slot_id ? slotById.get(b.slot_id) : null;\n                return bookingSlot && !bookingSlot.is_duo && bookingSlot.duo_partner\n                  ? "single_only" as const\n                  : "booked" as const;\n              })()\n            : "reserved" as const,\n        buffer_minutes: b.slot_id ? (bufferBySlotId.get(b.slot_id) ?? 30) : 30,`,
  "public single-only kind",
);

fs.writeFileSync(publicBookingPath, publicBooking);

const calendarPath = "src/routes/kalender.tsx";
let calendar = fs.readFileSync(calendarPath, "utf8");

calendar = replaceOnce(
  calendar,
  `  const merged: Array<{ s: number; e: number; kind: "booked" | "reserved" | "unavailable" }> = [];`,
  `  const merged: Array<{ s: number; e: number; kind: "booked" | "reserved" | "unavailable" | "single_only" }> = [];`,
  "timeline single-only type",
);

calendar = replaceOnce(
  calendar,
  `          const isReserved = seg.kind === "reserved";\n          const isUnavailable = seg.kind === "unavailable";`,
  `          const isReserved = seg.kind === "reserved";\n          const isUnavailable = seg.kind === "unavailable";\n          const isSingleOnly = seg.kind === "single_only";`,
  "timeline single-only flag",
);

calendar = replaceOnce(
  calendar,
  `              title={\`${isUnavailable ? tr("Nicht freigegeben","Unavailable") : isReserved ? tr("Reserviert","Reserved") : tr("Belegt","Booked")} \${fmtHm(seg.s)} – \${fmtHm(seg.e)}\`}\n              className={\`absolute top-0 bottom-0 pointer-events-none \${\n                isUnavailable\n                  ? "bg-anthracite/80 border-x border-vanilla/15"\n                  : isReserved\n                  ? "bg-vanilla/35 border-x border-vanilla/45"\n                  : "bg-bordeaux/60 border-x border-bordeaux/70"\n              }\`}`, 
  `              title={\`${isUnavailable ? tr("Nicht freigegeben","Unavailable") : isReserved ? tr("Reserviert","Reserved") : isSingleOnly ? tr("Nur Einzel","Single only") : tr("Belegt","Booked")} \${fmtHm(seg.s)} – \${fmtHm(seg.e)}\`}\n              className={\`absolute top-0 bottom-0 pointer-events-none \${\n                isUnavailable\n                  ? "bg-anthracite/80 border-x border-vanilla/15"\n                  : isReserved\n                  ? "bg-vanilla/35 border-x border-vanilla/45"\n                  : isSingleOnly\n                  ? "bg-cyan-500/60 border-x border-cyan-300/70"\n                  : "bg-bordeaux/60 border-x border-bordeaux/70"\n              }\`}`,
  "timeline single-only color",
);

calendar = replaceOnce(
  calendar,
  `        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>`,
  `        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400" /> {tr("nur Einzel", "single only")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>`,
  "timeline single-only legend",
);

fs.writeFileSync(calendarPath, calendar);
console.log("Public single-only timeline patched.");
