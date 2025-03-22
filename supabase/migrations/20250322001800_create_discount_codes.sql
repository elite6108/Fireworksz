-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to manage discount codes
CREATE POLICY "Admins can manage discount codes" ON discount_codes
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin' = 'true');

-- Policy to allow all users to view active discount codes
CREATE POLICY "Users can view active discount codes" ON discount_codes
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE AND (end_date IS NULL OR end_date > NOW()) AND (usage_limit IS NULL OR usage_count < usage_limit));

-- Add discount_code_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Drop the function if it exists to avoid errors when re-running the migration
DROP FUNCTION IF EXISTS apply_discount(TEXT, DECIMAL);

-- Create function to apply discount
CREATE OR REPLACE FUNCTION apply_discount(
  p_code TEXT,
  p_subtotal DECIMAL(10, 2)
) RETURNS TABLE (
  discount_id UUID,
  discount_amount DECIMAL(10, 2)
) AS $$
DECLARE
  v_discount_code discount_codes%ROWTYPE;
  v_discount_amount DECIMAL(10, 2) := 0;
BEGIN
  -- Find the discount code
  SELECT * INTO v_discount_code FROM discount_codes
  WHERE LOWER(code) = LOWER(p_code)
    AND is_active = TRUE
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date > NOW())
    AND (usage_limit IS NULL OR usage_count < usage_limit)
    AND (min_purchase_amount <= p_subtotal);
  
  IF v_discount_code.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL(10, 2);
    RETURN;
  END IF;
  
  -- Calculate discount amount
  IF v_discount_code.discount_type = 'percentage' THEN
    v_discount_amount := p_subtotal * (v_discount_code.discount_value / 100);
    
    -- Apply max discount if specified
    IF v_discount_code.max_discount_amount IS NOT NULL AND v_discount_amount > v_discount_code.max_discount_amount THEN
      v_discount_amount := v_discount_code.max_discount_amount;
    END IF;
  ELSE -- fixed_amount
    v_discount_amount := v_discount_code.discount_value;
    
    -- Ensure discount doesn't exceed subtotal
    IF v_discount_amount > p_subtotal THEN
      v_discount_amount := p_subtotal;
    END IF;
  END IF;
  
  -- Update usage count
  UPDATE discount_codes
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = v_discount_code.id;
  
  -- Return the result
  discount_id := v_discount_code.id;
  discount_amount := v_discount_amount;
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample discount codes
INSERT INTO discount_codes (code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, start_date, end_date, usage_limit, is_active)
VALUES 
  ('WELCOME10', 'Welcome discount 10% off', 'percentage', 10, 0, 100, NOW(), NOW() + INTERVAL '30 days', 100, TRUE),
  ('SUMMER25', 'Summer sale 25% off', 'percentage', 25, 50, 200, NOW(), NOW() + INTERVAL '60 days', 50, TRUE),
  ('FREESHIP', 'Free shipping ($15 off)', 'fixed_amount', 15, 0, NULL, NOW(), NOW() + INTERVAL '90 days', 200, TRUE);
