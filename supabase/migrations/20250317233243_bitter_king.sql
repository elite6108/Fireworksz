/*
  # Simplified Products Table RLS Policies

  1. Changes
    - Drop all existing policies for a fresh start
    - Create simplified policies:
      - Public read access
      - Single admin policy for all write operations
    
  2. Security
    - Maintains proper access control with simpler policy structure
    - Uses proper type casting for role checks
*/

-- Drop all existing policies
DO $$ 
BEGIN
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

-- Create simplified policies
CREATE POLICY "products_read_policy" 
ON products
FOR SELECT 
TO public
USING (true);

CREATE POLICY "products_write_policy"
ON products
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');