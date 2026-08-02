CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  confirmation_token TEXT NOT NULL UNIQUE,
  consent_source TEXT NOT NULL,
  consent_requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.newsletter_subscribers TO service_role;
CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx ON public.newsletter_subscribers(status);

DO $$ BEGIN
  CREATE POLICY "Service role manages newsletter subscribers"
    ON public.newsletter_subscribers FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
