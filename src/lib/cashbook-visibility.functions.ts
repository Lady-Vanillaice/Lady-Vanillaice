import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listHiddenCashbookBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("cashbook_hidden_bookings").select("booking_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: { booking_id: string }) => row.booking_id);
  });

/**
 * Der historische Name bleibt bestehen, damit bestehende Admin-Seiten keinen
 * Import-Bruch bekommen. Die Funktion blendet aber nicht mehr nur aus:
 * Papierkorb im Kassenbuch bedeutet endgültiges Löschen der Buchung.
 */
export const hideBookingFromCashbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ booking_id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, slot_id")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (bookingErr) throw new Error(bookingErr.message);

    // Ein früher archivierter Kassenbucheintrag mit derselben Buchungs-ID soll
    // bei einem Löschversuch ebenfalls verschwinden. Dadurch ist der Vorgang
    // auch nach einem früher nur teilweise erfolgreichen Löschversuch sicher.
    const cleanupCashbook = async () => {
      const { error } = await supabaseAdmin
        .from("cash_book_entries")
        .delete()
        .eq("id", data.booking_id);
      if (error) throw new Error(error.message);
    };

    if (!booking) {
      await cleanupCashbook();
      const { error: hiddenCleanupErr } = await supabaseAdmin
        .from("cashbook_hidden_bookings")
        .delete()
        .eq("booking_id", data.booking_id);
      if (hiddenCleanupErr) throw new Error(hiddenCleanupErr.message);
      return { ok: true, already_deleted: true };
    }

    const { error: hiddenErr } = await supabaseAdmin
      .from("cashbook_hidden_bookings")
      .delete()
      .eq("booking_id", data.booking_id);
    if (hiddenErr) throw new Error(hiddenErr.message);

    await cleanupCashbook();

    const { data: deletedRows, error: deleteErr } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", data.booking_id)
      .select("id");
    if (deleteErr) throw new Error(`Termin konnte nicht gelöscht werden: ${deleteErr.message}`);
    if (!deletedRows || deletedRows.length === 0) throw new Error("Termin konnte nicht gelöscht werden.");

    // Falls irgendein Datenbank-Trigger beim Löschen doch noch einen
    // Kassenbuch-Snapshot erzeugt, wird er anschließend ebenfalls entfernt.
    await cleanupCashbook();

    if (booking.slot_id) {
      const { data: remaining, error: remainingErr } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("slot_id", booking.slot_id)
        .in("status", ["pending", "waiting_deposit", "confirmed"])
        .limit(1);
      if (remainingErr) throw new Error(remainingErr.message);

      if ((remaining ?? []).length === 0) {
        const { error: slotErr } = await supabaseAdmin
          .from("availability_slots")
          .update({ status: "open", is_hidden: false })
          .eq("id", booking.slot_id);
        if (slotErr) throw new Error(`Termin gelöscht, aber Zeitraum konnte nicht freigegeben werden: ${slotErr.message}`);
      }
    }

    return { ok: true, deleted: true };
  });
