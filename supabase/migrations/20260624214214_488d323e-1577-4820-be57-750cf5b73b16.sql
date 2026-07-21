
CREATE TABLE public.admin_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_email text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX admin_access_requests_one_pending_per_user
  ON public.admin_access_requests (requester_user_id)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.admin_access_requests TO authenticated;
GRANT ALL ON public.admin_access_requests TO service_role;

ALTER TABLE public.admin_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own admin requests"
  ON public.admin_access_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_user_id);

CREATE POLICY "Users can create their own admin requests"
  ON public.admin_access_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_user_id);

CREATE POLICY "Admins can view all admin requests"
  ON public.admin_access_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can decide admin requests"
  ON public.admin_access_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_access_requests_touch_updated_at
  BEFORE UPDATE ON public.admin_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
