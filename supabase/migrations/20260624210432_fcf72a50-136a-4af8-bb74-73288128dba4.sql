GRANT SELECT (buffer_minutes) ON public.availability_slots TO anon;
GRANT SELECT ON public.availability_slots TO anon;
NOTIFY pgrst, 'reload schema';