-- Allow all authenticated users to upload gallery images
-- This script updates the RLS policy for the gallery table

-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admin Insert Gallery Images" ON gallery;

-- Create a new policy that allows all authenticated users to insert gallery images
CREATE POLICY "Authenticated users can insert gallery images"
ON gallery FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Drop the existing admin-only storage policy
DROP POLICY IF EXISTS "Admin users can upload gallery images" ON storage.objects;

-- Create a new policy that allows all authenticated users to upload to gallery bucket
CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' AND
  auth.role() = 'authenticated'
);

-- Update the existing admin management policy to be more specific
DROP POLICY IF EXISTS "Admin users can manage gallery images" ON gallery;

-- Re-create the admin management policy for update and delete operations
CREATE POLICY "Admin users can manage gallery images" 
ON gallery FOR UPDATE USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Admin users can delete gallery images" 
ON gallery FOR DELETE USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  )
);
