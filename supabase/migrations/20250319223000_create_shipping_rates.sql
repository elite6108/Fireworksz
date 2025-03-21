-- Create shipping_rates table
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create RLS policies for shipping_rates
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

-- Admins can view all shipping rates
CREATE POLICY "Admins can view all shipping rates" ON shipping_rates
  FOR SELECT
  USING (auth.jwt() ? 'role' = 'admin');

-- All authenticated users can view shipping rates
CREATE POLICY "Users can view shipping rates" ON shipping_rates
  FOR SELECT
  USING (auth.jwt() ? 'role' IS NOT NULL);

-- Only admins can insert, update, or delete shipping rates
CREATE POLICY "Admins can insert shipping rates" ON shipping_rates
  FOR INSERT
  WITH CHECK (auth.jwt() ? 'role' = 'admin');

CREATE POLICY "Admins can update shipping rates" ON shipping_rates
  FOR UPDATE
  USING (auth.jwt() ? 'role' = 'admin');

CREATE POLICY "Admins can delete shipping rates" ON shipping_rates
  FOR DELETE
  USING (auth.jwt() ? 'role' = 'admin');

-- Insert default shipping rate if none exists
INSERT INTO shipping_rates (name, cost, is_default)
SELECT 'Standard Shipping', 5.99, true
WHERE NOT EXISTS (SELECT 1 FROM shipping_rates WHERE is_default = true)
LIMIT 1;

-- Add shipping_rate_id to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_rate_id UUID REFERENCES shipping_rates(id);

-- Update execute_sql function to allow admins to run SQL (if it doesn't already exist)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT auth.jwt() ->> 'role') = 'admin' THEN
    EXECUTE sql_query;
  ELSE
    RAISE EXCEPTION 'Permission denied: only admins can execute SQL';
  END IF;
END;
$$;
