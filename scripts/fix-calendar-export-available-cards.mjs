import fs from "node:fs";

const path = "src/lib/download-image.client/calendar-image-export.ts";
let source = fs.readFileSync(path, "utf8");

const returnAnchors = [
  "  return { slots, availabilityByDay };",
  "  return { slots, availabilityByDay, vacations };",
  "  return { slots, availabilityByDay, vacations, specialsByDay };",
];
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

  return { slots: displaySlots, availabilityByDay, statusByDay, vacations, specialsByDay };`;

const returnAnchor = returnAnchors.find((anchor) => source.includes(anchor));
if (returnAnchor) {
  source = source.replace(returnAnchor, returnReplacement);
}

source = source.replace(
  "  const { slots, availabilityByDay } = await loadData(mode);",
  "  const { slots, availabilityByDay, statusByDay } = await loadData(mode);",
);
source = source.replace(
  "  const { slots, availabilityByDay, vacations } = await loadData(mode);",
  "  const { slots, availabilityByDay, statusByDay, vacations, specialsByDay } = await loadData(mode);",
);
source = source.replace(
  "  const { slots, availabilityByDay, vacations, specialsByDay } = await loadData(mode);",
  "  const { slots, availabilityByDay, statusByDay, vacations, specialsByDay } = await loadData(mode);",
);
source = source.replace("  const appointmentRowHeight = 150;", "  const appointmentRowHeight = 190;");
source = source.replace(
  "    (total, [, monthSlots]) => total + monthHeaderHeight + monthSlots.length * appointmentRowHeight,",
  `    (total, [, monthSlots]) => total + monthHeaderHeight + [...new Set(monthSlots.map((slot) => dateParts(slot.starts_at).dayKey))].reduce(
      (dayTotal, dayKey) => dayTotal + appointmentRowHeight + (specialsByDay.has(dayKey) ? 170 : 0),
      0,
    ),`,
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
  `      const cardX = outer + 28;
      const cardWidth = width - cardX * 2;
      ctx.fillStyle = COLORS.card;
      ctx.fillRect(cardX, y, cardWidth, appointmentRowHeight - 18);
      ctx.strokeStyle = "rgba(216,182,118,0.35)";
      ctx.strokeRect(cardX, y, cardWidth, appointmentRowHeight - 18);`,
  `      const cardX = outer + 28;
      const cardWidth = width - cardX * 2;
      const special = specialsByDay.get(dayKey);
      const specialExtraHeight = special ? 170 : 0;
      const cardHeight = appointmentRowHeight + specialExtraHeight - 18;
      ctx.fillStyle = COLORS.card;
      ctx.fillRect(cardX, y, cardWidth, cardHeight);
      ctx.strokeStyle = "rgba(216,182,118,0.35)";
      ctx.strokeRect(cardX, y, cardWidth, cardHeight);`,
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
      daySlots.forEach((openSlot, index) => {
        // Wie im Kalender: Flex (Single oder Duo) → „Single verfügbar – Duo verfügbar“,
        // nur Duo → „Duo verfügbar“, nur Single → kein Zusatz.
        const availability = openSlot.is_duo
          ? (openSlot.duo_partner?.startsWith("OPTIONAL_DUO::") ? "Single verfügbar – Duo verfügbar" : "Duo verfügbar")
          : "";
        const suffix = availability ? " — " + availability : "";
        const line = timeLabel(openSlot.starts_at) + " – " + timeLabel(openSlot.ends_at) + " Uhr" + suffix;
        ctx.fillText(line, cardX + 30, y + 104 + index * 30);
      });

      if (special) {
        const specialY = y + 112 + daySlots.length * 30;
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("SPECIAL · " + special.title, cardX + 30, specialY);

        let textY = specialY + 28;
        const specialCondition = (special as { minHours?: number | null }).minHours
          ? "Mindestens " + Number((special as { minHours?: number | null }).minHours).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " " + ((special as { minHours?: number | null }).minHours === 1 ? "Stunde" : "Stunden") + " Session"
          : "";
        if (specialCondition) {
          ctx.fillStyle = COLORS.gold;
          ctx.font = 'bold 16px Arial, sans-serif';
          ctx.fillText(specialCondition, cardX + 30, textY);
          textY += 26;
        }
        if (special.outfit) {
          ctx.fillStyle = COLORS.gold;
          ctx.font = '16px Arial, sans-serif';
          ctx.fillText("Outfit: " + special.outfit, cardX + 30, textY);
          textY += 26;
        }

        ctx.fillStyle = COLORS.vanilla;
        ctx.font = '16px Arial, sans-serif';
        const lines = wrapCanvasLines(ctx, special.description, cardWidth - 60).slice(0, specialCondition && special.outfit ? 2 : specialCondition || special.outfit ? 3 : 4);
        lines.forEach((line, index) => {
          ctx.fillText(line, cardX + 30, textY + index * 23);
        });
      }`,
);

source = source.replace(
  "      y += appointmentRowHeight;",
  "      y += appointmentRowHeight + specialExtraHeight;",
);

const oldTag = `      const tag = [
        slot.is_duo ? \`DUO\${slot.duo_partner ? \` · \${slot.duo_partner}\` : ""}\` : "",
        slot.is_content_shoot ? "CONTENT" : "",
      ].filter(Boolean).join(" · ");`;
const oldPatchedTag = `      const tag = slot.is_duo ? "DUO VERFÜGBAR" : "NUR EINZEL VERFÜGBAR";`;
// Rechts unten auf der Karte: Extra-Zeit mit Mindestbuchung (z. B. „EXTRA · MIND. 3 STD.“).
const minTag = "      const tag = await exportMinTag(daySlots);";
source = source.replace(oldTag, minTag);
source = source.replace(oldPatchedTag, minTag);
source = source.replace("      const tag = \"\";", minTag);

if (!source.includes("const statusByDay = new Map<string, string>()")) {
  throw new Error("Export day-status patch could not be applied");
}
if (!source.includes("statusByDay, vacations, specialsByDay")) {
  throw new Error("Export day-status/vacation/special return patch could not be applied");
}
if (!source.includes('ctx.fillText("SPECIAL · " + special.title')) {
  throw new Error("Export special text patch could not be applied");
}
if (!source.includes("const availability = openSlot.is_duo")) {
  throw new Error("Export duo-day label condition could not be applied");
}
if (!source.includes("new Set(monthSlots.map")) {
  throw new Error("Export grouped day height patch could not be applied");
}

fs.writeFileSync(path, source);
