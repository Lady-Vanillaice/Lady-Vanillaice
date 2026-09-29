import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { customerEmailSchema, customerSessionSchema } from "./customer-session.schema";
type HistoryBooking = { id: string; requested_start: string | null; status: string; studio_override: string | null; availability_slots: { starts_at: string; location: string } | Array<{ starts_at: string; location: string }> | null };
async function adminDb(context: { supabase: any; userId: string }) {
  const role = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (role.error || !role.data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
export const getCustomerSessionHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ email: customerEmailSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { readCustomerSessions } = await import("./customer-session.server");
    // Escape LIKE metacharacters so different customers can never match a wildcard.
    const pattern = data.email.replace(/[\\%_]/g, "\\$&");
    const [bookingResult, sessions] = await Promise.all([
      db.from("bookings").select("id, requested_start, status, studio_override, availability_slots(starts_at, location)")
        .ilike("guest_email", pattern).order("requested_start", { ascending: false }).returns<HistoryBooking[]>(),
      readCustomerSessions(db, data.email),
    ]);
    if (bookingResult.error) throw new Error("Die bisherigen Termine konnten nicht geladen werden.");
    const bookings = (bookingResult.data ?? []).map(booking => {
      const slot = Array.isArray(booking.availability_slots) ? booking.availability_slots[0] : booking.availability_slots;
      const start = booking.requested_start || slot?.starts_at;
      return {
        id: booking.id,
        date: start ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(start)) : "",
        time: start ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(start)) : "",
        place: booking.studio_override || slot?.location || "",
        status: booking.status,
      };
    });
    return { bookings, sessions };
  });
export const saveCustomerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ email: customerEmailSchema, entry: customerSessionSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    if (data.entry.bookingId) {
      const booking = await db.from("bookings").select("guest_email").eq("id", data.entry.bookingId).maybeSingle();
      if (booking.error) throw new Error("Die Buchung konnte nicht geprüft werden.");
      if (booking.data && booking.data.guest_email.trim().toLowerCase() !== data.email) throw new Error("Diese Buchung gehört zu einem anderen Kunden.");
      if (!booking.data) {
        const { readCustomerSessions } = await import("./customer-session.server");
        const existing = await readCustomerSessions(db, data.email);
        if (!existing.some(entry => entry.id === data.entry.id && entry.bookingId === data.entry.bookingId)) throw new Error("Buchung nicht gefunden.");
      }
      if (data.entry.id !== data.entry.bookingId) throw new Error("Ungültige Session-Zuordnung.");
    }
    const { writeCustomerSession } = await import("./customer-session.server");
    return writeCustomerSession(db, data.email, data.entry);
  });
