import { readFileSync, writeFileSync } from "node:fs";

const backendPath = "src/lib/cashbook.functions.ts";
let backend = readFileSync(backendPath, "utf8");

if (!backend.includes('const isPureCustomContent = b.duration === "Custom Content"')) {
  backend = backend.replace(
    '      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");',
    '      const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");\n      const hasCustomAddon = Boolean(slot?.is_content_shoot) || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? "") || (b.duration === "Custom Content" && !isPureCustomContent);\n      const art = isPureCustomContent ? "Custom" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");'
  );
}

backend = backend.replace(
  '        kunde: b.guest_name, art, dauer: durationLabel(b.duration_minutes, b.duration),',
  '        kunde: b.guest_name, art, dauer: isPureCustomContent ? "Custom Content" : durationLabel(b.duration_minutes, b.duration),'
);

if (!backend.includes("cashbookBookingFallback")) {
  backend = backend.replace(
`    const [manualRes, bookingRes] = await Promise.all([\n      db.from("cash_book_entries").select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at"),\n      db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, deposit_guarantor, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]),\n    ]);\n    if (manualRes.error) throw new Error(manualRes.error.message);\n    if (bookingRes.error) throw new Error(bookingRes.error.message);`,
`    const manualRes = await db.from("cash_book_entries").select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at");\n    if (manualRes.error) throw new Error(manualRes.error.message);\n\n    const cashbookBookingFallback = async () => {\n      const full = await db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, deposit_guarantor, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]);\n      if (!full.error) return full;\n      const accounting = await db.from("bookings")\n        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, availability_slots(starts_at, ends_at, location)")\n        .in("status", ["confirmed", "cancelled", "rescheduling"]);\n      if (!accounting.error) return accounting;\n      return db.from("bookings")\n        .select("id, guest_name, duration, status, admin_note, created_at, availability_slots(starts_at, ends_at, location)")\n        .in("status", ["confirmed", "cancelled"]);\n    };\n    const bookingRes = await cashbookBookingFallback();\n    if (bookingRes.error) throw new Error(bookingRes.error.message);`
  );
}

writeFileSync(backendPath, backend);

const uiPath = "src/routes/_authenticated/admin.kassenbuch.tsx";
let ui = readFileSync(uiPath, "utf8");
ui = ui.replace(
'    return matchesMonth && (!studioFilter || e.studio === studioFilter) && (!methodFilter || methodsForEntry.includes(methodFilter)) && (!statusFilter || e.status === statusFilter) && (!search || haystack.includes(search.toLowerCase()));',
'    const isUnfinishedBooking = e.source === "booking" && e.entry_type === "income" && e.status !== "completed";\n    return (matchesMonth || isUnfinishedBooking) && (!studioFilter || e.studio === studioFilter) && (!methodFilter || methodsForEntry.includes(methodFilter)) && (!statusFilter || e.status === statusFilter) && (!search || haystack.includes(search.toLowerCase()));'
);
writeFileSync(uiPath, ui);

await import("./fix-custom-content-consistency.mjs");
console.log("Direct cashbook source fix applied.");
