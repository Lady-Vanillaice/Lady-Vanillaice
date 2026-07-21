ALTER TABLE public.availability_slots ALTER COLUMN buffer_minutes SET DEFAULT 30;
UPDATE public.availability_slots SET buffer_minutes = 30 WHERE buffer_minutes = 45;