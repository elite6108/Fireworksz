# Gallery RLS Policy Fix Instructions

Follow these steps to fix the "new row violates row-level security policy" error when uploading images to the gallery.

## Step 1: Access the Supabase SQL Editor

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project "Fireworks E-commerce"
3. In the left sidebar, click on "SQL Editor"
4. Click "New Query" to create a new SQL query

## Step 2: Execute the RLS Policy Updates

Copy and paste the following SQL into the SQL Editor:

```sql
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
```

## Step 3: Run the Query

Click the "Run" button to execute the SQL statements.

## Step 4: Verify the Changes

After applying the changes, you can verify the updated policies by running:

```sql
-- Check gallery table policies
SELECT * FROM pg_policies WHERE tablename = 'gallery';

-- Check storage.objects policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

## Step 5: Test Image Upload

Return to the application and try uploading an image again. The "new row violates row-level security policy" error should be resolved, and any authenticated user should now be able to upload images to the gallery.
