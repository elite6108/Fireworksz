/*
  # Fix product table RLS policies

  1. Changes
    - Drop all existing policies to start fresh
    - Create comprehensive set of policies for all operations
    - Ensure proper type casting for role checks
    - Maintain public read access

  2. Security
    - Enable RLS
    - Public read access
    - Admin-only write operations
    - Proper type casting for role checks
*/

-- Drop all existing policies
DO $$ 
BEGIN
  -- Drop all existing policies on the products table
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'products'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can view products" ON products;
    DROP POLICY IF EXISTS "Admins can do everything" ON products;
    DROP POLICY IF EXISTS "Admins can insert products" ON products;
    DROP POLICY IF EXISTS "Admins can update products" ON products;
    DROP POLICY IF EXISTS "Admins can delete products" ON products;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper type casting
CREATE POLICY "Anyone can view products" 
ON products
FOR SELECT 
TO public
USING (true);

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