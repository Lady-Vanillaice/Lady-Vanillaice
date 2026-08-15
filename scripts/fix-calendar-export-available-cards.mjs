import fs from "node:fs";

const path = "src/lib/download-image.client/calendar-image-export.ts";
let source = fs.readFileSync(path, "utf8");

const returnAnchor = "  return { slots, availabilityByDay };";
const returnReplacement = `  const displaySlots: SlotRow[] = [];
  const statusByDay = new Map<string, string>();

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

    let totalFreeMinutes = 0;

    for (const slot of daySlots) {
      const slotStart = new Date(slot.starts_at).getTime();
      const slotEnd = new Date(slot.ends_at).getTime();
      let cursor = slotStart;

      for (const block of busy) {
        if (block.end <= cursor || block.start >= slotEnd) continue;
        if (block.start > cursor) {
          const freeEnd = Math.min(block.start, slotEnd);
          if (freeEnd - cursor >= 30 * 60_000) {
            totalFreeMinutes += Math.round((freeEnd - cursor) / 60_000);
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
        totalFreeMinutes += Math.round((slotEnd - cursor) / 60_000);
        displaySlots.push({
          ...slot,
          id: slot.id + "-export-free-" + displaySlots.length,
          starts_at: new Date(cursor).toISOString(),
          ends_at: slot.ends_at,
        });
      }
    }

    const dayFreeSlots = displaySlots.filter((slot) => dateParts(slot.starts_at).dayKey === dayKey);
    const status = dayFreeSlots.length === 0
      ? "BELEGT"
      : busy.length === 0
      ? "VERFÜGBAR"
      : totalFreeMinutes <= 180
      ? "FAST AUSGEBUCHT"
      : "TEILWEISE VERFÜGBAR";
    statusByDay.set(dayKey, status);
  }

  return { slots: displaySlots, availabilityByDay, statusByDay };`;

if (source.includes(returnAnchor)) {
  source = source.replace(returnAnchor, returnReplacement);
}

source = source.replace(
  "  const { slots, availabilityByDay } = await loadData(mode);",
  "  const { slots, availabilityByDay, statusByDay } = await loadData(mode);",
);
source = source.replace("  const appointmentRowHeight = 150;", "  const appointmentRowHeight = 190;");
source = source.replace(
  "    (total, [, monthSlots]) => total + monthHeaderHeight + monthSlots.length * appointmentRowHeight,",
  "    (total, [, monthSlots]) => total + monthHeaderHeight + new Set(monthSlots.map((slot) => dateParts(slot.starts_at).dayKey)).size * appointmentRowHeight,",
);

source = source.replace(
  "    for (const slot of monthSlots) {",
  `    for (const slot of monthSlots.filter((candidate, index, all) =>
      all.findIndex((entry) => dateParts(entry.starts_at).dayKey === dateParts(candidate.starts_at).dayKey) === index
    )) {
      const dayKey = dateParts(slot.starts_at).dayKey;
      const daySlots = monthSlots
        .filter((entry) => dateParts(entry.starts_at).dayKey === dayKey)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());`,
);

source = source.replace(
  `      ctx.fillStyle = COLORS.vanilla;
      ctx.font = '34px Georgia, "Times New Roman", serif';
      ctx.fillText(\`\${timeLabel(slot.starts_at)} – \${timeLabel(slot.ends_at)} Uhr\`, cardX + 30, y + 88);`,
  `      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.fillText(statusByDay.get(dayKey) ?? "VERFÜGBAR", cardX + 30, y + 68);

      ctx.fillStyle = COLORS.vanilla;
      ctx.font = '23px Georgia, "Times New Roman", serif';
      const isDuoDay = daySlots.some((entry) => entry.is_duo);
      daySlots.forEach((openSlot, index) => {
        const suffix = isDuoDay
          ? " — " + (openSlot.is_duo ? "Duo verfügbar" : "Nur Einzel verfügbar")
          : "";
        const line = timeLabel(openSlot.starts_at) + " – " + timeLabel(openSlot.ends_at) + " Uhr" + suffix;
        ctx.fillText(line, cardX + 30, y + 104 + index * 30);
      });`,
);

const oldTag = `      const tag = [
        slot.is_duo ? \`DUO\${slot.duo_partner ? \` · \${slot.duo_partner}\` : ""}\` : "",
        slot.is_content_shoot ? "CONTENT" : "",
      ].filter(Boolean).join(" · ");`;
const oldPatchedTag = `      const tag = slot.is_duo ? "DUO VERFÜGBAR" : "NUR EINZEL VERFÜGBAR";`;
source = source.replace(oldTag, "      const tag = \"\";");
source = source.replace(oldPatchedTag, "      const tag = \"\";");

if (!source.includes("statusByDay")) {
  throw new Error("Export day-status patch could not be applied");
}
if (!source.includes("const isDuoDay = daySlots.some")) {
  throw new Error("Export duo-day label condition could not be applied");
}
if (!source.includes("new Set(monthSlots.map")) {
  throw new Error("Export grouped day height patch could not be applied");
}

fs.writeFileSync(path, source);
