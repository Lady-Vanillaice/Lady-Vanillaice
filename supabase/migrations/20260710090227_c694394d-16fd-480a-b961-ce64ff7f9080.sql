ALTER TABLE public.availability_slots ALTER COLUMN buffer_minutes SET DEFAULT 45;
UPDATE public.availability_slots SET buffer_minutes = 45 WHERE buffer_minutes = 30;