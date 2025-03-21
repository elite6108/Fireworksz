-- Drop existing policies
DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Create a function to check if a user is an admin (in case it doesn't exist)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(raw_user_meta_data->>'role', '') = 'admin'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy for users to view their own orders and admins to view all orders
CREATE POLICY "Users can view orders"
ON orders FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- Create policy for order_items to ensure admins can view all order items
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
CREATE POLICY "Users can view order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR is_admin())
  )
);

-- Log policy changes
DO $$
BEGIN
  RAISE NOTICE 'Updated RLS policies for orders and order_items tables';
END $$;
