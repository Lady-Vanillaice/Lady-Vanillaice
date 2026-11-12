import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudioOption = { id: string; name: string; address: string };

export const DEFAULT_STUDIOS: StudioOption[] = [
  { id: "studio60", name: "Studio60", address: "Gärtnerstraße 60, 80992 München" },
  { id: "studio-elegance", name: "Studio Elegance", address: "Frankfurter Ring 139, 80807 München" },
];

const STUDIO_SLUG_PREFIX = "admin-studio-";

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

function parseStudioRow(row: { slug: string; body: string }): StudioOption | null {
  try {
    const parsed = JSON.parse(row.body) as { name?: unknown; address?: unknown };
    if (typeof parsed.name !== "string" || typeof parsed.address !== "string") return null;
    const name = parsed.name.trim();
    const address = parsed.address.trim();
    if (!name || !address) return null;
    return {
      id: row.slug.slice(STUDIO_SLUG_PREFIX.length),
      name,
      address,
    };
  } catch {
    return null;
  }
}

export const listStudios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("site_content")
      .select("slug, body")
      .like("slug", `${STUDIO_SLUG_PREFIX}%`)
      .order("updated_at", { ascending: true });

    if (error) throw new Error("Studios konnten nicht geladen werden.");

    const customStudios = (data ?? [])
      .map(parseStudioRow)
      .filter((studio): studio is StudioOption => Boolean(studio));

    const seen = new Set<string>();
    return [...DEFAULT_STUDIOS, ...customStudios].filter((studio) => {
      const key = `${studio.name.trim().toLocaleLowerCase("de-DE")}|${studio.address.trim().toLocaleLowerCase("de-DE")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

export const createStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: z.string().trim().min(1).max(120),
      address: z.string().trim().min(1).max(300),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const existing = await listStudios();
    const duplicate = existing.some(
      (studio) =>
        studio.name.trim().toLocaleLowerCase("de-DE") === data.name.trim().toLocaleLowerCase("de-DE") &&
        studio.address.trim().toLocaleLowerCase("de-DE") === data.address.trim().toLocaleLowerCase("de-DE"),
    );
    if (duplicate) throw new Error("Dieses Studio ist bereits vorhanden.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = crypto.randomUUID();
    const { error } = await supabaseAdmin
      .from("site_content")
      .insert({
        slug: `${STUDIO_SLUG_PREFIX}${id}`,
        body: JSON.stringify({ name: data.name.trim(), address: data.address.trim() }),
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error("Studio konnte nicht gespeichert werden.");
    return { ok: true };
  });

export const deleteStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    if (DEFAULT_STUDIOS.some((studio) => studio.id === data.id)) {
      throw new Error("Die Standard-Studios können nicht gelöscht werden.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_content")
      .delete()
      .eq("slug", `${STUDIO_SLUG_PREFIX}${data.id}`);

    if (error) throw new Error("Studio konnte nicht gelöscht werden.");
    return { ok: true };
  });
