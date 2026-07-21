
-- Restrict has_role execution
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;
-- Note: RLS policies that call has_role still work because policy evaluation runs
-- with the table owner's privileges (postgres), which retains EXECUTE.

-- Tighten bookings INSERT: must reference an open future slot (if slot_id provided)
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.bookings;

CREATE POLICY "Anyone can request a booking for an open slot"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    slot_id IS NULL OR EXISTS (
      SELECT 1 FROM public.availability_slots s
      WHERE s.id = slot_id AND s.status = 'open' AND s.starts_at > now()
    )
  );
