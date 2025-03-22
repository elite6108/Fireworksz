# Fix Gallery Storage Access Issues

Follow these instructions to fix the issue with gallery images not displaying properly.

## Step 1: Access the Supabase SQL Editor

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project "Fireworks E-commerce"
3. In the left sidebar, click on "SQL Editor"
4. Click "New Query" to create a new SQL query

## Step 2: Execute the Storage Policy Updates

Copy and paste the following SQL into the SQL Editor:

```sql
-- Fix storage policies for gallery bucket to allow all authenticated users to access images

-- First, drop any existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Public can view public gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view all gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete gallery images" ON storage.objects;

-- Check if the policy already exists before creating it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated users can upload gallery images'
    ) THEN
        -- Create a policy to allow all authenticated users to upload files
        EXECUTE 'CREATE POLICY "Authenticated users can upload gallery images"
                ON storage.objects FOR INSERT
                TO authenticated
                WITH CHECK (bucket_id = ''gallery'')';
    ELSE
        -- Update the existing policy to ensure it has the correct definition
        DROP POLICY "Authenticated users can upload gallery images" ON storage.objects;
        CREATE POLICY "Authenticated users can upload gallery images"
                ON storage.objects FOR INSERT
                TO authenticated
                WITH CHECK (bucket_id = 'gallery');
    END IF;
END
$$;

-- Create or update the remaining policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public can view public gallery images'
    ) THEN
        EXECUTE 'CREATE POLICY "Public can view public gallery images"
                ON storage.objects FOR SELECT
                USING (
                  bucket_id = ''gallery'' AND
                  EXISTS (
                    SELECT 1 FROM gallery
                    WHERE storage_path = storage.objects.name
                    AND is_public = true
                  )
                )';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated users can view all gallery images'
    ) THEN
        EXECUTE 'CREATE POLICY "Authenticated users can view all gallery images"
                ON storage.objects FOR SELECT
                TO authenticated
                USING (bucket_id = ''gallery'')';
    END IF;
END
$$;

-- Make sure the gallery bucket is set to public
UPDATE storage.buckets
SET public = true
WHERE id = 'gallery';
```

## Step 3: Run the Query

Click the "Run" button to execute the SQL statements.

## Step 4: Verify the Changes

After applying the changes, you can verify the updated policies by running:

```sql
-- Check storage.objects policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check gallery bucket settings
SELECT * FROM storage.buckets WHERE id = 'gallery';
```

## Step 5: Clear Your Browser Cache

Since the browser might have cached the failed image requests, it's important to clear your browser cache:

1. Press Ctrl+Shift+Delete (Windows/Linux) or Command+Shift+Delete (Mac)
2. Select "Cached images and files"
3. Click "Clear data"

## Step 6: Test Image Display

Return to the application and refresh the page. The gallery images should now display properly. If you upload a new image, it should also display correctly.

## Step 7: Check for CORS Issues

If images still don't display, you may need to check CORS settings in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to Storage → Policies
3. Make sure the gallery bucket is set to public
4. Go to Project Settings → API
5. Under "API Settings", ensure that the "Enable CORS" option is checked
6. Add your application domain to the "Additional allowed origins" list (e.g., http://localhost:5173)
