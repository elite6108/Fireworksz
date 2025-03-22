-- Drop the existing apply_discount function
DROP FUNCTION IF EXISTS apply_discount(TEXT, DECIMAL);

-- Create an updated function to apply discount with more lenient date validation
CREATE OR REPLACE FUNCTION apply_discount(
  p_code TEXT,
  p_subtotal DECIMAL(10, 2)
) RETURNS TABLE (
  discount_id UUID,
  discount_amount DECIMAL(10, 2)
) AS $$
DECLARE
  v_discount_code RECORD;
  v_discount_amount DECIMAL(10, 2) := 0;
BEGIN
  -- Find the discount code using direct SQL to bypass RLS
  -- This ensures the function works regardless of the user's role
  SELECT id, code, discount_type, discount_value, min_purchase_amount, max_discount_amount,
         start_date, end_date, is_active
  INTO v_discount_code 
  FROM discount_codes
  WHERE LOWER(code) = LOWER(p_code)
    AND is_active = TRUE
    AND (usage_limit IS NULL OR usage_count < usage_limit);
  
  -- Debug logging
  RAISE NOTICE 'Discount code found: %, Start: %, End: %, Active: %', 
    v_discount_code.code, 
    v_discount_code.start_date, 
    v_discount_code.end_date,
    v_discount_code.is_active;
  
  IF v_discount_code.id IS NULL THEN
    RAISE NOTICE 'No discount code found for: %', p_code;
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL(10, 2);
    RETURN;
  END IF;
  
  -- Check date validity separately for better error handling
  IF v_discount_code.start_date IS NOT NULL AND v_discount_code.start_date > NOW() THEN
    RAISE NOTICE 'Discount code not yet active: %', p_code;
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL(10, 2);
    RETURN;
  END IF;
  
  IF v_discount_code.end_date IS NOT NULL AND v_discount_code.end_date < NOW() THEN
    RAISE NOTICE 'Discount code expired: %', p_code;
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL(10, 2);
    RETURN;
  END IF;
  
  -- Check minimum purchase amount
  IF v_discount_code.min_purchase_amount > p_subtotal THEN
    RAISE NOTICE 'Minimum purchase amount not met: % < %', p_subtotal, v_discount_code.min_purchase_amount;
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
  
  RAISE NOTICE 'Discount amount calculated: %', v_discount_amount;
  
  -- Update usage count
  UPDATE discount_codes
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = v_discount_code.id;
  
  -- Return the result
  RETURN QUERY SELECT v_discount_code.id, v_discount_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the sample discount codes to ensure they're not expired
UPDATE discount_codes
SET start_date = NOW() - INTERVAL '1 day',
    end_date = NOW() + INTERVAL '365 days'
WHERE code IN ('WELCOME10', 'SUMMER25', 'FREESHIP');

-- Insert a new test discount code with a long validity period
INSERT INTO discount_codes 
  (code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, start_date, end_date, usage_limit, is_active)
VALUES 
  ('TEST50', 'Test discount 50% off', 'percentage', 50, 0, 500, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', 1000, TRUE)
ON CONFLICT (code) DO NOTHING;
