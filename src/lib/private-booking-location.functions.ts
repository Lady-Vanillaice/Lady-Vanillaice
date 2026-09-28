import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { privateBookingLocationSchema } from "./private-booking-location.schema";

async function adminClient(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.from("user_roles")
    .select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getPrivateBookingLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { privateLocationBucket, readPrivateLocation } = await import("./private-booking-location.server");
    const bucket = await privateLocationBucket(db);
    return bucket ? readPrivateLocation(bucket, data.id) : null;
  });

export const savePrivateBookingLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), location: privateBookingLocationSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const booking = await db.from("bookings").select("id").eq("id", data.id).maybeSingle();
    if (booking.error || !booking.data) throw new Error("Buchung nicht gefunden.");
    const { writePrivateLocation } = await import("./private-booking-location.server");
    await writePrivateLocation(db, data.id, data.location);
    return data.location;
  });

// Only address/name are needed for the admin's travel export; never send notes.
export const listPrivateBookingDestinations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ids: z.array(z.string().uuid()).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { privateLocationBucket, readPrivateLocation } = await import("./private-booking-location.server");
    const bucket = await privateLocationBucket(db);
    const destinations: Record<string, { name: string; address: string }> = {};
    if (!bucket) return destinations;
    const ids = [...new Set(data.ids)];
    for (let i = 0; i < ids.length; i += 10) {
      await Promise.all(ids.slice(i, i + 10).map(async (id) => {
        const location = await readPrivateLocation(bucket, id);
        if (location?.address) destinations[id] = { name: location.name || "Privater Terminort", address: location.address };
      }));
    }
    return destinations;
  });
