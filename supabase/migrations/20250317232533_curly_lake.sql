/*
  # Fix admin RLS policies for products table

  1. Changes
    - Replace single admin policy with specific policies for each operation
    - Maintain public read access
    - Ensure admins can perform all CRUD operations

  2. Security
    - Maintains RLS enabled
    - Specific policies for INSERT, UPDATE, and DELETE operations
    - Preserves public read access
*/

-- Drop existing policies
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Admins can do everything'
  ) THEN
    DROP POLICY "Admins can do everything" ON products;
  END IF;
END $$;

-- Create specific policies for each operation
CREATE POLICY "Admins can insert products"
ON products
FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Admins can update products"
ON products
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Admins can delete products"
ON products
FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text);