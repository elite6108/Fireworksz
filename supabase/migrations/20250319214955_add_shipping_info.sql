-- Add shipping info columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Add RLS policy for shipping info
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own orders
CREATE POLICY "Users can view their own orders"
    ON orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to create their own orders
CREATE POLICY "Users can create their own orders"
    ON orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own orders
CREATE POLICY "Users can update their own orders"
    ON orders
    FOR UPDATE
    USING (auth.uid() = user_id);
