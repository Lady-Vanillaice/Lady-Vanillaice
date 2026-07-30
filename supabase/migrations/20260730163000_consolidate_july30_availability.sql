-- The corrected overnight booking previously split the single public
-- availability window for 30 July into multiple visible rows. Keep the
-- earliest open row as the single public window, extend it across the full
-- day range, and hide the leftover open fragments. The confirmed booking
-- remains the authoritative blocked range inside this window.
DO $$
DECLARE
  canonical_slot_id uuid;
  window_start timestamptz;
  window_end timestamptz;
BEGIN
  SELECT id
    INTO canonical_slot_id
    FROM public.availability_slots
   WHERE status = 'open'
     AND starts_at < '2026-07-31 02:00:00 Europe/Berlin'::timestamptz
     AND ends_at > '2026-07-30 00:00:00 Europe/Berlin'::timestamptz
   ORDER BY starts_at ASC
   LIMIT 1;

  IF canonical_slot_id IS NULL THEN
    RETURN;
  END IF;

  SELECT min(starts_at), max(ends_at)
    INTO window_start, window_end
    FROM public.availability_slots
   WHERE starts_at < '2026-07-31 02:00:00 Europe/Berlin'::timestamptz
     AND ends_at > '2026-07-30 00:00:00 Europe/Berlin'::timestamptz;

  UPDATE public.availability_slots
     SET starts_at = window_start,
         ends_at = window_end,
         is_hidden = false
   WHERE id = canonical_slot_id;

  UPDATE public.availability_slots
     SET is_hidden = true
   WHERE status = 'open'
     AND id <> canonical_slot_id
     AND starts_at < '2026-07-31 02:00:00 Europe/Berlin'::timestamptz
     AND ends_at > '2026-07-30 00:00:00 Europe/Berlin'::timestamptz;
END
$$;
