/*
  # Implement Separate RLS Policies for Products Table
  
  1. Changes
    - Drop existing policies
    - Create separate policies for each operation type
    - Add explicit role checking
    
  2. Security
    - Public read access
    - Admin-only write operations with granular policies
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

-- Create insert policy (admin only)
CREATE POLICY "products_insert_policy"
ON products
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() IS NOT NULL AND
  auth.jwt() ->> 'role' = 'admin'
);

-- Create update policy (admin only)
CREATE POLICY "products_update_policy"
ON products
FOR UPDATE
TO authenticated
USING (
  auth.jwt() IS NOT NULL AND
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() IS NOT NULL AND
  auth.jwt() ->> 'role' = 'admin'
);

-- Create delete policy (admin only)
CREATE POLICY "products_delete_policy"
ON products
FOR DELETE
TO authenticated
USING (
  auth.jwt() IS NOT NULL AND
  auth.jwt() ->> 'role' = 'admin'
);

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing order policies if they exist
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Create policies for orders
CREATE POLICY "Users can view their own orders"
ON orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
ON orders FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');