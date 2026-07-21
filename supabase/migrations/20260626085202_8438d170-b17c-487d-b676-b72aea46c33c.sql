-- Restrict has_role: only service_role may execute. RLS policies that reference it
-- continue to work because policy evaluation runs with table-owner privileges.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Hide internal_note from anonymous users by switching anon to column-level SELECT.
REVOKE SELECT ON public.availability_slots FROM anon;
GRANT SELECT (
  id, starts_at, ends_at, location, status, buffer_minutes,
  is_duo, is_content_shoot, duo_partner, created_at, updated_at
) ON public.availability_slots TO anon;

NOTIFY pgrst, 'reload schema';