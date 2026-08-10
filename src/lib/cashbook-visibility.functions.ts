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
    if (!booking) throw new Error("Termin nicht gefunden.");

    // Ein ggf. bereits archivierter/manueller Kassenbucheintrag mit derselben
    // Buchungs-ID wird ebenfalls entfernt. Der Papierkorb bedeutet hier bewusst
    // vollständiges Löschen des Termins inklusive Kassenbuch-Dublette.
    const { error: cashbookErr } = await supabaseAdmin
      .from("cash_book_entries")
      .delete()
      .eq("id", data.booking_id);
    if (cashbookErr) throw new Error(cashbookErr.message);

    const { error: hiddenErr } = await supabaseAdmin
      .from("cashbook_hidden_bookings")
      .delete()
      .eq("booking_id", data.booking_id);
    if (hiddenErr) throw new Error(hiddenErr.message);

    const { error: deleteErr } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", data.booking_id);
    if (deleteErr) throw new Error(deleteErr.message);

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

    return { ok: true };
  });
