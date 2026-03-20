-- ============================================================
-- Supplier directory — presentation / marketing attachments
-- PDF, images, PowerPoint, short videos; metadata in JSONB + Storage
-- ============================================================

ALTER TABLE public.platform_registered_suppliers
  ADD COLUMN IF NOT EXISTS presentation_files JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.platform_registered_suppliers.presentation_files IS
  'Array of { id, path, name, mime_type, size_bytes, uploaded_at } for files in storage bucket supplier-directory.';

-- Private bucket for superadmin-only supplier directory media
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-directory', 'supplier-directory', false)
ON CONFLICT (id) DO NOTHING;

-- Storage: superadmin only (matches platform_registered_suppliers RLS)
DROP POLICY IF EXISTS "supplier_directory_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "supplier_directory_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "supplier_directory_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "supplier_directory_storage_delete" ON storage.objects;

CREATE POLICY "supplier_directory_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'supplier-directory'
    AND public.get_my_role() = 'superadmin'
  );

CREATE POLICY "supplier_directory_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'supplier-directory'
    AND public.get_my_role() = 'superadmin'
  );

CREATE POLICY "supplier_directory_storage_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'supplier-directory'
    AND public.get_my_role() = 'superadmin'
  )
  WITH CHECK (
    bucket_id = 'supplier-directory'
    AND public.get_my_role() = 'superadmin'
  );

CREATE POLICY "supplier_directory_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'supplier-directory'
    AND public.get_my_role() = 'superadmin'
  );

NOTIFY pgrst, 'reload schema';
