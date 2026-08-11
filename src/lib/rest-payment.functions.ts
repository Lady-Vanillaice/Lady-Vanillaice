import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const paymentMethod = z.string().trim().min(1).max(100).nullable();
const paymentDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

function isNoDepositBooking(row: { anzahlung?: unknown; deposit_exemption_reason?: unknown }) {
  return Boolean(row.deposit_exemption_reason) || Number(row.anzahlung ?? 0) === 0;
}

// Production does not yet have bookings.restzahlung_method. For no-deposit
// bookings the otherwise unused anzahlung_method column safely stores the
// selected on-site payment method. Regular bookings continue to default to Bar
// until the dedicated database column is available.
export const listBookingRestPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const { data, error } = await db
      .from("bookings")
      .select("id, anzahlung, anzahlung_method, deposit_exemption_reason")
      .in("status", ["confirmed", "cancelled", "rescheduling"]);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((row: any) => [
      row.id,
      isNoDepositBooking(row) ? row.anzahlung_method ?? null : null,
    ])) as Record<string, string | null>;
  });

export const updateBookingRestPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    id: z.string().uuid(),
    restzahlung_method: paymentMethod,
  }).parse(value))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const { data: booking, error: fetchError } = await db
      .from("bookings")
      .select("anzahlung, deposit_exemption_reason")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");
    if (isNoDepositBooking(booking)) {
      const { error } = await db
        .from("bookings")
        .update({ anzahlung_method: data.restzahlung_method?.trim() || null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateBookingRestPaymentMethodBySlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    slot_id: z.string().uuid(),
    restzahlung_method: paymentMethod,
  }).parse(value))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const { data: bookings, error: fetchError } = await db
      .from("bookings")
      .select("id, anzahlung, deposit_exemption_reason")
      .eq("slot_id", data.slot_id);
    if (fetchError) throw new Error(fetchError.message);
    for (const booking of bookings ?? []) {
      if (!isNoDepositBooking(booking)) continue;
      const { error } = await db
        .from("bookings")
        .update({ anzahlung_method: data.restzahlung_method?.trim() || null })
        .eq("id", booking.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const onsitePaymentInput = z.object({
  amount: z.number().min(0).max(1_000_000),
  method: paymentMethod,
  paid_at: paymentDate,
});

function onsiteUpdate(data: { amount: number; paid_at: string | null }) {
  return {
    bar: data.amount,
    cash_received_at: data.paid_at ? `${data.paid_at}T12:00:00.000Z` : null,
  };
}

export const updateBookingOnsitePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => onsitePaymentInput.extend({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const { data: booking, error: fetchError } = await db
      .from("bookings")
      .select("anzahlung, anzahlung_paid, deposit_exemption_reason")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");

    const { error } = await db
      .from("bookings")
      .update({
        ...onsiteUpdate(data),
        ...(isNoDepositBooking(booking) ? { anzahlung_method: data.amount > 0 ? data.method?.trim() || null : null } : {}),
        ...(data.paid_at ? {
          fully_paid: Boolean(data.amount > 0 && (booking.anzahlung_paid || booking.deposit_exemption_reason)),
        } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateBookingOnsitePaymentBySlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => onsitePaymentInput.extend({ slot_id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const { data: bookings, error: fetchError } = await db
      .from("bookings")
      .select("id, anzahlung, anzahlung_paid, deposit_exemption_reason")
      .eq("slot_id", data.slot_id);
    if (fetchError) throw new Error(fetchError.message);

    for (const booking of bookings ?? []) {
      const { error } = await db
        .from("bookings")
        .update({
          ...onsiteUpdate(data),
          ...(isNoDepositBooking(booking) ? { anzahlung_method: data.amount > 0 ? data.method?.trim() || null : null } : {}),
          ...(data.paid_at ? {
            fully_paid: Boolean(data.amount > 0 && (booking.anzahlung_paid || booking.deposit_exemption_reason)),
          } : {}),
        })
        .eq("id", booking.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
