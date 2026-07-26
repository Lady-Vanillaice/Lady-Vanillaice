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
          "id, guest_name, duration, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, bar, created_at, requested_start, availability_slots(starts_at, location)",
        )
      .in("status", ["confirmed", "cancelled"])
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
const bookings: CashBookEntry[] = (bookingRes.data ?? []).flatMap(
  (b: any) => {
    const entries: CashBookEntry[] = [];

    const studio = b.availability_slots?.location ?? "—";

    // 1. Anzahlung am tatsächlichen Zahlungstag
    const anzahlung = b.anzahlung_paid
      ? Number(b.anzahlung ?? 0)
      : 0;

    if (anzahlung > 0 && b.anzahlung_paid_at) {
      entries.push({
        id: `booking-deposit:${b.id}`,
        source: "booking",
        studio,
        datum: String(b.anzahlung_paid_at).slice(0, 10),
        kunde: b.guest_name,
        anzahlung,
        anzahlung_method: b.anzahlung_method ?? null,
        bar: 0,
        gesamt: anzahlung,
        notiz: `Anzahlung · ${b.duration ?? ""}`,
        created_at: b.anzahlung_paid_at,
      });
    }

    // 2. Barzahlung am Termin
    const startIso: string | null =
      b.availability_slots?.starts_at ?? b.requested_start ?? null;

    if (startIso && b.status === "confirmed") {
      const terminDatum = String(startIso).slice(0, 10);
      const bar = Number(b.bar ?? 0);

      if (terminDatum <= todayISO && bar > 0) {
        entries.push({
          id: `booking-bar:${b.id}`,
          source: "booking",
          studio,
          datum: terminDatum,
          kunde: b.guest_name,
          anzahlung: 0,
          anzahlung_method: null,
          bar,
          gesamt: bar,
          notiz: `Barzahlung · ${b.duration ?? ""}`,
          created_at: startIso,
        });
      }
    }

    return entries;
  },
);

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
