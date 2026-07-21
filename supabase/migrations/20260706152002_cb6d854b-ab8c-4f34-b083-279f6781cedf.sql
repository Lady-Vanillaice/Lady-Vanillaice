
-- Drop the anon SELECT policy on the base table so anon can no longer query it directly
DROP POLICY IF EXISTS "Anon can view open future slots" ON public.availability_slots;

-- Revoke column-level anon grants (no direct base-table access at all)
REVOKE ALL ON public.availability_slots FROM anon;

-- Public read-only view (owned by postgres, bypasses RLS) exposing only safe columns and rows
CREATE OR REPLACE VIEW public.availability_slots_public
WITH (security_invoker = off) AS
SELECT
  id,
  starts_at,
  ends_at,
  location,
  status,
  buffer_minutes,
  is_duo,
  is_content_shoot,
  duo_partner,
  created_at,
  updated_at
FROM public.availability_slots
WHERE status IN ('open', 'held', 'booked')
  AND ends_at > now();

GRANT SELECT ON public.availability_slots_public TO anon, authenticated;
