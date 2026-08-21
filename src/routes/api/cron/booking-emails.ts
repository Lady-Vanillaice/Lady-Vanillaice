import { createFileRoute } from "@tanstack/react-router";

const HOUR = 60 * 60 * 1000;
const REVIEW_URL = "https://www.lady-vanillaice.com/erfahrungsberichte";

function formatBerlinDate(value: string) {
  return new Date(value).toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function durationLabel(minutes: number | null, fallback: string | null) {
  if (!minutes) return fallback ?? undefined;
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? `${minutes} Minuten (${hours.toLocaleString("de-DE")} Std.)`
    : `${minutes} Minuten`;
}

function sessionLabel(slot: any) {
  if (slot?.is_duo) {
    const partner = slot?.duo_partner?.trim();
    return `Duo Session${partner ? ` mit ${partner}` : ""}${slot?.is_content_shoot ? " + Content" : ""}`;
  }
  return slot?.is_content_shoot ? "Single Session + Content" : "Single Session";
}

export const Route = createFileRoute("/api/cron/booking-emails")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET?.trim();
        if (secret) {
          const auth = request.headers.get("authorization") ?? "";
          if (auth !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
        }

        const now = Date.now();
        const rangeStart = new Date(now - 4 * 24 * HOUR).toISOString();
        const rangeEnd = new Date(now + 4 * 24 * HOUR).toISOString();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");

        const { data: bookings, error } = await supabaseAdmin
          .from("bookings")
          .select("id, guest_name, guest_email, duration, duration_minutes, requested_start, status, studio_override, studio_address_override, availability_slots(location, location_address, is_duo, is_content_shoot, duo_partner)")
          .eq("status", "confirmed")
          .not("guest_email", "is", null)
          .not("requested_start", "is", null)
          .gte("requested_start", rangeStart)
          .lte("requested_start", rangeEnd)
          .limit(300);

        if (error) {
          console.error("Automatic booking email scan failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        let reminders = 0;
        let followups = 0;
        const failures: string[] = [];

        for (const booking of bookings ?? []) {
          if (!booking.requested_start || !booking.guest_email) continue;
          const slot = (Array.isArray(booking.availability_slots)
            ? booking.availability_slots[0]
            : booking.availability_slots) as any;
          const start = new Date(booking.requested_start).getTime();
          const durationMinutes = Number(booking.duration_minutes ?? 0);
          const end = start + Math.max(durationMinutes, 0) * 60_000;
          const studio = booking.studio_override?.trim() || slot?.location || undefined;
          const studioAddress = booking.studio_address_override?.trim() || slot?.location_address || undefined;
          const common = {
            guestName: booking.guest_name ?? undefined,
            wishDate: formatBerlinDate(booking.requested_start),
            duration: durationLabel(durationMinutes || null, booking.duration ?? null),
            studio,
            studioAddress,
            session: sessionLabel(slot),
          };

          const untilStart = start - now;
          if (untilStart >= 23 * HOUR && untilStart <= 25 * HOUR) {
            const result = await enqueueTransactionalEmail({
              templateName: "booking-reminder",
              recipientEmail: booking.guest_email,
              templateData: common,
              idempotencyKey: `booking-reminder-24h-${booking.id}`,
              metadata: { booking_id: booking.id, automation: "24h-reminder" },
            });
            if (result.success) reminders += 1;
            else failures.push(`reminder:${booking.id}:${result.reason ?? "unknown"}`);
          }

          const sinceEnd = now - end;
          if (sinceEnd >= 23 * HOUR && sinceEnd <= 25 * HOUR) {
            const result = await enqueueTransactionalEmail({
              templateName: "booking-followup",
              recipientEmail: booking.guest_email,
              templateData: {
                guestName: booking.guest_name ?? undefined,
                reviewUrl: REVIEW_URL,
              },
              idempotencyKey: `booking-followup-24h-${booking.id}`,
              metadata: { booking_id: booking.id, automation: "24h-followup" },
            });
            if (result.success) followups += 1;
            else failures.push(`followup:${booking.id}:${result.reason ?? "unknown"}`);
          }
        }

        return Response.json({ ok: failures.length === 0, scanned: bookings?.length ?? 0, reminders, followups, failures });
      },
    },
  },
});
