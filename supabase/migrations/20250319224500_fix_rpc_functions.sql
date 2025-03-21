-- Fix RPC functions for Stripe payment integration

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS create_payment_record(UUID, UUID, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS handle_stripe_webhook_event(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_order_payment_status(UUID, TEXT, TEXT);

-- Create or replace function to create a payment record
CREATE OR REPLACE FUNCTION create_payment_record(
  p_auth_user_id UUID,
  p_order_id UUID,
  p_stripe_session_id TEXT,
  p_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
  new_payment_id UUID;
BEGIN
  INSERT INTO payments 
    (user_id, order_id, payment_method, amount, metadata)
  VALUES 
    (p_auth_user_id, p_order_id, 'stripe', p_amount, jsonb_build_object('session_id', p_stripe_session_id))
  RETURNING id INTO new_payment_id;
  
  RETURN new_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update order payment status
CREATE OR REPLACE FUNCTION update_order_payment_status(
  order_id_param UUID,
  payment_id_param TEXT,
  status_param TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE orders
  SET 
    payment_id = payment_id_param,
    payment_status = status_param,
    updated_at = NOW()
  WHERE id = order_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle Stripe webhook events
CREATE OR REPLACE FUNCTION handle_stripe_webhook_event(
  event_type TEXT,
  payment_intent_id TEXT,
  session_id TEXT,
  status TEXT
) RETURNS JSONB AS $$
DECLARE
  payment_record RECORD;
  order_record RECORD;
  result JSONB;
BEGIN
  -- Find the payment record by payment_intent_id
  SELECT * INTO payment_record 
  FROM payments 
  WHERE payment_intent_id = handle_stripe_webhook_event.payment_intent_id
  LIMIT 1;
  
  IF payment_record IS NULL AND session_id IS NOT NULL THEN
    -- Try to find by session ID stored in metadata
    SELECT * INTO payment_record 
    FROM payments 
    WHERE metadata->>'session_id' = handle_stripe_webhook_event.session_id
    LIMIT 1;
  END IF;
  
  -- If still not found, log the error but continue processing
  IF payment_record IS NULL THEN
    RAISE LOG 'Payment record not found for session_id: % or payment_intent_id: %', 
      handle_stripe_webhook_event.session_id, 
      handle_stripe_webhook_event.payment_intent_id;
      
    -- Try to find the order directly if payment record not found
    -- This is a fallback mechanism
    IF session_id IS NOT NULL THEN
      SELECT o.* INTO order_record
      FROM orders o
      WHERE o.payment_id = handle_stripe_webhook_event.payment_intent_id
      LIMIT 1;
      
      IF order_record IS NOT NULL THEN
        -- Update order payment status directly
        UPDATE orders
        SET 
          payment_status = handle_stripe_webhook_event.status,
          updated_at = NOW()
        WHERE id = order_record.id;
        
        RETURN jsonb_build_object(
          'success', true,
          'order_id', order_record.id,
          'status', handle_stripe_webhook_event.status,
          'note', 'Updated order directly, payment record not found'
        );
      END IF;
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment record not found'
    );
  END IF;
  
  -- Update payment status
  UPDATE payments
  SET 
    status = handle_stripe_webhook_event.status,
    payment_intent_id = COALESCE(handle_stripe_webhook_event.payment_intent_id, payment_intent_id),
    updated_at = NOW()
  WHERE id = payment_record.id;
  
  -- Find the associated order
  SELECT * INTO order_record 
  FROM orders 
  WHERE id = payment_record.order_id;
  
  IF order_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order record not found'
    );
  END IF;
  
  -- Update order payment status
  PERFORM update_order_payment_status(
    order_record.id,
    payment_intent_id,
    handle_stripe_webhook_event.status
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', payment_record.id,
    'order_id', order_record.id,
    'status', handle_stripe_webhook_event.status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
