-- Add shipping_cost column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- Update existing orders to use shipping cost from shipping rates if available
UPDATE orders
SET shipping_cost = sr.cost
FROM shipping_rates sr
WHERE orders.shipping_rate_id = sr.id AND orders.shipping_cost = 0;
