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
      .select("id,bar,cash_received_at,status")
      .eq("id", data.bookingId).maybeSingle();
    if (error || !booking) throw new Error("Buchung nicht gefunden.");
    if (booking.status !== "confirmed") throw new Error("Nur bestätigte Termine können abgeschlossen werden.");
    if (!booking.cash_received_at) throw new Error("Bitte zuerst die Restzahlung im Kassenbuch/Buchungsdetail als erhalten erfassen (auch bei 0 €).");
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
