-- Add a completely new customer feedback table
-- This table will store customer feedback and ratings for products

-- Create the customer_feedback table
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON customer_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_product_id ON customer_feedback(product_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON customer_feedback(rating);

-- Add RLS policies
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to view public feedback or their own feedback
CREATE POLICY "Users can view public feedback or their own"
  ON customer_feedback FOR SELECT
  USING (is_public OR auth.uid() = user_id);

-- Allow users to insert their own feedback
CREATE POLICY "Users can add their own feedback"
  ON customer_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own feedback
CREATE POLICY "Users can update their own feedback"
  ON customer_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own feedback
CREATE POLICY "Users can delete their own feedback"
  ON customer_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_feedback_timestamp
BEFORE UPDATE ON customer_feedback
FOR EACH ROW
EXECUTE FUNCTION update_feedback_updated_at();