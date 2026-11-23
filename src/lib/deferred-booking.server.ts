// „Anzahlung fehlt noch“: Ein extern eingetragener Termin wird gespeichert,
// blockiert den Kalender aber erst, wenn die Anzahlung eingegangen ist.
// Bis dahin liegen die Kalenderdaten (Zeit, Ort, Duo …) privat im geschützten
// Speicher – nur die admin-geprüften Server-Funktionen lesen sie.
import { privateLocationBucket } from "./private-booking-location.server";

type Db = any;

export type DeferredSlot = {
  starts_at: string;
  ends_at: string;
  location: string;
  booking_type: "single" | "duo" | "content" | "custom_content";
  duo_partner: string | null;
  internal_note: string | null;
};

const key = (bookingId: string) => `deferred-slot-${bookingId}.json`;

/** Ein Termin wartet auf die Anzahlung und blockiert noch nichts. */
export function isDeferredBooking(booking: { status?: string | null; slot_id?: string | null }) {
  return booking.status === "waiting_deposit" && !booking.slot_id;
}

export async function saveDeferredSlot(db: Db, bookingId: string, slot: DeferredSlot) {
  const bucket = await privateLocationBucket(db, true);
  if (!bucket) throw new Error("Der private Speicher ist nicht verfügbar.");
  const { error } = await bucket.upload(key(bookingId), JSON.stringify(slot), {
    contentType: "application/json", upsert: true, cacheControl: "0",
  });
  if (error) throw new Error("Die Termindaten konnten nicht vorgemerkt werden.");
}

export async function readDeferredSlot(db: Db, bookingId: string): Promise<DeferredSlot | null> {
  const bucket = await privateLocationBucket(db);
  if (!bucket) return null;
  const { data, error } = await bucket.download(key(bookingId));
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as DeferredSlot;
  } catch {
    return null;
  }
}

async function deleteDeferredSlot(db: Db, bookingId: string) {
  const bucket = await privateLocationBucket(db);
  if (!bucket) return;
  await bucket.remove([key(bookingId)]);
}

/**
 * Anzahlung eingegangen: Termin jetzt im Kalender blockieren – genauso wie ein
 * sofort eingetragener externer Termin (offene Zeitfenster werden zugeschnitten,
 * ein versteckter, gebuchter Slot wird angelegt und mit der Buchung verknüpft).
 */
export async function activateDeferredBooking(db: Db, bookingId: string, adminUserId: string | null) {
  const { data: booking, error: bookingErr } = await db
    .from("bookings")
    .select("id, status, slot_id, requested_start, duration_minutes, studio_override")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingErr) throw new Error(bookingErr.message);
  if (!booking || !isDeferredBooking(booking)) return false;

  const stored = await readDeferredSlot(db, bookingId);
  const startsAt = new Date(booking.requested_start ?? stored?.starts_at ?? "");
  const durationMs = booking.duration_minutes
    ? booking.duration_minutes * 60_000
    : stored ? new Date(stored.ends_at).getTime() - new Date(stored.starts_at).getTime() : 0;
  if (!Number.isFinite(startsAt.getTime()) || durationMs <= 0) {
    throw new Error("Für diesen Termin fehlen Datum oder Dauer. Bitte zuerst eintragen.");
  }
  const endsAt = new Date(startsAt.getTime() + durationMs);
  const bookingType = stored?.booking_type ?? "single";
  const isContent = bookingType === "content" || bookingType === "custom_content";

  // Nur echte belegte Termine sperren; offene Zeitfenster werden unten zugeschnitten.
  const { data: blocking, error: blockingErr } = await db
    .from("availability_slots")
    .select("id, is_content_shoot")
    .neq("status", "open")
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());
  if (blockingErr) throw new Error(blockingErr.message);
  if ((blocking ?? []).some((slot: { is_content_shoot: boolean | null }) => Boolean(slot.is_content_shoot) === isContent)) {
    throw new Error("In diesem Zeitraum ist inzwischen ein anderer Termin eingetragen. Bitte zuerst die Uhrzeit des Termins ändern.");
  }

  const { data: openOverlaps, error: openErr } = await db
    .from("availability_slots")
    .select("id, starts_at, ends_at, location, buffer_minutes, is_duo, is_content_shoot, duo_partner, is_hidden")
    .eq("status", "open")
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());
  if (openErr) throw new Error(openErr.message);

  for (const s of openOverlaps ?? []) {
    const sStart = new Date(s.starts_at);
    const sEnd = new Date(s.ends_at);
    const leftKeep = sStart < startsAt;
    const rightKeep = sEnd > endsAt;
    if (leftKeep && rightKeep) {
      const { error: updErr } = await db.from("availability_slots").update({ ends_at: startsAt.toISOString() }).eq("id", s.id);
      if (updErr) throw new Error(updErr.message);
      const { error: insErr } = await db.from("availability_slots").insert({
        starts_at: endsAt.toISOString(),
        ends_at: s.ends_at,
        location: s.location,
        status: "open",
        buffer_minutes: s.buffer_minutes ?? 30,
        is_duo: s.is_duo ?? false,
        is_content_shoot: s.is_content_shoot ?? false,
        duo_partner: s.is_duo ? s.duo_partner ?? null : null,
        is_hidden: s.is_hidden ?? false,
      });
      if (insErr) throw new Error(insErr.message);
    } else if (leftKeep) {
      const { error: updErr } = await db.from("availability_slots").update({ ends_at: startsAt.toISOString() }).eq("id", s.id);
      if (updErr) throw new Error(updErr.message);
    } else if (rightKeep) {
      const { error: updErr } = await db.from("availability_slots").update({ starts_at: endsAt.toISOString() }).eq("id", s.id);
      if (updErr) throw new Error(updErr.message);
    } else {
      const { error: delErr } = await db.from("availability_slots").delete().eq("id", s.id);
      if (delErr) throw new Error(delErr.message);
    }
  }

  const { data: slot, error: slotErr } = await db
    .from("availability_slots")
    .insert({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      location: booking.studio_override?.trim() || stored?.location || "Individueller Termin",
      status: "booked",
      is_hidden: true,
      is_duo: bookingType === "duo" || Boolean(stored?.duo_partner),
      is_content_shoot: isContent,
      duo_partner: stored?.duo_partner ?? null,
    })
    .select("id")
    .single();
  if (slotErr || !slot) throw new Error(slotErr?.message ?? "Termin konnte nicht im Kalender blockiert werden.");

  if (stored?.internal_note || adminUserId) {
    await db.from("availability_slot_admin_meta").insert({
      slot_id: slot.id,
      internal_note: stored?.internal_note ?? null,
      created_by: adminUserId,
    });
  }

  const { error: linkErr } = await db
    .from("bookings")
    .update({ slot_id: slot.id, status: "confirmed" })
    .eq("id", bookingId);
  if (linkErr) {
    await db.from("availability_slots").delete().eq("id", slot.id);
    throw new Error(linkErr.message);
  }

  await deleteDeferredSlot(db, bookingId);
  return true;
}
