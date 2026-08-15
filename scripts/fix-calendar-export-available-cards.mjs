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

const loopStart = '    for (const slot of monthSlots) {';
const loopEndMarker = '    }\n  }\n\n  ctx.textAlign = "center";';
const loopStartIndex = source.indexOf(loopStart);
const loopEndIndex = source.indexOf(loopEndMarker, loopStartIndex);

if (loopStartIndex >= 0 && loopEndIndex >= 0) {
  const replacement = `    const dayGroups = new Map<string, SlotRow[]>();
    for (const slot of monthSlots) {
      const dayKey = dateParts(slot.starts_at).dayKey;
      dayGroups.set(dayKey, [...(dayGroups.get(dayKey) ?? []), slot]);
    }

    for (const [dayKey, daySlots] of [...dayGroups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const firstSlot = daySlots[0];
      const cardX = outer + 28;
      const cardWidth = width - cardX * 2;
      ctx.fillStyle = COLORS.card;
      ctx.fillRect(cardX, y, cardWidth, appointmentRowHeight - 18);
      ctx.strokeStyle = "rgba(216,182,118,0.35)";
      ctx.strokeRect(cardX, y, cardWidth, appointmentRowHeight - 18);

      ctx.textAlign = "left";
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 25px Arial, sans-serif';
      ctx.fillText(dateLabel(firstSlot.starts_at), cardX + 30, y + 38);

      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.fillText(statusByDay.get(dayKey) ?? "VERFÜGBAR", cardX + 30, y + 66);

      ctx.fillStyle = COLORS.vanilla;
      ctx.font = '23px Georgia, "Times New Roman", serif';
      daySlots
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .forEach((slot, index) => {
          const availabilityType = slot.is_duo ? "Duo verfügbar" : "Nur Einzel verfügbar";
          ctx.fillText(
            \`\${timeLabel(slot.starts_at)} – \${timeLabel(slot.ends_at)} Uhr — \${availabilityType}\`,
            cardX + 30,
            y + 102 + index * 30,
          );
        });

      const details = studioDetails(firstSlot.location);
      ctx.textAlign = "right";
      ctx.fillStyle = COLORS.vanilla;
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText(details.studio, cardX + cardWidth - 30, y + 38);
      y += appointmentRowHeight;
    }
  }

  ctx.textAlign = "center";`;
  source = source.slice(0, loopStartIndex) + replacement + source.slice(loopEndIndex + loopEndMarker.length);
}

if (!source.includes("statusByDay")) {
  throw new Error("Export day-status patch could not be applied");
}
if (!source.includes('availabilityType = slot.is_duo ? "Duo verfügbar" : "Nur Einzel verfügbar"')) {
  throw new Error("Export grouped availability labels could not be applied");
}
if (!source.includes("new Set(monthSlots.map")) {
  throw new Error("Export grouped day height patch could not be applied");
}

fs.writeFileSync(path, source);
