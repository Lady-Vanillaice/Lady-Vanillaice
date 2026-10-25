import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function adminDb(context: { supabase: any; userId: string }) {
  const role = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (role.error || !role.data) throw new Error("Keine Berechtigung.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listBookingSessionClosures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context);
    const { data, error } = await db.from("booking_session_closures").select("booking_id,crm_notes,report_decision,completed_at");
    if (error) throw new Error("Session-Abschlüsse konnten nicht geladen werden: " + error.message);
    return data ?? [];
  });

export const completeBookingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    bookingId: z.string().uuid(),
    crmNotes: z.string().trim().min(1, "Bitte die CRM-Dokumentation ausfüllen.").max(6000),
    reportDecision: z.enum(["sent", "skipped"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { data: booking, error } = await db.from("bookings")
      .select("id,bar,cash_received_at,status,guest_email,requested_start,studio_override,availability_slots(starts_at,location)")
      .eq("id", data.bookingId).maybeSingle();
    if (error || !booking) throw new Error("Buchung nicht gefunden.");
    if (booking.status !== "confirmed") throw new Error("Nur bestätigte Termine können abgeschlossen werden.");
    if (!booking.cash_received_at) throw new Error("Bitte zuerst die Restzahlung im Kassenbuch/Buchungsdetail als erhalten erfassen (auch bei 0 €).");
    const email = String(booking.guest_email ?? "").trim().toLowerCase();
    if (!email) throw new Error("Für die CRM-Historie fehlt die Kunden-E-Mail.");
    const { readCustomerSessions, writeCustomerSession } = await import("./customer-session.server");
    const sessions = await readCustomerSessions(db, email);
    const previous = sessions.find(item => item.bookingId === data.bookingId);
    const slot = Array.isArray(booking.availability_slots) ? booking.availability_slots[0] : booking.availability_slots;
    const start = booking.requested_start || slot?.starts_at;
    if (!start) throw new Error("Für die Session fehlt ein Termin-Datum.");
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(start));
    const time = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(start));
    await writeCustomerSession(db, email, {
      id: data.bookingId, bookingId: data.bookingId, date, time,
      place: previous?.place || booking.studio_override || slot?.location || "",
      room: previous?.room || "",
      activities: data.crmNotes,
      liked: previous?.liked || "",
      disliked: previous?.disliked || "",
      nextTime: previous?.nextTime || "",
      notes: previous?.notes || "",
    });
    const { error: saveError } = await db.from("booking_session_closures").upsert({
      booking_id: data.bookingId,
      crm_notes: data.crmNotes,
      report_decision: data.reportDecision,
      completed_by: context.userId,
      completed_at: new Date().toISOString(),
    }, { onConflict: "booking_id" });
    if (saveError) throw new Error("Abschluss konnte nicht gespeichert werden: " + saveError.message);
    return { ok: true };
  });
