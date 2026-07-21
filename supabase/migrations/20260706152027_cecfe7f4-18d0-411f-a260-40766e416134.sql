
-- Remove the interim view (base-table split makes it unnecessary)
DROP VIEW IF EXISTS public.availability_slots_public;

-- 1. Create admin-only sidecar for private slot metadata
CREATE TABLE public.availability_slot_admin_meta (
  slot_id uuid PRIMARY KEY REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  internal_note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slot_admin_meta TO authenticated;
GRANT ALL ON public.availability_slot_admin_meta TO service_role;

ALTER TABLE public.availability_slot_admin_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read slot admin meta"
ON public.availability_slot_admin_meta
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert slot admin meta"
ON public.availability_slot_admin_meta
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update slot admin meta"
ON public.availability_slot_admin_meta
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete slot admin meta"
ON public.availability_slot_admin_meta
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_availability_slot_admin_meta_updated
BEFORE UPDATE ON public.availability_slot_admin_meta
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Backfill from existing columns
INSERT INTO public.availability_slot_admin_meta (slot_id, internal_note, created_by, created_at)
SELECT id, internal_note, created_by, created_at
FROM public.availability_slots
WHERE internal_note IS NOT NULL OR created_by IS NOT NULL;

-- 3. Drop the sensitive columns from the base table
ALTER TABLE public.availability_slots DROP COLUMN internal_note;
ALTER TABLE public.availability_slots DROP COLUMN created_by;

-- 4. Restore anon SELECT on the (now sanitized) base table
GRANT SELECT ON public.availability_slots TO anon;

CREATE POLICY "Anon can view open future slots"
ON public.availability_slots
FOR SELECT TO anon
USING (status IN ('open', 'held', 'booked') AND starts_at > now());
