import type { SupabaseClient } from "@supabase/supabase-js";
import { privateBookingLocationSchema, type PrivateBookingLocation } from "./private-booking-location.schema";

// Dedicated private bucket, with no client access policies or signed/public URLs.
// Only the admin-checked server functions below may read or write these objects.
const BUCKET = "private-booking-locations";
const missing = (error: { statusCode?: string | number; code?: string; message?: string } | null) =>
  error && (String(error.statusCode) === "404" ||
    ["NoSuchBucket", "NoSuchKey"].includes(error.code ?? "") ||
    ["Bucket not found", "Object not found"].includes(error.message ?? ""));

export async function privateLocationBucket(db: SupabaseClient, create = false) {
  let result = await db.storage.getBucket(BUCKET);
  if (missing(result.error)) {
    if (!create) return null;
    const created = await db.storage.createBucket(BUCKET, { public: false });
    if (created.error && !["409", "400"].includes(String(created.error.statusCode))) {
      throw new Error("Der private Speicher konnte nicht angelegt werden.");
    }
    // Recheck after creation (also handles another request creating it first).
    result = await db.storage.getBucket(BUCKET);
  }
  if (result.error || !result.data || result.data.public !== false) {
    throw new Error("Der geschützte private Speicher ist nicht verfügbar.");
  }
  return db.storage.from(BUCKET);
}

export async function readPrivateLocation(bucket: NonNullable<Awaited<ReturnType<typeof privateLocationBucket>>>, id: string) {
  const { data, error } = await bucket.download(`${id}.json`);
  if (missing(error)) return null;
  if (error || !data) throw new Error("Die private Adresse konnte nicht geladen werden.");
  return privateBookingLocationSchema.parse(JSON.parse(await data.text()));
}

export async function writePrivateLocation(db: SupabaseClient, id: string, location: PrivateBookingLocation) {
  const bucket = await privateLocationBucket(db, true);
  if (!bucket) throw new Error("Der private Speicher ist nicht verfügbar.");
  const { error } = await bucket.upload(`${id}.json`, JSON.stringify(location), {
    contentType: "application/json", upsert: true, cacheControl: "0",
  });
  if (error) throw new Error("Die private Adresse konnte nicht gespeichert werden.");
}
