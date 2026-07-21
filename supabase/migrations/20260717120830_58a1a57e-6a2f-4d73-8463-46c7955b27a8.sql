DROP POLICY IF EXISTS "Anyone can request a booking for an open slot" ON public.bookings;

CREATE POLICY "Anyone can request a booking for an open slot"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (
    slot_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.availability_slots s
      WHERE s.id = bookings.slot_id
        AND s.status = 'open'::slot_status
        AND s.starts_at > now()
    )
  )
  AND status IN ('pending', 'open')
  AND (bar IS NULL OR bar = 0)
  AND (anzahlung IS NULL OR anzahlung = 0)
  AND (anzahlung_paid IS NULL OR anzahlung_paid = false)
  AND admin_note IS NULL
  AND confirmation_note IS NULL
);