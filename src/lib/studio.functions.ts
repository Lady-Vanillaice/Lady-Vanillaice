import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudioOption = { id: string; name: string; address: string };
export const DEFAULT_STUDIOS: StudioOption[] = [
  { id: "studio60", name: "Studio60", address: "Gärtnerstraße 60, 80992 München" },
  { id: "studio-elegance", name: "Studio Elegance", address: "Frankfurter Ring 139, 80807 München" },
];
async function ensureAdmin(supabase: any, userId: string) { const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(); if (error) throw new Error(error.message); if (!data) throw new Error("Forbidden"); }
export const listStudios = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { await ensureAdmin(context.supabase, context.userId); const { data, error } = await (context.supabase as any).from("admin_studios").select("id, name, address").eq("active", true).order("sort_order").order("name"); if (error) throw new Error(error.message); return (data ?? []) as StudioOption[]; });
export const createStudio = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ name: z.string().trim().min(1).max(120), address: z.string().trim().min(1).max(300) }).parse(input)).handler(async ({ data, context }) => { await ensureAdmin(context.supabase, context.userId); const { error } = await (context.supabase as any).from("admin_studios").insert({ name: data.name, address: data.address, created_by: context.userId }); if (error) throw new Error(error.code === "23505" ? "Dieses Studio ist bereits vorhanden." : error.message); return { ok: true }; });
export const deleteStudio = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => { await ensureAdmin(context.supabase, context.userId); const { error } = await (context.supabase as any).from("admin_studios").update({ active: false }).eq("id", data.id); if (error) throw new Error(error.message); return { ok: true }; });
