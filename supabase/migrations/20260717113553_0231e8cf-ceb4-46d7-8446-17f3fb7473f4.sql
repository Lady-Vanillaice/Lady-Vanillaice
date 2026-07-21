
ALTER TABLE public.availability_slots ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anon can view open future slots" ON public.availability_slots;
CREATE POLICY "Anon can view open future slots" ON public.availability_slots
  FOR SELECT TO anon
  USING (
    status = ANY (ARRAY['open'::slot_status, 'held'::slot_status, 'booked'::slot_status])
    AND starts_at > now()
    AND is_hidden = false
  );
