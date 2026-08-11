from pathlib import Path

path = Path('src/lib/booking.functions.ts')
text = path.read_text()
old = '''      if (!containingSlot) {
        throw new Error("Diese Uhrzeit passt nicht in ein sichtbares freies Zeitfenster. Bitte lege zuerst im Kalender ein passendes Zeitfenster an oder wähle eine andere Uhrzeit/Dauer.");
      }

      const slotIds = (daySlots ?? []).map((slot) => slot.id);
      const { data: blockers, error: blockersErr } = await supabaseAdmin
        .from("bookings")
        .select("id, requested_start, duration_minutes, status, updated_at")
        .in("slot_id", slotIds)
        .neq("id", data.id)
        .in("status", ["pending", "waiting_deposit", "confirmed"])
        .not("requested_start", "is", null)
        .not("duration_minutes", "is", null);
      if (blockersErr) throw new Error(blockersErr.message);

      const bufferMs = (containingSlot.buffer_minutes ?? 30) * 60_000;
'''
new = '''      // Admin-Ueberschreibungen duerfen auch ausserhalb eines sichtbaren freien
      // Zeitfensters liegen. Ein passendes offenes Zeitfenster wird weiterhin
      // verwendet, wenn eines existiert; es ist aber keine Voraussetzung mehr.
      const { data: blockers, error: blockersErr } = await supabaseAdmin
        .from("bookings")
        .select("id, requested_start, duration_minutes, status, updated_at")
        .neq("id", data.id)
        .in("status", ["pending", "waiting_deposit", "confirmed"])
        .not("requested_start", "is", null)
        .not("duration_minutes", "is", null);
      if (blockersErr) throw new Error(blockersErr.message);

      const bufferMs = (containingSlot?.buffer_minutes ?? currentSlot?.buffer_minutes ?? 30) * 60_000;
'''
if old not in text:
    raise SystemExit('schedule override anchor not found')
text = text.replace(old, new, 1)
old2 = '''      if (booking.slot_id !== containingSlot.id) {
        resolvedSlotId = containingSlot.id;
      }
'''
new2 = '''      if (containingSlot && booking.slot_id !== containingSlot.id) {
        resolvedSlotId = containingSlot.id;
      }
'''
if old2 not in text:
    raise SystemExit('schedule slot resolution anchor not found')
path.write_text(text.replace(old2, new2, 1))
