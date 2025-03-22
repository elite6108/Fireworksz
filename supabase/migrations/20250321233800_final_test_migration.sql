-- This is an extremely simple test migration
-- It just adds a comment to an existing table

-- Add a comment to the products table
COMMENT ON TABLE products IS 'Products available for purchase - updated March 21, 2025';

-- Add a simple index that definitely doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);