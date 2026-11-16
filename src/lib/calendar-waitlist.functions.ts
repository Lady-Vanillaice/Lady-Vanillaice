import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WAITLIST_SLUG = "calendar-waitlist";

export type CalendarWaitlistEntry = {
  id: string;
  waitlist_date: string;
  name: string;
  email: string;
  available_from: string;
  available_to: string;
  status: "waiting" | "contacted";
  created_at: string;
};

const joinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  available_from: z.string().regex(/^\d{2}:\d{2}$/),
  available_to: z.string().regex(/^\d{2}:\d{2}$/),
}).refine((value) => value.available_from < value.available_to, {
  message: "Die Endzeit muss nach der Startzeit liegen.",
  path: ["available_to"],
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

function normalizeEntries(value: unknown): CalendarWaitlistEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is CalendarWaitlistEntry => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as Record<string, unknown>;
    return (
      typeof row.id === "string" &&
      typeof row.waitlist_date === "string" &&
      typeof row.name === "string" &&
      typeof row.email === "string" &&
      typeof row.available_from === "string" &&
      typeof row.available_to === "string" &&
      (row.status === "waiting" || row.status === "contacted") &&
      typeof row.created_at === "string"
    );
  });
}

async function loadEntries() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("site_content")
    .select("body")
    .eq("slug", WAITLIST_SLUG)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.body) return [] as CalendarWaitlistEntry[];
  try {
    return normalizeEntries(JSON.parse(data.body));
  } catch {
    return [] as CalendarWaitlistEntry[];
  }
}

async function saveEntries(entries: CalendarWaitlistEntry[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("site_content").upsert({
    slug: WAITLIST_SLUG,
    body: JSON.stringify(entries),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export const joinCalendarWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => joinSchema.parse(input))
  .handler(async ({ data }) => {
    const entries = await loadEntries();
    const email = data.email.trim().toLowerCase();
    const duplicate = entries.some(
      (entry) => entry.waitlist_date === data.date && entry.email.toLowerCase() === email,
    );
    if (duplicate) return { ok: true, alreadyRegistered: true };

    entries.push({
      id: crypto.randomUUID(),
      waitlist_date: data.date,
      name: data.name.trim(),
      email,
      available_from: data.available_from,
      available_to: data.available_to,
      status: "waiting",
      created_at: new Date().toISOString(),
    });
    await saveEntries(entries);
    return { ok: true, alreadyRegistered: false };
  });

export const listCalendarWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const entries = await loadEntries();
    return [...entries].sort(
      (a, b) =>
        a.waitlist_date.localeCompare(b.waitlist_date) ||
        a.available_from.localeCompare(b.available_from) ||
        a.created_at.localeCompare(b.created_at),
    );
  });

export const setCalendarWaitlistStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["waiting", "contacted"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const entries = await loadEntries();
    const next = entries.map((entry) =>
      entry.id === data.id ? { ...entry, status: data.status } : entry,
    );
    await saveEntries(next);
    return { ok: true };
  });

export const deleteCalendarWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const entries = await loadEntries();
    await saveEntries(entries.filter((entry) => entry.id !== data.id));
    return { ok: true };
  });
