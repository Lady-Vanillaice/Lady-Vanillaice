// Hält versteckte, gebuchte Termin-Slots (z. B. aus „Termin eintragen“) mit der
// tatsächlichen Buchungszeit synchron. Wird ein Termin gekürzt oder verschoben,
// gibt die frei gewordene Zeit wieder im öffentlichen Kalender frei.

type Db = any;

function isActiveBlockingBooking(booking: { status?: string | null; updated_at?: string | null }) {
  if (booking.status !== "waiting_deposit") return true;
  if (!booking.updated_at) return true;
  return new Date(booking.updated_at).getTime() + 24 * 60 * 60_000 > Date.now();
}

// Verlängert ein direkt angrenzendes offenes, sichtbares Zeitfenster um den frei
// gewordenen Zeitraum. Ohne angrenzendes Zeitfenster bleibt die Zeit gesperrt –
// so wird nie Zeit veröffentlicht, die vorher nicht im Kalender freigegeben war.
export async function releaseRangeToPublicCalendar(db: Db, startMs: number, endMs: number) {
  if (endMs <= startMs) return;
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();
  const { data: neighbours, error } = await db
    .from("availability_slots")
    .select("id, starts_at, ends_at")
    .eq("status", "open")
    .eq("is_hidden", false)
    .lte("starts_at", endIso)
    .gte("ends_at", startIso);
  if (error) throw new Error(error.message);
  const rows = (neighbours ?? []) as Array<{ id: string; starts_at: string; ends_at: string }>;
  const ms = (value: string) => new Date(value).getTime();
  if (rows.some((row) => ms(row.starts_at) <= startMs && ms(row.ends_at) >= endMs)) return;
  const left = rows.find((row) => ms(row.ends_at) === startMs);
  const right = rows.find((row) => ms(row.starts_at) === endMs);
  if (left) {
    const { error: updErr } = await db.from("availability_slots").update({ ends_at: endIso }).eq("id", left.id);
    if (updErr) throw new Error(updErr.message);
  } else if (right) {
    const { error: updErr } = await db.from("availability_slots").update({ starts_at: startIso }).eq("id", right.id);
    if (updErr) throw new Error(updErr.message);
  }
}

// Gibt die Teile von [oldStart, oldEnd] frei, die nicht mehr in [newStart, newEnd] liegen.
export async function releaseFreedParts(db: Db, oldStart: number, oldEnd: number, newStart: number, newEnd: number) {
  if (newEnd <= oldStart || newStart >= oldEnd) {
    await releaseRangeToPublicCalendar(db, oldStart, oldEnd);
    return;
  }
  await releaseRangeToPublicCalendar(db, oldStart, Math.min(oldEnd, newStart));
  await releaseRangeToPublicCalendar(db, Math.max(oldStart, newEnd), oldEnd);
}

// Passt alle kommenden versteckten, gebuchten Slots an ihre aktiven Buchungen an.
export async function syncBookedSlotsToBookings(db: Db) {
  const { data: slots, error } = await db
    .from("availability_slots")
    .select("id, starts_at, ends_at")
    .eq("status", "booked")
    .eq("is_hidden", true)
    .gt("ends_at", new Date().toISOString())
    .limit(500);
  if (error) throw new Error(error.message);
  const slotRows = (slots ?? []) as Array<{ id: string; starts_at: string; ends_at: string }>;
  if (slotRows.length === 0) return 0;

  const { data: bookings, error: bookingsErr } = await db
    .from("bookings")
    .select("slot_id, requested_start, duration_minutes, status, updated_at")
    .in("slot_id", slotRows.map((slot) => slot.id))
    .in("status", ["pending", "waiting_deposit", "confirmed"])
    .not("requested_start", "is", null)
    .not("duration_minutes", "is", null);
  if (bookingsErr) throw new Error(bookingsErr.message);

  const ranges = new Map<string, { s: number; e: number }>();
  for (const booking of (bookings ?? []) as Array<{ slot_id: string | null; requested_start: string | null; duration_minutes: number | null; status: string | null; updated_at: string | null }>) {
    if (!booking.slot_id || !booking.requested_start || !booking.duration_minutes) continue;
    if (!isActiveBlockingBooking(booking)) continue;
    const s = new Date(booking.requested_start).getTime();
    const e = s + booking.duration_minutes * 60_000;
    const current = ranges.get(booking.slot_id);
    ranges.set(booking.slot_id, current ? { s: Math.min(current.s, s), e: Math.max(current.e, e) } : { s, e });
  }

  let changed = 0;
  for (const slot of slotRows) {
    const range = ranges.get(slot.id);
    if (!range) continue; // keine aktive Buchung: Slot unverändert lassen
    const oldStart = new Date(slot.starts_at).getTime();
    const oldEnd = new Date(slot.ends_at).getTime();
    if (oldStart === range.s && oldEnd === range.e) continue;
    const { data: updated, error: updErr } = await db
      .from("availability_slots")
      .update({ starts_at: new Date(range.s).toISOString(), ends_at: new Date(range.e).toISOString() })
      .eq("id", slot.id)
      .eq("starts_at", slot.starts_at)
      .eq("ends_at", slot.ends_at)
      .select("id");
    if (updErr) throw new Error(updErr.message);
    if (!updated?.length) continue; // parallel schon angepasst
    await releaseFreedParts(db, oldStart, oldEnd, range.s, range.e);
    changed += 1;
  }
  return changed;
}
