import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type CashBookEntry = {
  id: string;
  source: "manual" | "booking";
  studio: string;
  datum: string;
  kunde: string;
  anzahlung: number;
  anzahlung_method: string | null;
  bar: number;
  gesamt: number;
  notiz: string | null;
  created_at: string;
};

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

export const listCashBookEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const [manualRes, bookingRes] = await Promise.all([
      context.supabase
        .from("cash_book_entries")
        .select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at"),
      context.supabase
        .from("bookings")
        .select(
          "id, guest_name, duration, anzahlung, anzahlung_method, bar, created_at, requested_start, availability_slots(starts_at, location)",
        )
        .eq("status", "confirmed"),
    ]);

    if (manualRes.error) throw new Error(manualRes.error.message);
    if (bookingRes.error) throw new Error(bookingRes.error.message);

    const manual: CashBookEntry[] = (manualRes.data ?? []).map((e: any) => ({
      id: e.id,
      source: "manual",
      studio: e.studio,
      datum: e.datum,
      kunde: e.kunde,
      anzahlung: Number(e.anzahlung),
      anzahlung_method: e.anzahlung_method ?? null,
      bar: Number(e.bar),
      gesamt: Number(e.gesamt),
      notiz: e.notiz,
      created_at: e.created_at,
    }));

    const todayISO = new Date().toISOString().slice(0, 10);

    const bookings: CashBookEntry[] = (bookingRes.data ?? [])
      .map((b: any) => {
        const startIso: string | null =
          b.availability_slots?.starts_at ?? b.requested_start ?? null;
        if (!startIso) return null;
        const datum = String(startIso).slice(0, 10);
        if (datum > todayISO) return null; // only past / today
        const anzahlung = Number(b.anzahlung ?? 0);
        const bar = Number(b.bar ?? 0);
        return {
          id: `booking:${b.id}`,
          source: "booking" as const,
          studio: b.availability_slots?.location ?? "—",
          datum,
          kunde: b.guest_name,
          anzahlung,
          anzahlung_method: b.anzahlung_method ?? null,
          bar,
          gesamt: anzahlung + bar,
          notiz: b.duration ?? null,
          created_at: b.created_at,
        };
      })
      .filter(Boolean) as CashBookEntry[];

    const all = [...manual, ...bookings].sort((a, b) => {
      if (a.datum !== b.datum) return a.datum < b.datum ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1;
    });

    return all;
  });

const entrySchema = z.object({
  studio: z.string().min(1, "Studio fehlt").max(200),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ungültig"),
  kunde: z.string().min(1, "Kunde fehlt").max(200),
  anzahlung: z.number().min(0).max(1_000_000),
  anzahlung_method: z.string().max(100).nullable().optional(),
  bar: z.number().min(0).max(1_000_000),
  notiz: z.string().max(2000).optional().nullable(),
});

export const createCashBookEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entrySchema.parse(data))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const method = data.anzahlung_method?.trim() ?? "";
    const { data: row, error } = await context.supabase
      .from("cash_book_entries")
      .insert({
        studio: data.studio,
        datum: data.datum,
        kunde: data.kunde,
        anzahlung: data.anzahlung,
        anzahlung_method: method.length ? method : null,
        bar: data.bar,
        notiz: data.notiz ?? null,
        created_by: context.userId,
      })
      .select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as CashBookEntry;
  });

export const deleteCashBookEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("cash_book_entries")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
