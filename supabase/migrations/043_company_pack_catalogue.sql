-- In-platform company pack catalogue: JPEG frames under
-- {company_id}/profile-attachments/catalogue/...
-- Authenticated users may view those pictures only (not source PDFs).

DROP POLICY IF EXISTS "Authenticated users can view company pack catalogue" ON storage.objects;
CREATE POLICY "Authenticated users can view company pack catalogue"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND name LIKE '%/profile-attachments/catalogue/%'
  );

DROP POLICY IF EXISTS "Superadmin can upload company documents" ON storage.objects;
CREATE POLICY "Superadmin can upload company documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND public.get_my_role() = 'superadmin'
  );

DROP POLICY IF EXISTS "Superadmin can update company documents" ON storage.objects;
CREATE POLICY "Superadmin can update company documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND public.get_my_role() = 'superadmin'
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.get_my_role() = 'superadmin'
  );

DROP POLICY IF EXISTS "Superadmin can delete company documents" ON storage.objects;
CREATE POLICY "Superadmin can delete company documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND public.get_my_role() = 'superadmin'
  );
