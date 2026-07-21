
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS requested_start timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 30;
