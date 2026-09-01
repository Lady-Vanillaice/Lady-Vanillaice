import { readFileSync, writeFileSync } from "node:fs";

const backendPath = "src/lib/cashbook.functions.ts";
let backend = readFileSync(backendPath, "utf8");

if (!backend.includes("cashbookBookingFallback")) {
  const before = `    const [manualRes, bookingRes] = await Promise.all([\n      db.from("cash_book_entries").select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at"),\n      db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, deposit_guarantor, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]),\n    ]);\n    if (manualRes.error) throw new Error(manualRes.error.message);\n    if (bookingRes.error) throw new Error(bookingRes.error.message);`;

  const after = `    const manualRes = await db.from("cash_book_entries")\n      .select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at");\n    if (manualRes.error) throw new Error(manualRes.error.message);\n\n    const cashbookBookingFallback = async () => {\n      const full = await db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, deposit_guarantor, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]);\n      if (!full.error) return full;\n\n      const accounting = await db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, availability_slots(starts_at, ends_at, location)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]);\n      if (!accounting.error) return accounting;\n\n      const legacy = await db.from("bookings")\n        .select("id, guest_name, duration, status, admin_note, created_at, availability_slots(starts_at, ends_at, location)")\n        .in("status", ["confirmed", "cancelled"]);\n      return legacy;\n    };\n\n    const bookingRes = await cashbookBookingFallback();\n    if (bookingRes.error) throw new Error(bookingRes.error.message);`;

  if (!backend.includes(before)) throw new Error("Cashbook load fallback could not find the booking query block.");
  backend = backend.replace(before, after);
  writeFileSync(backendPath, backend);
  console.log("Cashbook now retries with legacy-safe booking queries instead of failing completely.");
} else {
  console.log("Cashbook booking fallback already active.");
}

const uiPath = "src/routes/_authenticated/admin.kassenbuch.tsx";
let ui = readFileSync(uiPath, "utf8");

if (!ui.includes("keepOpenCashbookAcrossMonths")) {
  const beforeFilter = `  const filtered = useMemo(() => data.filter((e) => {\n    if (e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) return false;\n    const matchesMonth = !month || e.termin_datum.startsWith(month) || Boolean(e.anzahlung_datum?.startsWith(month)) || Boolean(e.bar_datum?.startsWith(month));\n    const restMethod = e.source === "booking" && e.booking_id ? restPaymentMethods[e.booking_id] ?? (e.restbetrag_vorgemerkt > 0 ? "Bar" : null) : null;\n    const haystack = \`${'${e.kunde} ${e.studio} ${e.studio_address ?? ""} ${e.art} ${e.dauer ?? ""} ${e.expense_category ?? ""} ${e.payment_method ?? ""} ${e.anzahlung_method ?? ""} ${restMethod ?? ""}'}\`.toLowerCase();\n    const methodsForEntry = e.entry_type === "expense" ? [e.payment_method] : e.source === "booking" ? [e.anzahlung_method, restMethod] : [e.anzahlung_method];\n    return matchesMonth && (!studioFilter || e.studio === studioFilter) && (!methodFilter || methodsForEntry.includes(methodFilter)) && (!statusFilter || e.status === statusFilter) && (!search || haystack.includes(search.toLowerCase()));\n  }).sort((a, b) => {`;

  const afterFilter = `  const keepOpenCashbookAcrossMonths = true;\n  const filtered = useMemo(() => data.filter((e) => {\n    if (e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) return false;\n    const matchesMonth = !month || e.termin_datum.startsWith(month) || Boolean(e.anzahlung_datum?.startsWith(month)) || Boolean(e.bar_datum?.startsWith(month));\n    const isUnfinishedBooking = e.source === "booking" && e.entry_type === "income" && e.status !== "completed";\n    const restMethod = e.source === "booking" && e.booking_id ? restPaymentMethods[e.booking_id] ?? (e.restbetrag_vorgemerkt > 0 ? "Bar" : null) : null;\n    const haystack = \`${'${e.kunde} ${e.studio} ${e.studio_address ?? ""} ${e.art} ${e.dauer ?? ""} ${e.expense_category ?? ""} ${e.payment_method ?? ""} ${e.anzahlung_method ?? ""} ${restMethod ?? ""}'}\`.toLowerCase();\n    const methodsForEntry = e.entry_type === "expense" ? [e.payment_method] : e.source === "booking" ? [e.anzahlung_method, restMethod] : [e.anzahlung_method];\n    return (matchesMonth || isUnfinishedBooking) && (!studioFilter || e.studio === studioFilter) && (!methodFilter || methodsForEntry.includes(methodFilter)) && (!statusFilter || e.status === statusFilter) && (!search || haystack.includes(search.toLowerCase()));\n  }).sort((a, b) => {`;

  if (!ui.includes(beforeFilter)) throw new Error("Could not find the cashbook month-filter block.");
  ui = ui.replace(beforeFilter, afterFilter);
  writeFileSync(uiPath, ui);
  console.log("Unfinished booking entries now stay visible in the cashbook across month boundaries.");
} else {
  console.log("Open cashbook entries already ignore the month boundary.");
}

await import("./stabilize-cashbook.mjs");
