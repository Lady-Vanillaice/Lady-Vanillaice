-- July 31 is one continuous public availability window from 10:00 until
-- 01:00 the following day. Old fragments remain in place for booking foreign
-- keys, but are hidden and must not create public grey gaps.
DO $$
DECLARE
  canonical_slot_id uuid;
BEGIN
  SELECT id
    INTO canonical_slot_id
    FROM public.availability_slots
   WHERE starts_at < '2026-08-01 02:00:00 Europe/Berlin'::timestamptz
     AND ends_at > '2026-07-31 00:00:00 Europe/Berlin'::timestamptz
   ORDER BY
     CASE WHEN status = 'open' AND NOT is_hidden THEN 0 ELSE 1 END,
     starts_at ASC
   LIMIT 1;

  IF canonical_slot_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.availability_slots
     SET starts_at = '2026-07-31 10:00:00 Europe/Berlin'::timestamptz,
         ends_at = '2026-08-01 01:00:00 Europe/Berlin'::timestamptz,
         status = 'open',
         is_hidden = false
   WHERE id = canonical_slot_id;

  UPDATE public.availability_slots
     SET is_hidden = true
   WHERE id <> canonical_slot_id
     AND starts_at < '2026-08-01 02:00:00 Europe/Berlin'::timestamptz
     AND ends_at > '2026-07-31 00:00:00 Europe/Berlin'::timestamptz;
END
$$;
