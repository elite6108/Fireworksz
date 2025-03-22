-- Update RLS policies for orders table to allow admins to update order status and tracking numbers

-- First, check if the policy exists and drop it if it does
DROP POLICY IF EXISTS "Admins can update orders" ON orders;

-- Create a policy that allows admins to update orders
CREATE POLICY "Admins can update orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Ensure orders table has RLS enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Make sure authenticated users can view their own orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders"
ON orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Make sure admins can view all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
ON orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);
