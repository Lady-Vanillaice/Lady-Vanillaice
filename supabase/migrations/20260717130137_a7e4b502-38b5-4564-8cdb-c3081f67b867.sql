GRANT SELECT (is_hidden) ON public.availability_slots TO anon;
GRANT SELECT (is_hidden) ON public.availability_slots TO authenticated;

DROP POLICY IF EXISTS "Anon can view open future slots" ON public.availability_slots;
CREATE POLICY "Anon can view open future slots"
ON public.availability_slots
FOR SELECT
TO anon
USING (
  status = 'open'::slot_status
  AND ends_at > now()
  AND is_hidden = false
);