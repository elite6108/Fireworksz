-- Drop existing policies
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

-- Create function to check if a user is an admin (if it doesn't exist)
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

-- Create policy for order_items to ensure admins can view all order items
CREATE POLICY "Users can view order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR is_admin())
  )
);

-- Create policy for order_items to ensure admins can insert order items
CREATE POLICY "Users can insert order items"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR is_admin())
  )
);

-- Create policy for order_items to ensure admins can update order items
CREATE POLICY "Users can update order items"
ON order_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR is_admin())
  )
);

-- Enable RLS on order_items table if not already enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Log policy changes
DO $$
BEGIN
  RAISE NOTICE 'Updated RLS policies for order_items table';
END $$;
