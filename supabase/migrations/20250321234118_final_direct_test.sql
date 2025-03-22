-- This is a final direct test migration
-- It just adds a simple function that can be used to test migrations

-- Create a simple function to get product information
CREATE OR REPLACE FUNCTION get_product_info(product_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.created_at,
    p.updated_at
  FROM 
    products p
  WHERE 
    p.id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to the function
COMMENT ON FUNCTION get_product_info(UUID) IS 'Function to retrieve product information - created March 21, 2025';