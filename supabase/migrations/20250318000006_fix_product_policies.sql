-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new policies with more permissive checks
CREATE POLICY "Enable read access for all users"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for authenticated users with admin role"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND 
  (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY "Enable update for authenticated users with admin role"
ON products FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated' AND 
  (auth.jwt() ->> 'role')::text = 'admin'
)
WITH CHECK (
  auth.role() = 'authenticated' AND 
  (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY "Enable delete for authenticated users with admin role"
ON products FOR DELETE
TO authenticated
USING (
  auth.role() = 'authenticated' AND 
  (auth.jwt() ->> 'role')::text = 'admin'
); 