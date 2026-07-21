
CREATE TYPE public.testimonial_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pseudonym TEXT NOT NULL,
  content TEXT NOT NULL,
  rating SMALLINT,
  status public.testimonial_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT testimonials_rating_range CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  CONSTRAINT testimonials_pseudonym_len CHECK (char_length(pseudonym) BETWEEN 2 AND 60),
  CONSTRAINT testimonials_content_len CHECK (char_length(content) BETWEEN 20 AND 2000)
);

GRANT SELECT, INSERT ON public.testimonials TO anon;
GRANT SELECT, INSERT ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read only approved testimonials
CREATE POLICY "Anyone can view approved testimonials"
  ON public.testimonials FOR SELECT
  USING (status = 'approved');

-- Admins can view all
CREATE POLICY "Admins can view all testimonials"
  ON public.testimonials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can submit a new testimonial; it starts as pending (enforced by server function)
CREATE POLICY "Anyone can submit testimonials"
  ON public.testimonials FOR INSERT
  WITH CHECK (status = 'pending');

-- Admins can update (approve / reject / add note)
CREATE POLICY "Admins can update testimonials"
  ON public.testimonials FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete testimonials"
  ON public.testimonials FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX testimonials_status_created_idx ON public.testimonials (status, created_at DESC);
