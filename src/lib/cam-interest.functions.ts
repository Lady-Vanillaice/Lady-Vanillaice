import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Interessenten für Cam-Sessions. Gespeichert im privaten (nicht öffentlichen)
// Speicher – nur Admins können die Liste lesen.
const FILE = "cam-interest.json";
const MAX_ENTRIES = 1000;

export type CamInterestEntry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  telegram: string | null;
  message: string | null;
  status: "waiting" | "contacted";
  created_at: string;
};

const joinSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(40).regex(/^[+0-9][0-9 ()/.-]{5,}$/, "Telefonnummer ungültig"),
  email: z.union([z.string().trim().email().max(200), z.literal("")]).optional().nullable(),
  telegram: z.string().trim().max(100).optional().nullable(),
  message: z.string().trim().max(1000).optional().nullable(),
  consent: z.literal(true),
  // Honeypot gegen Spam-Bots: muss leer bleiben.
  website: z.string().max(0).optional().nullable(),
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

async function bucket(create = false) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { privateLocationBucket } = await import("./private-booking-location.server");
  return privateLocationBucket(supabaseAdmin as any, create);
}

async function loadEntries(): Promise<CamInterestEntry[]> {
  const store = await bucket();
  if (!store) return [];
  const { data, error } = await store.download(FILE);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? (parsed as CamInterestEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveEntries(entries: CamInterestEntry[]) {
  const store = await bucket(true);
  if (!store) throw new Error("Der private Speicher ist nicht verfügbar.");
  const { error } = await store.upload(FILE, JSON.stringify(entries), {
    contentType: "application/json", upsert: true, cacheControl: "0",
  });
  if (error) throw new Error("Die Anmeldung konnte nicht gespeichert werden.");
}

export const joinCamInterest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => joinSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true, alreadyRegistered: false };
    const entries = await loadEntries();
    const email = data.email?.trim().toLowerCase() || null;
    const phone = data.phone.trim();
    const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");
    const existing = entries.find((entry) => digits(entry.phone) === digits(phone));
    if (existing) {
      // Erneute Anmeldung: wieder als „wartet“ markieren und Angaben aktualisieren.
      existing.name = data.name.trim();
      existing.email = email || existing.email;
      existing.telegram = data.telegram?.trim() || existing.telegram;
      existing.message = data.message?.trim() || existing.message;
      existing.status = "waiting";
      await saveEntries(entries);
      return { ok: true, alreadyRegistered: true };
    }
    if (entries.length >= MAX_ENTRIES) throw new Error("Die Liste ist gerade voll. Bitte melde dich über Kontakt.");
    entries.push({
      id: crypto.randomUUID(),
      name: data.name.trim(),
      phone,
      email,
      telegram: data.telegram?.trim() || null,
      message: data.message?.trim() || null,
      status: "waiting",
      created_at: new Date().toISOString(),
    });
    await saveEntries(entries);
    return { ok: true, alreadyRegistered: false };
  });

export const listCamInterest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const entries = await loadEntries();
    return [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));
  });

export const setCamInterestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["waiting", "contacted"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const entries = await loadEntries();
    await saveEntries(entries.map((entry) => (entry.id === data.id ? { ...entry, status: data.status } : entry)));
    return { ok: true };
  });

export const deleteCamInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const entries = await loadEntries();
    await saveEntries(entries.filter((entry) => entry.id !== data.id));
    return { ok: true };
  });
