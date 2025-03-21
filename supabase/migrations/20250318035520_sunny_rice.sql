/*
  # Fix Products Table RLS Policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies with proper role checks
    - Add explicit authenticated user checks
    
  2. Security
    - Public read access
    - Admin-only write operations
    - Proper role validation
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

-- Create admin policy for write operations
CREATE POLICY "products_admin_policy"
ON products
FOR ALL
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.jwt() ->> 'role' = 'admin'
);