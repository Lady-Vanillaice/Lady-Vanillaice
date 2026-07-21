CREATE TABLE public.photoshoot_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  social_media TEXT,
  shoot_type TEXT NOT NULL,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('TFP', 'Pay', 'Beides')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'interested', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.photoshoot_requests TO anon;
GRANT INSERT ON public.photoshoot_requests TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.photoshoot_requests TO authenticated;
GRANT ALL ON public.photoshoot_requests TO service_role;

ALTER TABLE public.photoshoot_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a photoshoot request"
  ON public.photoshoot_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all photoshoot requests"
  ON public.photoshoot_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update photoshoot requests"
  ON public.photoshoot_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete photoshoot requests"
  ON public.photoshoot_requests
  FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_photoshoot_requests_updated_at
  BEFORE UPDATE ON public.photoshoot_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();