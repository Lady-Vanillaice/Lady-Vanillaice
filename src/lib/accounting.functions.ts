import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const exemptionReason = z.enum(["regular_customer", "trust", "exception", "colleague_guarantees"]);

const accountingInput = z.object({
  id: z.string().uuid(),
  studio: z.string().trim().min(1).max(200),
  studio_address: z.string().trim().max(500).nullable().optional(),
  anzahlung: z.number().min(0).max(1_000_000),
  anzahlung_method: z.string().trim().max(100).nullable().optional(),
  anzahlung_paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  deposit_exemption_reason: exemptionReason.nullable().optional(),
  deposit_guarantor: z.string().trim().max(120).nullable().optional(),
  bar: z.number().min(0).max(1_000_000),
  completed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  cash_received_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  fully_paid: z.boolean(),
  status: z.enum(["open", "completed", "cancelled", "rescheduling"]),
  note: z.string().trim().max(2000).nullable().optional(),
});

const atNoon = (date: string | null | undefined) => date ? `${date}T12:00:00.000Z` : null;

export const updateBookingAccounting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => accountingInput.parse(value))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const { data: booking, error: bookingError } = await db.from("bookings").select("id, slot_id").eq("id", data.id).maybeSingle();
    if (bookingError) throw new Error(bookingError.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");
    if (!booking.slot_id) throw new Error("Diese Buchung hat keinen verknüpften Termin. Bitte zuerst Datum und Uhrzeit speichern.");

    const today = new Date().toISOString().slice(0, 10);
    const hasExemption = Boolean(data.deposit_exemption_reason);
    const completedDate = data.fully_paid ? (data.completed_at || today) : data.completed_at;
    const cashDate = data.fully_paid && data.bar > 0 ? (data.cash_received_at || completedDate || today) : data.cash_received_at;
    const depositDate = !hasExemption && data.anzahlung > 0 ? data.anzahlung_paid_at : null;
    const bookingStatus = data.status === "cancelled" ? "cancelled" : data.status === "rescheduling" ? "rescheduling" : "confirmed";
    const guarantor = data.deposit_exemption_reason === "colleague_guarantees" ? data.deposit_guarantor?.trim() || null : null;

    const { error } = await db.from("bookings").update({
      anzahlung: hasExemption ? 0 : data.anzahlung,
      anzahlung_method: hasExemption ? null : data.anzahlung_method?.trim() || null,
      anzahlung_paid: hasExemption ? false : Boolean(depositDate && data.anzahlung > 0),
      anzahlung_paid_at: hasExemption ? null : atNoon(depositDate),
      deposit_exemption_reason: data.deposit_exemption_reason ?? null,
      deposit_guarantor: guarantor,
      bar: data.bar,
      completed_at: atNoon(completedDate),
      cash_received_at: atNoon(cashDate),
      fully_paid: data.fully_paid || data.status === "completed",
      status: bookingStatus,
      admin_note: data.note?.trim() || null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);

    const { data: studioSaved, error: studioError } = await db.rpc("admin_update_booking_studio", {
      p_booking_id: data.id,
      p_location: data.studio.trim(),
      p_location_address: data.studio_address?.trim() || null,
    });
    if (studioError) throw new Error(studioError.message);
    if (!studioSaved) throw new Error("Studio-Adresse konnte nicht gespeichert werden.");

    return { ok: true };
  });