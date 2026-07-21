
DROP POLICY IF EXISTS "Authenticated users can view all photoshoot requests" ON public.photoshoot_requests;
DROP POLICY IF EXISTS "Authenticated users can update photoshoot requests" ON public.photoshoot_requests;
DROP POLICY IF EXISTS "Authenticated users can delete photoshoot requests" ON public.photoshoot_requests;
DROP POLICY IF EXISTS "Anyone can submit a photoshoot request" ON public.photoshoot_requests;

CREATE POLICY "Admins can view photoshoot requests" ON public.photoshoot_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update photoshoot requests" ON public.photoshoot_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete photoshoot requests" ON public.photoshoot_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can submit a photoshoot request" ON public.photoshoot_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

REVOKE SELECT ON public.availability_slots FROM anon;
GRANT SELECT (id, starts_at, ends_at, location, buffer_minutes, is_duo, is_content_shoot, duo_partner, status, created_at, updated_at, created_by)
  ON public.availability_slots TO anon;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_slot_busy_ranges(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_slot_busy_ranges(uuid) TO service_role;
