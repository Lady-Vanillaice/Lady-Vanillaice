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
  `    await ensureAdmin(context.supabase, context.userId);\n    let resolvedSlotId: string | null | undefined;\n    let confirmAfterReschedule = false;`,
  "track rescheduling status and allow detaching old slot",
);

apply(
  "src/lib/booking.schedule-override.functions.ts",
  `      if (bookingErr) throw new Error(bookingErr.message);\n      if (!booking) throw new Error("Buchung nicht gefunden.");`,
  `      if (bookingErr) throw new Error(bookingErr.message);\n      if (!booking) throw new Error("Buchung nicht gefunden.");\n      confirmAfterReschedule = booking.status === "rescheduling";`,
  "remember rescheduling booking",
);

apply(
  "src/lib/booking.schedule-override.functions.ts",
  `      if (containingSlot && booking.slot_id !== containingSlot.id) {\n        resolvedSlotId = containingSlot.id;\n      }`,
  `      if (containingSlot && booking.slot_id !== containingSlot.id) {\n        resolvedSlotId = containingSlot.id;\n      } else if (!containingSlot && currentSlot) {\n        const currentStart = new Date(currentSlot.starts_at).getTime();\n        const currentEnd = new Date(currentSlot.ends_at).getTime();\n        const stillInsideCurrent = requestedStart.getTime() >= currentStart && requestedEnd.getTime() <= currentEnd;\n        if (!stillInsideCurrent) resolvedSlotId = null;\n      }`,
  "detach booking from old slot when moved to another day/time",
);

apply(
  "src/lib/booking.schedule-override.functions.ts",
  `      .update({\n        requested_start: data.requested_start,\n        duration_minutes: data.duration_minutes,\n        ...(resolvedSlotId ? { slot_id: resolvedSlotId } : {}),\n      })`,
  `      .update({\n        requested_start: data.requested_start,\n        duration_minutes: data.duration_minutes,\n        ...(resolvedSlotId !== undefined ? { slot_id: resolvedSlotId } : {}),\n        ...(confirmAfterReschedule ? { status: "confirmed" } : {}),\n      })`,
  "persist new schedule and confirm after rescheduling",
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

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `                  onClick={() => statusMut.mutate({ status: "rescheduling" })}`,
  `                  onClick={() => {\n                    statusMut.mutate({ status: "rescheduling" });\n                    setActiveTab("schedule");\n                  }}`,
  "open Termin & Zahlung immediately when Umplanen is clicked",
);

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `                    {format(new Date(slot.starts_at), "EEEE, dd.MM.yyyy", {`,
  `                    {format(new Date(booking.requested_start ?? slot.starts_at), "EEEE, dd.MM.yyyy", {`,
  "show overridden booking date instead of old slot date",
);

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `{scheduleMut.isPending ? "Speichere…" : "Termin speichern"}`,
  `{scheduleMut.isPending ? "Speichere…" : booking.status === "rescheduling" ? "Neuen Termin speichern" : "Termin speichern"}`,
  "make rescheduling save action explicit",
);

console.log("Existing bookings can now be moved reliably: Umplanen opens the schedule editor, the old slot is detached when necessary, the new date is displayed, and the existing booking returns to confirmed after saving.");
