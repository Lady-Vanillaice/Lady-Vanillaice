ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS is_content_shoot boolean NOT NULL DEFAULT false;

GRANT SELECT (is_content_shoot) ON public.availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT ALL ON public.availability_slots TO service_role;