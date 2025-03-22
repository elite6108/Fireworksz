-- Fix orders RLS policies to avoid accessing auth.users table directly

-- Add tracking_number column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT DEFAULT NULL;

-- Create a table to track admin users
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a function to check if the current user is an admin using the admin_users table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if the current user is in the admin_users table
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- Add debugging to log who is calling the function and what the result is
CREATE OR REPLACE FUNCTION debug_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  result BOOLEAN;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = current_user_id
  ) INTO result;
  
  -- Log the result (this will appear in Supabase logs)
  RAISE NOTICE 'User % is admin: %', current_user_id, result;
  
  RETURN result;
END;
$$;

-- Drop existing policies that might be causing permission issues
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Create simplified policies that use the admin_users table

-- Policy for users to view their own orders
CREATE POLICY "Users can view their own orders"
ON orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR debug_is_admin());

-- Policy for admins to view all orders
CREATE POLICY "Admins can view all orders"
ON orders
FOR SELECT
TO authenticated
USING (debug_is_admin());

-- Policy for admins to update orders
CREATE POLICY "Admins can update orders"
ON orders
FOR UPDATE
TO authenticated
USING (debug_is_admin())
WITH CHECK (debug_is_admin());

-- Ensure orders table has RLS enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO authenticated;
-- No sequence needed for UUID primary key
