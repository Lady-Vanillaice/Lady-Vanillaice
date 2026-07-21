GRANT SELECT, INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT SELECT ON public.availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT ALL ON public.availability_slots TO service_role;

-- Allow the inserting anon/authenticated user to read back the row they just created
CREATE POLICY "Read own pending booking by id"
  ON public.bookings FOR SELECT
  TO anon, authenticated
  USING (false);
-- (kept restrictive; we'll use service-role insert in code instead)