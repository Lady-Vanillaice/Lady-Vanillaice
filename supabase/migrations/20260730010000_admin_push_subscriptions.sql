CREATE TABLE IF NOT EXISTS public.admin_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_push_subscriptions_user_id_idx
  ON public.admin_push_subscriptions(user_id);

