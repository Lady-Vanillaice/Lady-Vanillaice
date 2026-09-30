import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const minutesSchema = z.number().int().min(0).max(1440);
const idSchema = z.object({ id: z.string().uuid() });
async function adminDb(context: { supabase: any; userId: string }) {
  const role = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (role.error || !role.data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Independent admin-only planning data: never change session length or availability.
export const getBookingRestTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { privateLocationBucket } = await import("./private-booking-location.server");
    const bucket = await privateLocationBucket(db);
    if (!bucket) return 0;
    const result = await bucket.download(`rest-time/${data.id}.json`);
    if (result.error && (String(result.error.statusCode) === "404" || ["NoSuchKey", "Object not found"].includes(result.error.code ?? result.error.message ?? ""))) return 0;
    if (result.error || !result.data) throw new Error("Die Liegezeit konnte nicht geladen werden.");
    return minutesSchema.parse(JSON.parse(await result.data.text()).minutes);
  });

export const saveBookingRestTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => idSchema.extend({ minutes: minutesSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const booking = await db.from("bookings").select("id").eq("id", data.id).maybeSingle();
    if (booking.error || !booking.data) throw new Error("Buchung nicht gefunden.");
    const { privateLocationBucket } = await import("./private-booking-location.server");
    const bucket = await privateLocationBucket(db, true);
    if (!bucket) throw new Error("Der private Speicher ist nicht verfügbar.");
    const result = await bucket.upload(`rest-time/${data.id}.json`, JSON.stringify({ minutes: data.minutes }), { contentType: "application/json", upsert: true, cacheControl: "0" });
    if (result.error) throw new Error("Die Liegezeit konnte nicht gespeichert werden.");
    return data.minutes;
  });
