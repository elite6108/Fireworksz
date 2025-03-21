/*
  # Fix Products Table RLS Policies

  1. Changes
    - Drop all existing policies for a clean slate
    - Create new policies with proper role checking and security
    - Add proper type casting and role validation
    - Ensure policies are properly scoped
    
  2. Security
    - Public read access for all users
    - Admin-only write access with proper role validation
    - Uses IS NOT NULL check for additional security
    - Proper type casting for role checks
*/

-- Drop all existing policies
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'products'
  ) THEN
    DROP POLICY IF EXISTS "products_read_policy" ON products;
    DROP POLICY IF EXISTS "products_write_policy" ON products;
    DROP POLICY IF EXISTS "products_admin_policy" ON products;
    DROP POLICY IF EXISTS "Anyone can view products" ON products;
    DROP POLICY IF EXISTS "Admins can do everything" ON products;
    DROP POLICY IF EXISTS "Admins can insert products" ON products;
    DROP POLICY IF EXISTS "Admins can update products" ON products;
    DROP POLICY IF EXISTS "Admins can delete products" ON products;
    DROP POLICY IF EXISTS "Only admins can modify products" ON products;
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

-- Create admin policy for all write operations
CREATE POLICY "products_admin_policy"
ON products
FOR ALL
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND auth.jwt() IS NOT NULL 
  AND (auth.jwt() ->> 'role')::text IS NOT NULL 
  AND (auth.jwt() ->> 'role')::text = 'admin'
)
WITH CHECK (
  auth.role() = 'authenticated' 
  AND auth.jwt() IS NOT NULL 
  AND (auth.jwt() ->> 'role')::text IS NOT NULL 
  AND (auth.jwt() ->> 'role')::text = 'admin'
);