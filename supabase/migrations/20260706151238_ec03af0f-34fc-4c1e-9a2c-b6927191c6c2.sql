
-- Hide internal_note and created_by from anonymous visitors via column-level grants
REVOKE SELECT ON public.availability_slots FROM anon;
GRANT SELECT (id, starts_at, ends_at, location, status, buffer_minutes, is_duo, is_content_shoot, duo_partner, created_at, updated_at) ON public.availability_slots TO anon;

-- Restrict has_role EXECUTE to authenticated (used by RLS policies); revoke from PUBLIC/anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
