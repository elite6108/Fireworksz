-- Add shipping_cost column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0.00;

-- Update the get_all_orders_with_items function to include shipping_cost
CREATE OR REPLACE FUNCTION get_all_orders_with_items()
RETURNS SETOF jsonb
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Check if the current user is an admin
  SELECT (COALESCE(raw_user_meta_data->>'role', '') = 'admin')
  INTO is_admin_user
  FROM auth.users
  WHERE id = auth.uid();

  -- Only allow admins to access this function
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  -- Return all orders with their items and products
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', o.id,
    'user_id', o.user_id,
    'status', o.status,
    'total', o.total,
    'shipping_cost', o.shipping_cost,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'email', o.email,
    'phone', o.phone,
    'shipping_address', o.shipping_address,
    'items', (
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
              'price', p.price,
              'stock', p.stock,
              'created_at', p.created_at
            )
            FROM products p
            WHERE p.id = oi.product_id
          )
        )
      )
      FROM order_items oi
      WHERE oi.order_id = o.id
    )
  )
  FROM orders o
  ORDER BY o.created_at DESC;
END;
$$;
