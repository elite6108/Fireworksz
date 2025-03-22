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

-- Create a policy to allow admin users to update files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Admin users can update gallery images'
    ) THEN
        EXECUTE 'CREATE POLICY "Admin users can update gallery images"
                ON storage.objects FOR UPDATE
                TO authenticated
                USING (
                  bucket_id = ''gallery'' AND
                  auth.jwt() ->> ''role'' = ''admin''
                )
                WITH CHECK (
                  bucket_id = ''gallery'' AND
                  auth.jwt() ->> ''role'' = ''admin''
                )';
    END IF;
END
$$;

-- Create a policy to allow admin users to delete files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Admin users can delete gallery images'
    ) THEN
        EXECUTE 'CREATE POLICY "Admin users can delete gallery images"
                ON storage.objects FOR DELETE
                TO authenticated
                USING (
                  bucket_id = ''gallery'' AND
                  auth.jwt() ->> ''role'' = ''admin''
                )';
    END IF;
END
$$;

-- Create a policy to allow public access to public images
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

-- Create a policy to allow authenticated users to view all images
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
