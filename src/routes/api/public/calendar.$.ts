import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function fmt(dt: Date) {
  return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function fold(line: string) {
  // RFC5545: lines > 75 octets folded with CRLF + space
  const out: string[] = [];
  let s = line;
  while (s.length > 73) {
    out.push(s.slice(0, 73));
    s = s.slice(73);
  }
  out.push(s);
  return out.join("\r\n ");
}

export const Route = createFileRoute("/api/public/calendar/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const expected = process.env.CALENDAR_FEED_TOKEN;
        if (!expected) return new Response("Not configured", { status: 500 });
        const rawToken =
          (params as Record<string, string>)._splat ??
          (params as Record<string, string>).splat ??
          (params as Record<string, string>).token ??
          "";
        const token = rawToken.endsWith(".ics") ? rawToken.slice(0, -4) : rawToken;
        if (!safeEq(token, expected)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Confirmed bookings with slot info
        const { data: bookings, error } = await supabaseAdmin
          .from("bookings")
          .select(
            "id, guest_name, guest_email, duration, message, admin_note, confirmation_note, requested_start, duration_minutes, created_at, updated_at, slot_id, availability_slots(starts_at, ends_at, location, is_duo, is_content_shoot, duo_partner)"
          )
          .eq("status", "confirmed")
          .order("requested_start", { ascending: true });

        if (error) {
          console.error("[calendar-feed] bookings error", error);
          return new Response("Error", { status: 500 });
        }

        const lines: string[] = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Lady Vanillaice//Bookings//DE",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "X-WR-CALNAME:Lady Vanillaice — Buchungen",
          "X-WR-TIMEZONE:Europe/Berlin",
        ];

        for (const b of bookings ?? []) {
          const slot = Array.isArray(b.availability_slots) ? b.availability_slots[0] : b.availability_slots;
          const start = b.requested_start ?? slot?.starts_at;
          if (!start) continue;
          const startDate = new Date(start);
          const endDate = b.duration_minutes
            ? new Date(startDate.getTime() + b.duration_minutes * 60_000)
            : slot?.ends_at
            ? new Date(slot.ends_at)
            : new Date(startDate.getTime() + 60 * 60_000);

          const location = slot?.location ?? "";
          const tags: string[] = [];
          if (slot?.is_duo) tags.push(`Duo${slot.duo_partner ? ` mit ${slot.duo_partner}` : ""}`);
          if (slot?.is_content_shoot) tags.push("Content");

          const title = `${b.guest_name ?? "Buchung"}${tags.length ? ` · ${tags.join(" · ")}` : ""}`;
          const descParts: string[] = [];
          if (b.guest_email) descParts.push(`E-Mail: ${b.guest_email}`);
          if (b.duration) descParts.push(`Dauer: ${b.duration}`);
          if (b.message) descParts.push(`SESSION-ÜBERSICHT:\n${b.message}`);
          if (b.admin_note) descParts.push(`Notiz: ${b.admin_note}`);
          if (b.confirmation_note) descParts.push(`Bestätigung: ${b.confirmation_note}`);

          lines.push("BEGIN:VEVENT");
          lines.push(fold(`UID:booking-${b.id}@lady-vanillaice.com`));
          lines.push(`DTSTAMP:${fmt(new Date(b.updated_at ?? b.created_at ?? Date.now()))}`);
          lines.push(`DTSTART:${fmt(startDate)}`);
          lines.push(`DTEND:${fmt(endDate)}`);
          lines.push(fold(`SUMMARY:${esc(title)}`));
          if (location) lines.push(fold(`LOCATION:${esc(location)}`));
          if (descParts.length) lines.push(fold(`DESCRIPTION:${esc(descParts.join("\n"))}`));
          lines.push("STATUS:CONFIRMED");
          lines.push("TRANSP:OPAQUE");
          lines.push("END:VEVENT");
        }

        lines.push("END:VCALENDAR");
        const body = lines.join("\r\n") + "\r\n";

        return new Response(body, {
          status: 200,
          headers: {
            "content-type": "text/calendar; charset=utf-8",
            "cache-control": "private, max-age=300",
          },
        });
      },
    },
  },
});
