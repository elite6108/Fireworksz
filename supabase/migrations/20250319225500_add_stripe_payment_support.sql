-- Add Stripe payment support to the database

-- Add all required columns to orders table for checkout functionality
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS shipping_rate TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax DECIMAL(10, 2) DEFAULT 0;

-- Create payments table to track Stripe payments
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  order_id UUID NOT NULL,
  payment_intent_id TEXT,
  payment_method TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Add RLS policies for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own payments
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = payments.user_id);

-- Allow authenticated users to insert payments
CREATE POLICY "Authenticated users can insert payments" ON payments
  FOR INSERT
  WITH CHECK (
    auth.uid() = payments.user_id
  );

-- Allow authenticated users to update their own payments
CREATE POLICY "Users can update their own payments" ON payments
  FOR UPDATE
  USING (
    auth.uid() = payments.user_id
  );

-- Allow authenticated users to delete their own payments
CREATE POLICY "Users can delete their own payments" ON payments
  FOR DELETE
  USING (
    auth.uid() = payments.user_id
  );

-- Note: The RPC functions for payment processing have been moved to 20250319224500_fix_rpc_functions.sql
-- This includes:
-- 1. create_payment_record
-- 2. update_order_payment_status
-- 3. handle_stripe_webhook_event
