import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type DepositExemptionReason = "regular_customer" | "trust" | "exception" | "colleague_guarantees" | "spontaneous";
const STUDIO_RENT_LABEL = "Studiomiete";

export type CashBookEntry = {
  id: string;
  source: "manual" | "booking";
  entry_type: "income" | "expense";
  expense_category: string | null;
  expense_amount: number;
  payment_method: string | null;
  booking_id: string | null;
  termin_datum: string;
  termin_start: string | null;
  termin_ende: string | null;
  studio: string;
  studio_address: string | null;
  kunde: string;
  art: string;
  dauer: string | null;
  anzahlung: number;
  anzahlung_vorgemerkt: number;
  anzahlung_method: string | null;
  anzahlung_datum: string | null;
  deposit_exemption_reason: DepositExemptionReason | null;
  deposit_guarantor: string | null;
  bar: number;
  restbetrag_vorgemerkt: number;
  bar_datum: string | null;
  durchgefuehrt_datum: string | null;
  gesamt: number;
  status: "open" | "completed" | "cancelled" | "rescheduling";
  notiz: string | null;
  created_at: string;
};

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const dateOnly = (value: string | null | undefined) => value ? String(value).slice(0, 10) : null;

function durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {
  if (minutes && minutes > 0) {
    const hours = minutes / 60;
    const hourLabel = Number.isInteger(hours)
      ? `${hours.toLocaleString("de-DE")} Std.`
      : `${hours.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`;
    return `${minutes} Min. (${hourLabel})`;
  }
  return fallback?.trim() || null;
}

export const listCashBookEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const [manualRes, bookingRes] = await Promise.all([
      db.from("cash_book_entries").select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at"),
      db.from("bookings")
        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, deposit_guarantor, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)")
        .in("status", ["confirmed", "cancelled", "rescheduling"]),
    ]);
    if (manualRes.error) throw new Error(manualRes.error.message);
    if (bookingRes.error) throw new Error(bookingRes.error.message);

    const manual: CashBookEntry[] = (manualRes.data ?? []).map((e: any) => {
      const isStudioRent = e.kunde === STUDIO_RENT_LABEL;
      return {
        id: e.id, source: "manual", entry_type: isStudioRent ? "expense" : "income",
        expense_category: isStudioRent ? "studio_rent" : null,
        expense_amount: isStudioRent ? Number(e.bar) : 0,
        payment_method: isStudioRent ? e.anzahlung_method ?? null : null,
        booking_id: null, termin_datum: e.datum, termin_start: null, termin_ende: null,
        studio: e.studio, studio_address: null, kunde: e.kunde,
        art: isStudioRent ? STUDIO_RENT_LABEL : e.studio === "Custom Content" ? "Custom Content" : "Manuell",
        dauer: e.notiz || null,
        anzahlung: isStudioRent ? 0 : Number(e.anzahlung),
        anzahlung_vorgemerkt: isStudioRent ? 0 : Number(e.anzahlung),
        anzahlung_method: isStudioRent ? null : e.anzahlung_method ?? null,
        anzahlung_datum: !isStudioRent && Number(e.anzahlung) > 0 ? e.datum : null,
        deposit_exemption_reason: null, deposit_guarantor: null,
        bar: isStudioRent ? 0 : Number(e.bar),
        restbetrag_vorgemerkt: isStudioRent ? 0 : Number(e.bar),
        bar_datum: !isStudioRent && Number(e.bar) > 0 ? e.datum : null,
        durchgefuehrt_datum: !isStudioRent && Number(e.bar) > 0 ? e.datum : null,
        gesamt: isStudioRent ? 0 : Number(e.gesamt), status: "completed",
        notiz: e.notiz, created_at: e.created_at,
      };
    });

    const bookings: CashBookEntry[] = (bookingRes.data ?? []).map((b: any) => {
      const slot = (Array.isArray(b.availability_slots) ? b.availability_slots[0] : b.availability_slots) as {
        starts_at?: string; ends_at?: string; location?: string; location_address?: string | null; is_duo?: boolean; is_content_shoot?: boolean;
      } | null;
      const termin = dateOnly(b.requested_start ?? slot?.starts_at) ?? dateOnly(b.created_at)!;
      const anzahlung = b.anzahlung_paid ? Number(b.anzahlung ?? 0) : 0;
      const bar = b.cash_received_at || b.fully_paid ? Number(b.bar ?? 0) : 0;
      const status: CashBookEntry["status"] = b.status === "cancelled" ? "cancelled" : b.status === "rescheduling" ? "rescheduling" : b.fully_paid || b.completed_at ? "completed" : "open";
      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");
      return {
        id: `booking:${b.id}`, source: "booking", entry_type: "income", expense_category: null,
        expense_amount: 0, payment_method: null, booking_id: b.id, termin_datum: termin,
        termin_start: b.requested_start ?? slot?.starts_at ?? null, termin_ende: slot?.ends_at ?? null,
        studio: b.studio_override?.trim() || slot?.location || "—",
        studio_address: b.studio_address_override?.trim() || slot?.location_address || null,
        kunde: b.guest_name, art, dauer: durationLabel(b.duration_minutes, b.duration), anzahlung,
        anzahlung_vorgemerkt: Number(b.anzahlung ?? 0),
        anzahlung_method: b.anzahlung_method ?? null, anzahlung_datum: dateOnly(b.anzahlung_paid_at),
        deposit_exemption_reason: b.deposit_exemption_reason ?? null, deposit_guarantor: b.deposit_guarantor ?? null,
        bar, restbetrag_vorgemerkt: Number(b.bar ?? 0), bar_datum: dateOnly(b.cash_received_at), durchgefuehrt_datum: dateOnly(b.completed_at), gesamt: anzahlung + bar,
        status, notiz: b.admin_note ?? null, created_at: b.created_at,
      };
    });

    return [...manual, ...bookings].sort((a, b) => {
      const ad = a.termin_start || a.termin_datum;
      const bd = b.termin_start || b.termin_datum;
      return ad < bd ? 1 : ad > bd ? -1 : 0;
    });
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
    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({
      studio: data.studio, datum: data.datum, kunde: data.kunde, anzahlung: data.anzahlung,
      anzahlung_method: data.anzahlung_method?.trim() || null, bar: data.bar, notiz: data.notiz ?? null,
      created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

const expenseSchema = z.object({
  studio: z.string().min(1, "Studio fehlt").max(200),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ungültig"),
  betrag: z.number().positive("Betrag muss größer als 0 sein").max(1_000_000),
  zahlungsart: z.string().min(1, "Zahlungsart fehlt").max(100),
  notiz: z.string().max(2000).optional().nullable(),
});

export const createStudioRentExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => expenseSchema.parse(data))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({
      studio: data.studio.trim(),
      datum: data.datum,
      kunde: STUDIO_RENT_LABEL,
      anzahlung: 0,
      anzahlung_method: data.zahlungsart.trim(),
      bar: data.betrag,
      notiz: data.notiz?.trim() || null,
      created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCashBookEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("cash_book_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
