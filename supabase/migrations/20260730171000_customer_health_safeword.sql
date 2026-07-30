ALTER TABLE public.customer_notes
  ADD COLUMN IF NOT EXISTS gesundheit TEXT,
  ADD COLUMN IF NOT EXISTS safeword TEXT;
