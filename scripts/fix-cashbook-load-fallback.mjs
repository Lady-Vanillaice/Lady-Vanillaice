import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/cashbook.functions.ts";
let text = readFileSync(path, "utf8");

if (text.includes("cashbookBookingFallback")) {
  console.log("Cashbook booking fallback already active.");
  process.exit(0);
}

const before = `    const [manualRes, bookingRes] = await Promise.all([\n      db.from("cash_book_entries").select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at"),\n      db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, deposit_guarantor, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]),\n    ]);\n    if (manualRes.error) throw new Error(manualRes.error.message);\n    if (bookingRes.error) throw new Error(bookingRes.error.message);`;

const after = `    const manualRes = await db.from("cash_book_entries")\n      .select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at");\n    if (manualRes.error) throw new Error(manualRes.error.message);\n\n    const cashbookBookingFallback = async () => {\n      const full = await db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, deposit_guarantor, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]);\n      if (!full.error) return full;\n\n      // Production can temporarily lag behind newer optional booking/slot columns.\n      // Retry with the long-standing accounting fields instead of failing the whole Kassenbuch.\n      const accounting = await db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, availability_slots(starts_at, ends_at, location)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]);\n      if (!accounting.error) return accounting;\n\n      // Last-resort compatibility with the original booking schema. Values that do\n      // not exist there are handled as zero/null by the mapper below.\n      const legacy = await db.from("bookings")\n        .select("id, guest_name, duration, status, admin_note, created_at, availability_slots(starts_at, ends_at, location)")\n        .in("status", ["confirmed", "cancelled"]);\n      return legacy;\n    };\n\n    const bookingRes = await cashbookBookingFallback();\n    if (bookingRes.error) throw new Error(bookingRes.error.message);`;

if (!text.includes(before)) {
  throw new Error("Cashbook load fallback could not find the booking query block.");
}

text = text.replace(before, after);
writeFileSync(path, text);
console.log("Cashbook now retries with legacy-safe booking queries instead of failing completely.");
