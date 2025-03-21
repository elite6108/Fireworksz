/*
  # Fix Products Table RLS Policies
  
  1. Changes
    - Drop all existing policies
    - Create simplified policies for read and admin access
    
  2. Security
    - Public read access
    - Admin-only write operations with proper auth checks
*/

-- Drop existing policies
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'products'
  ) THEN
    DROP POLICY IF EXISTS "products_read_policy" ON products;
    DROP POLICY IF EXISTS "products_admin_policy" ON products;
    DROP POLICY IF EXISTS "products_write_policy" ON products;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create read policy (public access)
CREATE POLICY "products_read_policy" 
ON products
FOR SELECT 
TO public
USING (true);

-- Create admin policy
CREATE POLICY "products_admin_policy"
ON products
FOR ALL
TO authenticated
USING (
  auth.jwt() IS NOT NULL AND
  (auth.jwt() ->> 'role')::text = 'admin'
)
WITH CHECK (
  auth.jwt() IS NOT NULL AND
  (auth.jwt() ->> 'role')::text = 'admin'
);