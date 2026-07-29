-- Correct the already-created manual booking for Thursday, 30 July 2026.
-- It was entered as 23:00–01:00 Munich time before admin inputs were pinned
-- to Europe/Berlin, and was consequently stored/displayed as 20:00–22:00.
--
-- The match is deliberately narrow: confirmed two-hour manual bookings with
-- the internal placeholder address and the affected local start time only.

DO $$
DECLARE
  target record;
  left_open record;
  right_open record;
  corrected_start timestamptz := '2026-07-30 23:00:00 Europe/Berlin'::timestamptz;
  corrected_end timestamptz := '2026-07-31 01:00:00 Europe/Berlin'::timestamptz;
BEGIN
  FOR target IN
    SELECT
      booking.id AS booking_id,
      slot.id AS slot_id,
      slot.starts_at AS old_start,
      slot.ends_at AS old_end,
      slot.location,
      slot.buffer_minutes,
      slot.is_duo,
      slot.is_content_shoot,
      slot.duo_partner
    FROM public.bookings AS booking
    JOIN public.availability_slots AS slot ON slot.id = booking.slot_id
    WHERE booking.status = 'confirmed'
      AND booking.duration_minutes = 120
      AND booking.guest_email LIKE 'manuell+%@intern.local'
      AND booking.message LIKE '%Manuell durch Admin eingetragen.%'
      AND (booking.requested_start AT TIME ZONE 'Europe/Berlin')::date = DATE '2026-07-30'
      AND (booking.requested_start AT TIME ZONE 'Europe/Berlin')::time = TIME '20:00'
  LOOP
    -- Restore the availability interval that the wrongly positioned manual
    -- booking may have shortened or split.
    SELECT id, ends_at
      INTO left_open
      FROM public.availability_slots
     WHERE status = 'open'
       AND location = target.location
       AND ends_at = target.old_start
     ORDER BY starts_at DESC
     LIMIT 1;

    SELECT id, starts_at, ends_at
      INTO right_open
      FROM public.availability_slots
     WHERE status = 'open'
       AND location = target.location
       AND starts_at = target.old_end
     ORDER BY ends_at
     LIMIT 1;

    IF left_open.id IS NOT NULL AND right_open.id IS NOT NULL
       AND left_open.id <> right_open.id THEN
      UPDATE public.availability_slots
         SET ends_at = right_open.ends_at
       WHERE id = left_open.id;
      DELETE FROM public.availability_slots WHERE id = right_open.id;
    ELSIF left_open.id IS NOT NULL THEN
      UPDATE public.availability_slots
         SET ends_at = target.old_end
       WHERE id = left_open.id;
    ELSIF right_open.id IS NOT NULL THEN
      UPDATE public.availability_slots
         SET starts_at = target.old_start
       WHERE id = right_open.id;
    ELSIF NOT EXISTS (
      SELECT 1
        FROM public.availability_slots
       WHERE status = 'open'
         AND location = target.location
         AND starts_at <= target.old_start
         AND ends_at >= target.old_end
    ) THEN
      INSERT INTO public.availability_slots (
        starts_at,
        ends_at,
        location,
        status,
        buffer_minutes,
        is_duo,
        is_content_shoot,
        duo_partner,
        is_hidden
      ) VALUES (
        target.old_start,
        target.old_end,
        target.location,
        'open',
        COALESCE(target.buffer_minutes, 45),
        COALESCE(target.is_duo, false),
        COALESCE(target.is_content_shoot, false),
        target.duo_partner,
        false
      );
    END IF;

    UPDATE public.availability_slots
       SET starts_at = corrected_start,
           ends_at = corrected_end
     WHERE id = target.slot_id;

    UPDATE public.bookings
       SET requested_start = corrected_start,
           duration_minutes = 120,
           updated_at = now()
     WHERE id = target.booking_id;
  END LOOP;
END
$$;
