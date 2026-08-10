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
    const { error } = await context.supabase.from("cashbook_hidden_bookings").upsert({ booking_id: data.booking_id, hidden_by: context.userId }, { onConflict: "booking_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
