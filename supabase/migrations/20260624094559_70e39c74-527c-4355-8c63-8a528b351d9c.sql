
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Slot status enum
CREATE TYPE public.slot_status AS ENUM ('open', 'held', 'booked');

-- Availability slots
CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL DEFAULT 'Studio60, München',
  status public.slot_status NOT NULL DEFAULT 'open',
  internal_note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX availability_slots_starts_at_idx ON public.availability_slots (starts_at);
CREATE INDEX availability_slots_status_idx ON public.availability_slots (status);

GRANT SELECT ON public.availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT ALL ON public.availability_slots TO service_role;

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- Public: only see future open slots
CREATE POLICY "Anyone can view open future slots"
  ON public.availability_slots FOR SELECT
  TO anon, authenticated
  USING (status = 'open' AND starts_at > now());

CREATE POLICY "Admins can view all slots"
  ON public.availability_slots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert slots"
  ON public.availability_slots FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update slots"
  ON public.availability_slots FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete slots"
  ON public.availability_slots FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'declined');

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  duration TEXT,
  message TEXT NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_email_format CHECK (guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT bookings_name_len CHECK (char_length(guest_name) BETWEEN 1 AND 120),
  CONSTRAINT bookings_message_len CHECK (char_length(message) BETWEEN 1 AND 2000)
);

CREATE INDEX bookings_created_at_idx ON public.bookings (created_at DESC);
CREATE INDEX bookings_status_idx ON public.bookings (status);

GRANT INSERT ON public.bookings TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can create a booking request
CREATE POLICY "Anyone can create a booking"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read / update / delete
CREATE POLICY "Admins can view bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_availability_slots_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- When a booking is created, mark the slot as held
CREATE OR REPLACE FUNCTION public.mark_slot_held_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slot_id IS NOT NULL THEN
    UPDATE public.availability_slots
       SET status = 'held'
     WHERE id = NEW.slot_id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_hold_slot
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.mark_slot_held_on_booking();

-- When a booking changes status, update slot status accordingly
CREATE OR REPLACE FUNCTION public.sync_slot_on_booking_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slot_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'confirmed' THEN
    UPDATE public.availability_slots SET status = 'booked' WHERE id = NEW.slot_id;
  ELSIF NEW.status IN ('cancelled', 'declined') THEN
    UPDATE public.availability_slots SET status = 'open' WHERE id = NEW.slot_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_sync_slot
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_slot_on_booking_status();
