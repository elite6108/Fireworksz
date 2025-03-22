-- Test migration to verify Supabase CLI functionality
-- This adds a simple comment to the products table

COMMENT ON TABLE products IS 'Products available in the store - updated on 2025-03-21';

-- Add an index on product name for faster searches
CREATE INDEX IF NOT EXISTS idx_product_name ON products(name);
