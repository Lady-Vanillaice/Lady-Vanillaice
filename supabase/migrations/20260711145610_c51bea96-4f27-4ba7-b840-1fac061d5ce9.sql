ALTER TABLE public.bookings ADD COLUMN guest_phone TEXT;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_phone_len CHECK (guest_phone IS NULL OR char_length(guest_phone) BETWEEN 6 AND 40);