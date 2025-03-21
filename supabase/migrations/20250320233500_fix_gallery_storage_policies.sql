-- Fix storage policies for gallery bucket

-- First, drop any existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Public can view public gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view all gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can manage gallery images" ON storage.objects;

-- Create a policy to allow admin users to insert/upload files
CREATE POLICY "Admin users can upload gallery images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery' AND
  auth.jwt() ->> 'role' = 'admin'
);

-- Create a policy to allow admin users to update files
CREATE POLICY "Admin users can update gallery images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery' AND
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  bucket_id = 'gallery' AND
  auth.jwt() ->> 'role' = 'admin'
);

-- Create a policy to allow admin users to delete files
CREATE POLICY "Admin users can delete gallery images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gallery' AND
  auth.jwt() ->> 'role' = 'admin'
);

-- Create a policy to allow public access to public images
CREATE POLICY "Public can view public gallery images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gallery' AND
  EXISTS (
    SELECT 1 FROM gallery
    WHERE storage_path = storage.objects.name
    AND is_public = true
  )
);

-- Create a policy to allow authenticated users to view all images
CREATE POLICY "Authenticated users can view all gallery images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'gallery');
