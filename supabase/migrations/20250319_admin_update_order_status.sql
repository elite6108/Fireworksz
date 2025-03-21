-- Create a stored procedure for admin to update order status
-- This bypasses RLS policies and allows direct updates
CREATE OR REPLACE FUNCTION admin_update_order_status(p_order_id UUID, p_status TEXT)
RETURNS VOID AS $$
BEGIN
  -- Only allow valid status values
  IF p_status NOT IN ('pending', 'processing', 'shipped', 'delivered') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  -- Update the order status
  UPDATE orders
  SET status = p_status
  WHERE id = p_order_id;
  
  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
