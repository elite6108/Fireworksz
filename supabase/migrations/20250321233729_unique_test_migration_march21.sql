-- This is a simple test migration that creates a new view
-- It should not conflict with any existing objects

-- Create a simple view that shows active products
CREATE OR REPLACE VIEW active_products AS
SELECT 
  id,
  name,
  description,
  price,
  created_at
FROM 
  products
WHERE 
  active = true;

-- Add a comment to the view
COMMENT ON VIEW active_products IS 'View showing only active products - created March 21, 2025';