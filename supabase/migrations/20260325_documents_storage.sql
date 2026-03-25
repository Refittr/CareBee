-- Create the documents storage bucket (private, 10MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies: any authenticated user can operate on the documents bucket.
-- Row-level security on the `documents` database table controls which file paths
-- a user is allowed to know about, so storage policies just need to allow
-- authenticated access.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload documents"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can view documents'
  ) THEN
    CREATE POLICY "Authenticated users can view documents"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update documents'
  ) THEN
    CREATE POLICY "Authenticated users can update documents"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete documents"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
  END IF;
END $$;
