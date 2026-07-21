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

const submitInput = z.object({
  pseudonym: z.string().trim().min(2).max(60),
  content: z.string().trim().min(20).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
});

export const submitTestimonial = createServerFn({ method: "POST" })
  .inputValidator((d) => submitInput.parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { error } = await supabase.from("testimonials").insert({
      pseudonym: data.pseudonym,
      content: data.content,
      rating: data.rating ?? null,
      status: "pending",
    });
    if (error) {
      console.error("Failed to insert testimonial", error);
      throw new Error("Dein Erfahrungsbericht konnte nicht gespeichert werden. Bitte versuche es später erneut.");
    }
    return { ok: true as const };
  });

export const listApprovedTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("testimonials")
    .select("id, pseudonym, content, rating, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("Failed to load approved testimonials", error);
    return [];
  }
  return data ?? [];
});

export const listAllTestimonials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = await isAdminUser(context.supabase, context.userId);
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("testimonials")
      .select("id, pseudonym, content, rating, status, admin_note, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Erfahrungsberichte konnten nicht geladen werden.");
    return data ?? [];
  });

const statusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
});

export const updateTestimonialStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => statusInput.parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = await isAdminUser(context.supabase, context.userId);
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("testimonials")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Status konnte nicht aktualisiert werden.");
    return { ok: true as const };
  });

const deleteInput = z.object({ id: z.string().uuid() });

export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => deleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = await isAdminUser(context.supabase, context.userId);
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("testimonials").delete().eq("id", data.id);
    if (error) throw new Error("Erfahrungsbericht konnte nicht gelöscht werden.");
    return { ok: true as const };
  });
