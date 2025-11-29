-- Create storage bucket for activity images
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-images', 'activity-images', true);

-- Allow anyone to upload images (for public contributions)
CREATE POLICY "Anyone can upload activity images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'activity-images');

-- Allow anyone to view activity images
CREATE POLICY "Anyone can view activity images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'activity-images');

-- Allow users to delete their own uploads (optional, for future use)
CREATE POLICY "Users can delete their own activity images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'activity-images');