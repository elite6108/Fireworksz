-- New test migration to verify Supabase CLI functionality
-- This adds a simple comment to the orders table

COMMENT ON TABLE orders IS 'Customer orders with updated metadata - March 21, 2025';

-- Add an index on order status for faster filtering
CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status);
