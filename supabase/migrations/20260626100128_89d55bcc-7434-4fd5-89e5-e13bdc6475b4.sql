DROP POLICY IF EXISTS "Anon can view open future slots" ON public.availability_slots;

CREATE POLICY "Anon can view open future slots"
  ON public.availability_slots
  FOR SELECT
  TO anon
  USING (status IN ('open', 'held', 'booked') AND starts_at > now());