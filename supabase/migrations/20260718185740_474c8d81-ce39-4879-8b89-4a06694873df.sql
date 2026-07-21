DROP POLICY IF EXISTS "Anyone can request a booking for an open slot" ON public.bookings;

CREATE POLICY "Anyone can request a booking for an open slot"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  ((slot_id IS NULL) OR (EXISTS (
    SELECT 1 FROM public.availability_slots s
    WHERE s.id = bookings.slot_id
      AND s.status = 'open'::slot_status
      AND s.starts_at > now()
  )))
  AND status = 'pending'::booking_status
  AND (bar IS NULL OR bar = 0)
  AND (anzahlung IS NULL OR anzahlung = 0)
  AND (anzahlung_paid IS NULL OR anzahlung_paid = false)
  AND anzahlung_method IS NULL
  AND admin_note IS NULL
  AND confirmation_note IS NULL
  AND char_length(guest_name) BETWEEN 1 AND 120
  AND char_length(guest_email) BETWEEN 3 AND 255
  AND char_length(message) BETWEEN 1 AND 2000
  AND (duration IS NULL OR char_length(duration) <= 80)
  AND (guest_phone IS NULL OR char_length(guest_phone) BETWEEN 6 AND 40)
);

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;