-- Add product details columns to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_description TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS category TEXT;

-- Create a function to update existing order_items with product data
CREATE OR REPLACE FUNCTION update_order_items_product_data()
RETURNS void AS $$
BEGIN
  UPDATE order_items oi
  SET 
    product_name = p.name,
    product_description = p.description,
    image_url = p.image_url,
    category = p.category
  FROM products p
  WHERE oi.product_id = p.id
  AND (oi.product_name IS NULL OR oi.product_description IS NULL OR oi.image_url IS NULL OR oi.category IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Execute the function to update existing order_items
SELECT update_order_items_product_data();

-- Drop the function after use
DROP FUNCTION update_order_items_product_data();
