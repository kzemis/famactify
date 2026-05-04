-- SCV-01 — Hunt asset storage bucket and RLS policies
-- Supports sponsor logos, cover images, and per-stop audio guides.

INSERT INTO storage.buckets (id, name, public)
VALUES ('hunt-assets', 'hunt-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Anyone can view hunt assets" ON storage.objects;
CREATE POLICY "Anyone can view hunt assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hunt-assets');

DROP POLICY IF EXISTS "Authenticated users can upload own hunt assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload own hunt assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hunt-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can update own hunt assets" ON storage.objects;
CREATE POLICY "Authenticated users can update own hunt assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hunt-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'hunt-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can delete own hunt assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete own hunt assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hunt-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
