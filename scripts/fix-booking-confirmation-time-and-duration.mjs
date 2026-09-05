import { readFileSync, writeFileSync } from "node:fs";

function replaceAllIfPresent(path, before, after) {
  let text = readFileSync(path, "utf8");
  if (!text.includes(before)) return false;
  text = text.split(before).join(after);
  writeFileSync(path, text);
  return true;
}

// Public booking confirmation: server runs in UTC, but all customer-facing
// appointment times are Munich/Berlin wall time. Without an explicit timezone,
// e.g. a 15:00 CEST booking was rendered as 13:00 in the email.
replaceAllIfPresent(
  "src/lib/public-booking.functions.ts",
  `          timeStyle: "short",\n        })`,
  `          timeStyle: "short",\n          timeZone: "Europe/Berlin",\n        })`,
);

// Admin/final confirmations: always use the booking's actual requested_start.
// updateBookingSchedule writes back to requested_start, so an explicit admin
// change is automatically used. Never silently fall back to the availability
// window start, because that is only the broad bookable window, not necessarily
// the customer's chosen appointment time.
replaceAllIfPresent(
  "src/lib/booking.functions.ts",
  `const startIso = (booking as { requested_start?: string | null }).requested_start ?? slot?.starts_at ?? null;`,
  `const startIso = (booking as { requested_start?: string | null }).requested_start ?? null;`,
);

// Make duration_minutes the source of truth for customer-facing messages.
// It is the exact customer choice and is also the field changed by the admin
// schedule editor. Keep the legacy duration text only as a fallback.
replaceAllIfPresent(
  "src/lib/booking.functions.ts",
  `duration: booking.duration ?? undefined,`,
  `duration: booking.duration_minutes ? \`\${booking.duration_minutes} Minuten\` : booking.duration ?? undefined,`,
);

// Ensure all email-producing booking queries that previously selected the
// legacy duration also load duration_minutes for the rule above.
replaceAllIfPresent(
  "src/lib/booking.functions.ts",
  `guest_name, guest_email, duration, slot_id, requested_start`,
  `guest_name, guest_email, duration, duration_minutes, slot_id, requested_start`,
);
replaceAllIfPresent(
  "src/lib/booking.functions.ts",
  `guest_name, guest_email, duration, requested_start`,
  `guest_name, guest_email, duration, duration_minutes, requested_start`,
);

console.log("Booking confirmations now preserve Munich time and the actual booking duration.");
