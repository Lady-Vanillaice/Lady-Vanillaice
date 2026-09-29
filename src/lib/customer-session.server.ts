import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { storedCustomerSessionSchema, type CustomerSession } from "./customer-session.schema";
const BUCKET = "private-customer-sessions";
export const customerSessionKey = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
const missing = (error: any) => error && (String(error.statusCode) === "404" || error.code === "NoSuchBucket" || error.message === "Bucket not found");
async function privateBucket(db: SupabaseClient, create = false) {
  let result = await db.storage.getBucket(BUCKET);
  if (missing(result.error)) {
    if (!create) return null;
    const made = await db.storage.createBucket(BUCKET, { public: false });
    if (made.error && !["400", "409"].includes(String(made.error.statusCode))) throw new Error("Der private CRM-Speicher konnte nicht angelegt werden.");
    result = await db.storage.getBucket(BUCKET);
  }
  if (result.error || !result.data || result.data.public !== false) throw new Error("Der geschützte CRM-Speicher ist nicht verfügbar.");
  return db.storage.from(BUCKET);
}
export async function readCustomerSessions(db: SupabaseClient, email: string) {
  const bucket = await privateBucket(db);
  if (!bucket) return [];
  const prefix = customerSessionKey(email);
  const sessions: Array<CustomerSession & { updatedAt: string }> = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await bucket.list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("Die Session-Historie konnte nicht geladen werden.");
    const files = (data ?? []).filter(file => /^[a-f\d-]{36}\.json$/i.test(file.name));
    for (let i = 0; i < files.length; i += 10) {
      const page = await Promise.all(files.slice(i, i + 10).map(async file => {
        const result = await bucket.download(`${prefix}/${file.name}`);
        if (result.error || !result.data) throw new Error("Ein Session-Eintrag konnte nicht geladen werden.");
        const entry = storedCustomerSessionSchema.parse(JSON.parse(await result.data.text()));
        if (`${entry.id}.json` !== file.name) throw new Error("Ungültiger Session-Eintrag.");
        return entry;
      }));
      sessions.push(...page);
    }
    if ((data ?? []).length < 100) break;
  }
  return sessions.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}
export async function writeCustomerSession(db: SupabaseClient, email: string, entry: CustomerSession) {
  const bucket = await privateBucket(db, true);
  if (!bucket) throw new Error("Der CRM-Speicher ist nicht verfügbar.");
  const saved = { ...entry, updatedAt: new Date().toISOString() };
  const { error } = await bucket.upload(`${customerSessionKey(email)}/${entry.id}.json`, JSON.stringify(saved), {
    contentType: "application/json", cacheControl: "0", upsert: true,
  });
  if (error) throw new Error("Die Session konnte nicht gespeichert werden.");
  return saved;
}
