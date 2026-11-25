import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Mindestbuchung pro Zeitfenster (in Minuten), z. B. 180 = mindestens 3 Stunden.
 * Gespeichert als JSON-Objekt { slotId: Minuten } in site_content.
 */
const SLUG = "calendar-slot-min-duration";

export type SlotMinDurations = Record<string, number>;

export async function loadSlotMinDurations(): Promise<SlotMinDurations> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_content")
      .select("body")
      .eq("slug", SLUG)
      .maybeSingle();
    if (error || !data?.body) return {};
    const parsed = z.record(z.string(), z.number().int().min(30).max(1440)).safeParse(JSON.parse(data.body));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Freie Teil-Fenster heißen „<slotId>-free-<n>“ – auf die echte Slot-ID zurückführen. */
export function minMinutesForSlotId(map: SlotMinDurations | undefined, id: string | null | undefined) {
  if (!map || !id) return null;
  return map[id] ?? map[id.split("-free-")[0]] ?? null;
}

/** Höchste Mindestbuchung eines Kalendertags (über alle Zeitfenster). */
export function minMinutesForDay(
  map: SlotMinDurations | undefined,
  slot: { id: string; windows?: Array<{ id: string }> } | null | undefined,
) {
  if (!map || !slot) return null;
  const ids = [slot.id, ...(slot.windows ?? []).map((w) => w.id)];
  const values = ids.map((id) => minMinutesForSlotId(map, id)).filter((v): v is number => v != null);
  return values.length ? Math.max(...values) : null;
}

export function formatMinHours(minutes: number, lang: "de" | "en" = "de") {
  const hours = minutes / 60;
  const amount = hours.toLocaleString(lang === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 1 });
  if (lang === "de") return `${amount} ${hours === 1 ? "Stunde" : "Stunden"}`;
  return `${amount} ${hours === 1 ? "hour" : "hours"}`;
}

/** Öffentlich: Mindestbuchungen für die Kalenderanzeige. */
export const listSlotMinDurations = createServerFn({ method: "GET" }).handler(async () => {
  return loadSlotMinDurations();
});

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

export const setSlotMinDuration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), minutes: z.number().int().min(30).max(1440).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const map = await loadSlotMinDurations();
    if (data.minutes) map[data.id] = data.minutes;
    else delete map[data.id];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_content").upsert({
      slug: SLUG,
      body: JSON.stringify(map),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
