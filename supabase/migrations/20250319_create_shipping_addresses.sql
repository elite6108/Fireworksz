-- Create shipping_addresses table
CREATE TABLE IF NOT EXISTS shipping_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own shipping addresses
CREATE POLICY "Users can view their own shipping addresses"
    ON shipping_addresses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to create their own shipping addresses
CREATE POLICY "Users can create their own shipping addresses"
    ON shipping_addresses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add shipping_address_id to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES shipping_addresses(id),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;
