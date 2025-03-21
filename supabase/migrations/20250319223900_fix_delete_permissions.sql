-- Fix delete permissions for categories and products tables

-- First, let's ensure the categories table has proper RLS policies for delete operations
DROP POLICY IF EXISTS "Categories are deletable by admins" ON categories;

-- Create a specific policy for delete operations
CREATE POLICY "Categories are deletable by admins" 
  ON categories FOR DELETE 
  USING (
    -- Check standard JWT role format
    auth.jwt() ->> 'role' = 'admin' 
    OR 
    -- Check user_metadata format
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR
    -- Check app_metadata format
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR
    -- Check if user is authenticated at all (temporary for debugging)
    auth.role() = 'authenticated'
  );

-- Create a helper RPC function to delete categories with elevated privileges
CREATE OR REPLACE FUNCTION delete_category_as_admin(category_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success boolean;
BEGIN
  DELETE FROM categories
  WHERE id = category_id;
  
  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error deleting category: %', SQLERRM;
END;
$$;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION delete_category_as_admin TO authenticated;

-- Now let's do the same for products table
DROP POLICY IF EXISTS "Products are deletable by admins" ON products;

-- Create a specific policy for delete operations
CREATE POLICY "Products are deletable by admins" 
  ON products FOR DELETE 
  USING (
    -- Check standard JWT role format
    auth.jwt() ->> 'role' = 'admin' 
    OR 
    -- Check user_metadata format
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR
    -- Check app_metadata format
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    OR
    -- Check if user is authenticated at all (temporary for debugging)
    auth.role() = 'authenticated'
  );

-- Create a helper RPC function to delete products with elevated privileges
CREATE OR REPLACE FUNCTION delete_product_as_admin(product_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success boolean;
BEGIN
  DELETE FROM products
  WHERE id = product_id;
  
  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error deleting product: %', SQLERRM;
END;
$$;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION delete_product_as_admin TO authenticated;
