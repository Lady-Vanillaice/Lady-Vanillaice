import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function isAdminUser(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

const slugInput = z.object({ slug: z.string().trim().min(1).max(64) });

export const getSiteContent = createServerFn({ method: "GET" })
  .inputValidator((d) => slugInput.parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("site_content")
      .select("slug, body, updated_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) {
      console.error("Failed to load site content", error);
      return { slug: data.slug, body: "", updated_at: null as string | null };
    }
    return row ?? { slug: data.slug, body: "", updated_at: null as string | null };
  });

const upsertInput = z.object({
  slug: z.string().trim().min(1).max(64),
  body: z.string().max(200000),
});

export const upsertSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = await isAdminUser(context.supabase, context.userId);
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ slug: data.slug, body: data.body, updated_at: new Date().toISOString() });
    if (error) throw new Error("Inhalt konnte nicht gespeichert werden.");
    return { ok: true as const };
  });
