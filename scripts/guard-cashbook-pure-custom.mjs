import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/cashbook.functions.ts";
let text = readFileSync(path, "utf8");

const bookingMarker = '      const status: CashBookEntry["status"] = b.status === "cancelled" ? "cancelled" : b.status === "rescheduling" ? "rescheduling" : b.fully_paid || b.completed_at ? "completed" : "open";';
const declaration = '      const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");';

const bookingStart = text.indexOf('    const bookings: CashBookEntry[] = (bookingRes.data ?? []).map((b: any) => {');
const bookingEnd = bookingStart >= 0 ? text.indexOf('    return [...manual, ...bookings]', bookingStart) : -1;
const bookingBlock = bookingStart >= 0 && bookingEnd > bookingStart ? text.slice(bookingStart, bookingEnd) : "";

if (!bookingBlock) throw new Error("Could not locate cashbook booking mapper.");

if (bookingBlock.includes("isPureCustomContent") && !bookingBlock.includes(declaration)) {
  if (!text.includes(bookingMarker)) throw new Error("Could not locate cashbook status marker for runtime guard.");
  text = text.replace(bookingMarker, `${bookingMarker}\n${declaration}`);
  writeFileSync(path, text);
  console.log("Defined isPureCustomContent in the cashbook booking mapper.");
} else {
  console.log("Cashbook pure-custom runtime guard already satisfied.");
}
