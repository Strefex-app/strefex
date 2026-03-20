-- ============================================================
-- Company profile attachments (seller / service provider self-service)
-- PDF, images, presentations, short videos — metadata JSONB + Storage bucket "documents"
-- Path convention: {company_id}/profile-attachments/{filename}
-- ============================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS profile_attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.companies.profile_attachments IS
  'Array of { id, path, name, mime_type, size_bytes, uploaded_at } for files in storage (documents bucket, folder profile-attachments).';

NOTIFY pgrst, 'reload schema';
