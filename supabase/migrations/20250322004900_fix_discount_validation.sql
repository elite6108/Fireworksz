-- Drop the existing apply_discount function
DROP FUNCTION IF EXISTS apply_discount(TEXT, DECIMAL);

-- Create an updated function to apply discount that works for all users
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
  SELECT id, code, discount_type, discount_value, min_purchase_amount, max_discount_amount
  INTO v_discount_code 
  FROM discount_codes
  WHERE LOWER(code) = LOWER(p_code)
    AND is_active = TRUE
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date > NOW())
    AND (usage_limit IS NULL OR usage_count < usage_limit);
  
  IF v_discount_code.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL(10, 2);
    RETURN;
  END IF;
  
  -- Check minimum purchase amount
  IF v_discount_code.min_purchase_amount > p_subtotal THEN
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
  RETURN QUERY SELECT v_discount_code.id, v_discount_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
