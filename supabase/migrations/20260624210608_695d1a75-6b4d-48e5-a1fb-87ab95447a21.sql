REVOKE EXECUTE ON FUNCTION public.list_slot_busy_ranges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_slot_busy_ranges(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_slot_busy_ranges(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.list_slot_busy_ranges(uuid) TO service_role;
NOTIFY pgrst, 'reload schema';