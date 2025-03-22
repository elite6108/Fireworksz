-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Users can view active discount codes" ON discount_codes;

-- Create updated policy to allow admins to manage discount codes
CREATE POLICY "Admins can manage discount codes" ON discount_codes
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- Policy to allow all users to view active discount codes
CREATE POLICY "Users can view active discount codes" ON discount_codes
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE AND (end_date IS NULL OR end_date > NOW()) AND (usage_limit IS NULL OR usage_count < usage_limit));
