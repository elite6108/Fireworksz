/*
  # Fix RLS policies for products table

  1. Security Changes
    - Enable RLS on products table (if not already enabled)
    - Add policies (if they don't exist):
      - Public users can view products
      - Admins can perform all operations
*/

-- Enable RLS (idempotent operation)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop "Anyone can view products" policy if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Anyone can view products'
  ) THEN
    DROP POLICY "Anyone can view products" ON products;
  END IF;

  -- Drop "Admins can do everything" policy if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Admins can do everything'
  ) THEN
    DROP POLICY "Admins can do everything" ON products;
  END IF;
END $$;

-- Recreate the policies
CREATE POLICY "Anyone can view products" 
ON products
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Admins can do everything" 
ON products
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');