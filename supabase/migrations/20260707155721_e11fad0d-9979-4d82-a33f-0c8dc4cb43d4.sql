CREATE POLICY "Admins manage contentdreh uploads read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contentdreh-uploads' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage contentdreh uploads insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contentdreh-uploads' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage contentdreh uploads update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contentdreh-uploads' AND private.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'contentdreh-uploads' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage contentdreh uploads delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contentdreh-uploads' AND private.has_role(auth.uid(), 'admin'));