-- Replace has_role calls in RLS with inline subqueries so we can lock down the function.

-- public.customer_notes
DROP POLICY IF EXISTS "Admins can view customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Admins can insert customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Admins can update customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Admins can delete customer notes" ON public.customer_notes;

CREATE POLICY "Admins can view customer notes" ON public.customer_notes
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can insert customer notes" ON public.customer_notes
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can update customer notes" ON public.customer_notes
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can delete customer notes" ON public.customer_notes
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- public.site_content
DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;

CREATE POLICY "Admins can insert site content" ON public.site_content
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can update site content" ON public.site_content
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- public.availability_slot_admin_meta
DROP POLICY IF EXISTS "Admins can read slot admin meta" ON public.availability_slot_admin_meta;
DROP POLICY IF EXISTS "Admins can insert slot admin meta" ON public.availability_slot_admin_meta;
DROP POLICY IF EXISTS "Admins can update slot admin meta" ON public.availability_slot_admin_meta;
DROP POLICY IF EXISTS "Admins can delete slot admin meta" ON public.availability_slot_admin_meta;

CREATE POLICY "Admins can read slot admin meta" ON public.availability_slot_admin_meta
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can insert slot admin meta" ON public.availability_slot_admin_meta
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can update slot admin meta" ON public.availability_slot_admin_meta
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can delete slot admin meta" ON public.availability_slot_admin_meta
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- storage.objects (contentdreh-uploads)
DROP POLICY IF EXISTS "Admins manage contentdreh uploads read" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage contentdreh uploads insert" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage contentdreh uploads update" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage contentdreh uploads delete" ON storage.objects;

CREATE POLICY "Admins manage contentdreh uploads read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'contentdreh-uploads' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins manage contentdreh uploads insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contentdreh-uploads' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins manage contentdreh uploads update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'contentdreh-uploads' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (bucket_id = 'contentdreh-uploads' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins manage contentdreh uploads delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'contentdreh-uploads' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- Now lock down has_role: revoke direct EXECUTE from anon/authenticated.
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM authenticated;