-- This is a direct test migration
-- It adds a comment to the products table and creates a simple index

-- Add a comment to the products table
COMMENT ON TABLE products IS 'Products available for purchase - updated March 21, 2025';

-- Add a simple index that definitely doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Return success message
SELECT 'Migration successfully applied' as result;
