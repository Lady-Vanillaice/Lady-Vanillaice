import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Zeitfenster, die im Admin per Knopf als „Belegt“ markiert wurden.
 * Sie bleiben im Admin unverändert, erscheinen im öffentlichen Kalender
 * aber als belegt und sind dort nicht buchbar.
 */
const SLUG = "calendar-manual-booked";

export async function loadManualBookedSlotIds(): Promise<Set<string>> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_content")
      .select("body")
      .eq("slug", SLUG)
      .maybeSingle();
    if (error || !data?.body) return new Set();
    const parsed = z.array(z.string()).safeParse(JSON.parse(data.body));
    return new Set(parsed.success ? parsed.data : []);
  } catch {
    return new Set();
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

export const listManualBookedSlotIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    return [...(await loadManualBookedSlotIds())];
  });

export const setSlotManualBooked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), booked: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const ids = await loadManualBookedSlotIds();
    if (data.booked) ids.add(data.id);
    else ids.delete(data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_content").upsert({
      slug: SLUG,
      body: JSON.stringify([...ids]),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
