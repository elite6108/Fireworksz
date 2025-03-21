-- Add is_public column to gallery table
ALTER TABLE gallery ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Create an index on is_public for faster queries
CREATE INDEX idx_gallery_is_public ON gallery(is_public);

-- Update RLS policies to allow public access to public images
CREATE POLICY "Public images are viewable by everyone" 
ON gallery FOR SELECT 
USING (is_public = true);

-- Update existing policy for authenticated users to see all images
DROP POLICY IF EXISTS "Authenticated users can view gallery images" ON gallery;
CREATE POLICY "Authenticated users can view all gallery images" 
ON gallery FOR SELECT 
TO authenticated
USING (true);

-- Update existing policy for admin users to manage all images
DROP POLICY IF EXISTS "Admin users can insert gallery images" ON gallery;
CREATE POLICY "Admin users can manage gallery images" 
ON gallery FOR ALL 
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create a storage policy to allow public access to public images
DROP POLICY IF EXISTS "Public can view public gallery images" ON storage.objects;
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
