GRANT SELECT ON TABLE public.availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.availability_slots TO authenticated;
GRANT ALL ON TABLE public.availability_slots TO service_role;

NOTIFY pgrst, 'reload schema';