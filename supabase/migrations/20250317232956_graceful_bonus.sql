/*
  # Fix Products Table RLS Policies

  1. Changes
    - Drop all existing policies to start fresh
    - Re-enable RLS on products table
    - Create new policies with proper role checks:
      - Public read access
      - Admin-only write operations (insert/update/delete)
    
  2. Security
    - Ensures proper role-based access control
    - Maintains data integrity through proper policy checks
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
    DROP POLICY IF EXISTS "Only admins can modify products" ON products;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Anyone can view products" 
ON products
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Only admins can modify products"
ON products
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);