
CREATE OR REPLACE FUNCTION public.list_slot_busy_ranges(_slot_id uuid)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.requested_start AS starts_at,
    b.requested_start + make_interval(mins => b.duration_minutes) AS ends_at
  FROM public.bookings b
  WHERE b.slot_id = _slot_id
    AND b.requested_start IS NOT NULL
    AND b.duration_minutes IS NOT NULL
    AND b.status IN ('pending', 'confirmed');
$$;

GRANT EXECUTE ON FUNCTION public.list_slot_busy_ranges(uuid) TO anon, authenticated;
