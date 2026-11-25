import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OPTIONAL_DUO_PREFIX = "OPTIONAL_DUO::";

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

function berlinDayBounds(iso: string) {
  const key = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
  // großzügiger UTC-Bereich, danach exakt nach Berliner Datum filtern
  const start = new Date(`${key}T00:00:00Z`).getTime() - 3 * 3600_000;
  const end = start + 30 * 3600_000;
  return { key, start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

/**
 * Setzt die Tagesart für alle Zeitfenster eines Tages:
 * single = nur Single, single_or_duo = Single oder Duo, duo = nur Duo.
 */
export const setSlotDayType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      mode: z.enum(["single", "single_or_duo", "duo"]),
      partner: z.string().trim().max(80).nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    if (data.mode !== "single" && !data.partner) throw new Error("Bitte den Namen der Kollegin eintragen.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: slot, error } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!slot) throw new Error("Zeitfenster nicht gefunden.");
    const day = berlinDayBounds(slot.starts_at);
    const { data: daySlots, error: dayErr } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, location")
      .gte("starts_at", day.start)
      .lt("starts_at", day.end);
    if (dayErr) throw new Error(dayErr.message);
    const ids = (daySlots ?? [])
      .filter((s: { starts_at: string; location: string | null }) =>
        s.location !== "__URLAUB__" && berlinDayBounds(s.starts_at).key === day.key)
      .map((s: { id: string }) => s.id);
    if (!ids.length) return { ok: true, count: 0 };
    const partner = data.partner?.trim() || null;
    const { error: updErr } = await supabaseAdmin
      .from("availability_slots")
      .update({
        is_duo: data.mode !== "single",
        duo_partner: data.mode === "single" ? null : data.mode === "single_or_duo" ? `${OPTIONAL_DUO_PREFIX}${partner}` : partner,
      })
      .in("id", ids);
    if (updErr) throw new Error(updErr.message);
    return { ok: true, count: ids.length };
  });
