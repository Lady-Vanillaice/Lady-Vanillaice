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

export const listBookingRestPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const { data, error } = await db
      .from("bookings")
      .select("id, restzahlung_method")
      .in("status", ["confirmed", "cancelled", "rescheduling"]);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((row: any) => [row.id, row.restzahlung_method ?? null])) as Record<string, string | null>;
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
    const { error } = await db
      .from("bookings")
      .update({ restzahlung_method: data.restzahlung_method?.trim() || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
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
    const { error } = await db
      .from("bookings")
      .update({ restzahlung_method: data.restzahlung_method?.trim() || null })
      .eq("slot_id", data.slot_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
