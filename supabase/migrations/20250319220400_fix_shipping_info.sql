-- First, drop all existing policies
DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can update any order" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

-- Drop the foreign key constraint
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_shipping_address_id_fkey;

-- Drop any existing shipping_address_id column from orders
ALTER TABLE orders
DROP COLUMN IF EXISTS shipping_address_id;

-- Now we can safely drop the shipping_addresses table
DROP TABLE IF EXISTS shipping_addresses CASCADE;

-- Drop the existing view if it exists
DROP VIEW IF EXISTS order_details;

-- Drop existing columns from orders table
ALTER TABLE orders 
DROP COLUMN IF EXISTS shipping_address,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone;

-- Add the columns again to ensure they are created correctly
ALTER TABLE orders
ADD COLUMN email TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN shipping_address JSONB,
ADD COLUMN shipping_cost DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create a function to check if a user is an admin
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

-- Enable RLS on orders and order_items tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own orders and admins to view all orders
CREATE POLICY "Users can view orders"
ON orders FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- Create policy for users to create their own orders
CREATE POLICY "Users can create their own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for admins to update any order
CREATE POLICY "Admins can update any order"
ON orders FOR UPDATE
USING (is_admin());

-- Create policies for order_items
CREATE POLICY "Users can view order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR is_admin())
  )
);

-- Add foreign key constraints and indexes for order_items
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_order_id_fkey,
DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE order_items
ADD CONSTRAINT order_items_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES orders(id) 
  ON DELETE CASCADE,
ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES products(id) 
  ON DELETE SET NULL;

-- Add indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_id ON products(id);

-- Create policies for order_items
CREATE POLICY "Users can view their own order items" ON order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR is_admin())
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Create a secure view for order details that includes all necessary fields
CREATE OR REPLACE VIEW order_details AS
SELECT 
  o.id,
  o.user_id,
  o.status,
  o.total,
  o.created_at,
  o.updated_at,
  COALESCE(o.email, u.email) as email,
  COALESCE(o.phone, 'N/A') as phone,
  COALESCE(
    o.shipping_address,
    jsonb_build_object(
      'full_name', COALESCE(u.raw_user_meta_data->>'full_name', 'N/A'),
      'address', 'N/A',
      'city', 'N/A',
      'state', 'N/A',
      'zip_code', 'N/A',
      'country', 'N/A'
    )
  ) as shipping_address,
  o.shipping_cost,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'quantity', oi.quantity,
        'price', oi.price,
        'product', (
          SELECT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'image_url', p.image_url,
            'category', p.category,
            'price', p.price
          )
          FROM products p 
          WHERE p.id = oi.product_id
        )
      )
    )
    FROM order_items oi
    WHERE oi.order_id = o.id
  ) as items
FROM orders o
LEFT JOIN auth.users u ON o.user_id = u.id;

-- Grant access to the view and related tables
GRANT SELECT ON order_details TO authenticated;
GRANT SELECT ON products TO authenticated;
GRANT SELECT ON order_items TO authenticated;

-- Create RPC function for admin order status updates
CREATE OR REPLACE FUNCTION admin_update_order_status(p_order_id UUID, p_status TEXT)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update order status';
  END IF;
  
  UPDATE orders 
  SET 
    status = p_status,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION admin_update_order_status TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
