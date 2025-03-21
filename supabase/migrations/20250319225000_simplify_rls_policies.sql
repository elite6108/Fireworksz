-- Simplify RLS policies to allow any authenticated user to delete categories and products

-- Drop existing policies
DROP POLICY IF EXISTS "Categories are deletable by admins" ON categories;
DROP POLICY IF EXISTS "Products are deletable by admins" ON products;

-- Create simplified policies for categories
CREATE POLICY "Categories are deletable by authenticated users" 
  ON categories FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Create simplified policies for products
CREATE POLICY "Products are deletable by authenticated users" 
  ON products FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled on both tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
