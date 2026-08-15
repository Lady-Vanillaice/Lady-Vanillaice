import fs from "node:fs";

const path = "src/lib/download-image.client/calendar-image-export.ts";
let source = fs.readFileSync(path, "utf8");

const returnAnchor = "  return { slots, availabilityByDay };";
const returnReplacement = `  const displaySlots: SlotRow[] = [];
  for (const [dayKey, availability] of availabilityByDay.entries()) {
    const daySlots = slots.filter((slot) => dateParts(slot.starts_at).dayKey === dayKey);
    if (!daySlots.length) continue;

    const busy = mergeBusy((availability.busy ?? []).flatMap((range) => {
      const rawStart = new Date(range.start).getTime();
      const rawEnd = new Date(range.end).getTime();
      const buffer = (range.buffer_minutes ?? availability.buffer_minutes ?? 30) * 60_000;
      return [{
        start: rawStart - buffer,
        end: rawEnd + buffer,
        kind: (range.kind ?? "booked") as BusyRange["kind"],
      }];
    }));

    for (const slot of daySlots) {
      const slotStart = new Date(slot.starts_at).getTime();
      const slotEnd = new Date(slot.ends_at).getTime();
      let cursor = slotStart;

      for (const block of busy) {
        if (block.end <= cursor || block.start >= slotEnd) continue;
        if (block.start > cursor) {
          const freeEnd = Math.min(block.start, slotEnd);
          if (freeEnd - cursor >= 30 * 60_000) {
            displaySlots.push({
              ...slot,
              id: slot.id + "-export-free-" + displaySlots.length,
              starts_at: new Date(cursor).toISOString(),
              ends_at: new Date(freeEnd).toISOString(),
            });
          }
        }
        cursor = Math.max(cursor, block.end);
        if (cursor >= slotEnd) break;
      }

      if (cursor < slotEnd && slotEnd - cursor >= 30 * 60_000) {
        displaySlots.push({
          ...slot,
          id: slot.id + "-export-free-" + displaySlots.length,
          starts_at: new Date(cursor).toISOString(),
          ends_at: slot.ends_at,
        });
      }
    }
  }

  return { slots: displaySlots, availabilityByDay };`;

if (source.includes(returnAnchor)) {
  source = source.replace(returnAnchor, returnReplacement);
}

const oldTag = `      const tag = [
        slot.is_duo ? \`DUO\${slot.duo_partner ? \` · \${slot.duo_partner}\` : ""}\` : "",
        slot.is_content_shoot ? "CONTENT" : "",
      ].filter(Boolean).join(" · ");`;
const newTag = `      const tag = slot.is_duo ? "DUO VERFÜGBAR" : "NUR EINZEL VERFÜGBAR";`;
if (source.includes(oldTag)) {
  source = source.replace(oldTag, newTag);
}

if (!source.includes("slots: displaySlots")) {
  throw new Error("Export free-slot patch could not be applied");
}
if (!source.includes('slot.is_duo ? "DUO VERFÜGBAR" : "NUR EINZEL VERFÜGBAR"')) {
  throw new Error("Export availability label patch could not be applied");
}

fs.writeFileSync(path, source);
