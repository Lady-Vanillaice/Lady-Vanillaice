import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const accountingInput = z.object({
  id: z.string().uuid(),
  anzahlung: z.number().min(0).max(1_000_000),
  anzahlung_method: z.string().trim().max(100).nullable().optional(),
  anzahlung_paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  bar: z.number().min(0).max(1_000_000),
  completed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  cash_received_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  fully_paid: z.boolean(),
  status: z.enum(["open", "completed", "cancelled"]),
  note: z.string().trim().max(2000).nullable().optional(),
});

const atNoon = (date: string | null | undefined) => date ? `${date}T12:00:00.000Z` : null;

export const updateBookingAccounting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => accountingInput.parse(value))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const today = new Date().toISOString().slice(0, 10);
    const completedDate = data.fully_paid ? (data.completed_at || today) : data.completed_at;
    const cashDate = data.fully_paid && data.bar > 0 ? (data.cash_received_at || completedDate || today) : data.cash_received_at;
    const depositDate = data.anzahlung > 0 ? data.anzahlung_paid_at : null;
    const bookingStatus = data.status === "cancelled" ? "cancelled" : "confirmed";

    const { error } = await db.from("bookings").update({
      anzahlung: data.anzahlung,
      anzahlung_method: data.anzahlung_method?.trim() || null,
      anzahlung_paid: Boolean(depositDate && data.anzahlung > 0),
      anzahlung_paid_at: atNoon(depositDate),
      bar: data.bar,
      completed_at: atNoon(completedDate),
      cash_received_at: atNoon(cashDate),
      fully_paid: data.fully_paid || data.status === "completed",
      status: bookingStatus,
      admin_note: data.note?.trim() || null,
    }).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
