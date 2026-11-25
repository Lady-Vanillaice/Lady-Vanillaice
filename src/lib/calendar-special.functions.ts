import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SPECIALS_SLUG = "calendar-specials";

export type CalendarSpecial = {
  date: string;
  title: string;
  description: string;
  outfit?: string | null;
  /** Bedingung: Mindestdauer der Session in Stunden (optional) */
  minHours?: number | null;
};

/** Text der Bedingung, z. B. „Mindestens 2 Stunden Session“. Leer, wenn keine Bedingung gesetzt ist. */
export function formatSpecialCondition(minHours: number | null | undefined, lang: "de" | "en") {
  if (minHours == null || !Number.isFinite(minHours) || minHours <= 0) return "";
  const amount = minHours.toLocaleString(lang === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 2 });
  if (lang === "de") return `Mindestens ${amount} ${minHours === 1 ? "Stunde" : "Stunden"} Session`;
  return `Minimum ${amount} ${minHours === 1 ? "hour" : "hours"} session`;
}

/** Liest „2“, „1,5“ oder „1.5“ ein. Gibt null bei leerem Feld zurück, NaN bei ungültiger Eingabe. */
export function parseSpecialMinHours(input: string): number | null {
  const trimmed = input.trim().replace(",", ".");
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

const specialSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(1200),
  outfit: z.string().trim().max(200).optional().nullable(),
  minHours: z.number().min(0.5).max(24).optional().nullable(),
});

function normalizeSpecials(value: unknown): CalendarSpecial[] {
  const parsed = z.array(specialSchema).safeParse(value);
  if (!parsed.success) return [];
  return [...parsed.data].sort((a, b) => a.date.localeCompare(b.date));
}

async function loadSpecials(): Promise<CalendarSpecial[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("site_content")
    .select("body")
    .eq("slug", SPECIALS_SLUG)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.body) return [];
  try {
    return normalizeSpecials(JSON.parse(data.body));
  } catch {
    return [];
  }
}

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

async function persistSpecials(specials: CalendarSpecial[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("site_content").upsert({
    slug: SPECIALS_SLUG,
    body: JSON.stringify(specials),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export const listCalendarSpecials = createServerFn({ method: "GET" }).handler(async () => {
  return loadSpecials();
});

export const saveCalendarSpecial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => specialSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const current = await loadSpecials();
    const next = current.filter((entry) => entry.date !== data.date);
    next.push(data);
    next.sort((a, b) => a.date.localeCompare(b.date));
    await persistSpecials(next);
    return { ok: true };
  });

export const deleteCalendarSpecial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const current = await loadSpecials();
    await persistSpecials(current.filter((entry) => entry.date !== data.date));
    return { ok: true };
  });
