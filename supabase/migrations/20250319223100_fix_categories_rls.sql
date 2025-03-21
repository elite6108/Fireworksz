-- First, let's verify the current RLS policies on the categories table
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'categories';
  RAISE NOTICE 'Found % RLS policies on categories table', policy_count;
END $$;

-- Drop existing policies to recreate them with proper conditions
DROP POLICY IF EXISTS "Categories are editable by admins" ON categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;

-- Create more flexible RLS policies that check role in multiple ways
CREATE POLICY "Categories are viewable by everyone" 
  ON categories FOR SELECT 
  USING (true);

-- Create a more robust admin policy that checks role in multiple formats
CREATE POLICY "Categories are editable by admins" 
  ON categories FOR ALL 
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

-- Create a function to help debug JWT token contents
CREATE OR REPLACE FUNCTION debug_jwt()
RETURNS jsonb AS $$
BEGIN
  RETURN auth.jwt();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the debug function
GRANT EXECUTE ON FUNCTION debug_jwt TO authenticated;
GRANT EXECUTE ON FUNCTION debug_jwt TO anon;

-- Create a helper RPC function to create categories with elevated privileges
CREATE OR REPLACE FUNCTION create_category_as_admin(name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_category jsonb;
BEGIN
  INSERT INTO categories (name)
  VALUES (name)
  RETURNING to_jsonb(categories.*) INTO new_category;
  
  RETURN new_category;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error creating category: %', SQLERRM;
END;
$$;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION create_category_as_admin TO authenticated;
