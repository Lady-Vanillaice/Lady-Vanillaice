
-- 1) availability_slots: drop broad public policy, replace with anon-only, column-restricted
DROP POLICY IF EXISTS "Anyone can view open future slots" ON public.availability_slots;
DROP POLICY IF EXISTS "Anon can view open future slots" ON public.availability_slots;
DROP POLICY IF EXISTS "Authenticated can view open future slots" ON public.availability_slots;

CREATE POLICY "Anon can view open future slots"
  ON public.availability_slots
  FOR SELECT
  TO anon
  USING (status = 'open'::slot_status AND starts_at > now());

REVOKE SELECT ON public.availability_slots FROM anon;
GRANT SELECT (id, starts_at, ends_at, location, status, created_at, updated_at, created_by)
  ON public.availability_slots TO anon;
-- authenticated retains full SELECT; only admins satisfy RLS policy "Admins can view all slots"

-- 2) user_roles: explicit restrictive INSERT/UPDATE/DELETE policies (admin-only)
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Revoke EXECUTE on SECURITY DEFINER email helpers from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 4) Pin search_path on email helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
