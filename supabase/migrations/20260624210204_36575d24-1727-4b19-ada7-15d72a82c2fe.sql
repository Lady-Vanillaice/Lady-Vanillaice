GRANT SELECT ON public.availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT ALL ON public.availability_slots TO service_role;