import fs from "node:fs";

function apply(path, before, after, label) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) {
    console.log(`[reschedule] already applied: ${label}`);
    return;
  }
  if (!source.includes(before)) {
    console.warn(`[reschedule] skipped ${label}: target not found in ${path}`);
    return;
  }
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
  console.log(`[reschedule] applied: ${label}`);
}

apply(
  "src/routes/_authenticated/admin.terminplan.tsx",
  `.eq("status", "confirmed");`,
  `.in("status", ["confirmed", "rescheduling"]);`,
  "keep rescheduling bookings visible in Terminplan",
);

apply(
  "src/lib/booking.schedule-override.functions.ts",
  `    await ensureAdmin(context.supabase, context.userId);\n    let resolvedSlotId: string | undefined;`,
  `    await ensureAdmin(context.supabase, context.userId);\n    let resolvedSlotId: string | undefined;\n    let confirmAfterReschedule = false;`,
  "track rescheduling status",
);

apply(
  "src/lib/booking.schedule-override.functions.ts",
  `      if (bookingErr) throw new Error(bookingErr.message);\n      if (!booking) throw new Error("Buchung nicht gefunden.");`,
  `      if (bookingErr) throw new Error(bookingErr.message);\n      if (!booking) throw new Error("Buchung nicht gefunden.");\n      confirmAfterReschedule = booking.status === "rescheduling";`,
  "remember rescheduling booking",
);

apply(
  "src/lib/booking.schedule-override.functions.ts",
  `      .update({\n        requested_start: data.requested_start,\n        duration_minutes: data.duration_minutes,\n        ...(resolvedSlotId ? { slot_id: resolvedSlotId } : {}),\n      })`,
  `      .update({\n        requested_start: data.requested_start,\n        duration_minutes: data.duration_minutes,\n        ...(resolvedSlotId ? { slot_id: resolvedSlotId } : {}),\n        ...(confirmAfterReschedule ? { status: "confirmed" } : {}),\n      })`,
  "confirm booking after new reschedule date is saved",
);

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      router.invalidate();\n    },\n  });\n  const studioMut`,
  `      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" });\n      router.invalidate();\n    },\n  });\n  const studioMut`,
  "refresh Terminplan after schedule save",
);

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `      qc.invalidateQueries({ queryKey: ["admin-slots"] });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n      router.invalidate();\n    },\n  });\n\n  function confirmBookingWithAmounts()`,
  `      qc.invalidateQueries({ queryKey: ["admin-slots"] });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n      qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" });\n      router.invalidate();\n    },\n  });\n\n  function confirmBookingWithAmounts()`,
  "refresh Terminplan after status changes",
);

console.log("Existing bookings can now stay visible while being rescheduled and return to confirmed after saving the new date.");
