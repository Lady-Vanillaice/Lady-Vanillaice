import fs from "node:fs";

const path = "src/lib/public-booking.functions.ts";
let source = fs.readFileSync(path, "utf8");

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

if (!source.includes("sameDayOpenSlotIds.flatMap")) {
  throw new Error("Day-wide free-window patch could not be applied");
}

fs.writeFileSync(path, source);
