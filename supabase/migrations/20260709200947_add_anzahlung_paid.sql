-- Track whether the deposit has actually been received.
-- This drives a second confirmation email once the rest is still to be paid in cash.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS anzahlung_paid BOOLEAN NOT NULL DEFAULT false;
