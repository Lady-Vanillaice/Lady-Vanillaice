import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Zeiten, zu denen Cam-Sessions angeboten werden. Öffentlich sichtbar im
// Kalender (lila markiert); enthält keine personenbezogenen Daten.
const CAM_SLUG = "calendar-cam-times";

export type CalendarCamTime = {
  id: string;
  date: string;
  from: string;
  to: string;
  note?: string | null;
};

const camSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().trim().max(300).optional().nullable(),
});

function normalize(value: unknown): CalendarCamTime[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => camSchema.safeParse(entry))
    .filter((result) => result.success)
    .map((result) => (result as { data: CalendarCamTime }).data)
    .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));
}

async function loadCamTimes(): Promise<CalendarCamTime[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("site_content").select("body").eq("slug", CAM_SLUG).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.body) return [];
  try {
    return normalize(JSON.parse(data.body));
  } catch {
    return [];
  }
}

async function persist(entries: CalendarCamTime[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("site_content").upsert({
    slug: CAM_SLUG,
    body: JSON.stringify(entries),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/** Öffentlich: nur heutige und kommende Cam-Zeiten. */
export const listCalendarCamTimes = createServerFn({ method: "GET" }).handler(async () => {
  const todayKey = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
  return (await loadCamTimes()).filter((entry) => entry.date >= todayKey);
});

export const saveCalendarCamTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      from: z.string().regex(/^\d{2}:\d{2}$/),
      to: z.string().regex(/^\d{2}:\d{2}$/),
      note: z.string().trim().max(300).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    if (data.from === data.to) throw new Error("Von und Bis dürfen nicht gleich sein.");
    const current = await loadCamTimes();
    current.push({ id: crypto.randomUUID(), date: data.date, from: data.from, to: data.to, note: data.note?.trim() || null });
    await persist(normalize(current));
    return { ok: true };
  });

export const deleteCalendarCamTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const current = await loadCamTimes();
    await persist(current.filter((entry) => entry.id !== data.id));
    return { ok: true };
  });

/** Admin: alle Cam-Zeiten inkl. vergangener. */
export const listAllCalendarCamTimes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    return loadCamTimes();
  });
