from pathlib import Path

path = Path('src/lib/booking.functions.ts')
text = path.read_text()
old = '''    const { data: blocking, error: blockingErr } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, status, location")
      .neq("status", "open")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString());
    if (blockingErr) throw new Error(blockingErr.message);
    if (blocking.length > 0) {
      throw new Error(
        "In diesem Zeitraum existiert bereits ein Termin. Bitte zuerst löschen oder andere Zeit wählen.",
      );
    }
'''
new = '''    const { data: blocking, error: blockingErr } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, status, location, is_content_shoot")
      .neq("status", "open")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString());
    if (blockingErr) throw new Error(blockingErr.message);

    // Erlaubt genau eine parallele Kombination aus normaler Session + Content.
    // Zwei normale Termine oder zwei Content-Termine zur selben Zeit bleiben gesperrt.
    const newIsContentAppointment = data.booking_type === "content" || data.booking_type === "custom_content";
    const incompatibleBlocking = (blocking ?? []).filter(
      (slot) => Boolean(slot.is_content_shoot) === newIsContentAppointment,
    );
    if (incompatibleBlocking.length > 0) {
      throw new Error(
        newIsContentAppointment
          ? "In diesem Zeitraum existiert bereits ein anderer Content-Termin."
          : "In diesem Zeitraum existiert bereits ein anderer normaler Termin.",
      );
    }
'''
if old not in text:
    raise SystemExit('parallel booking anchor not found')
path.write_text(text.replace(old, new, 1))
