// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@14.10.0";

// Get environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Get the raw body
    const body = await req.text();
    
    // Verify the event came from Stripe
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed` }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle the event
    const { data: { object }, type } = event;
    
    console.log(`Processing Stripe webhook event: ${type}`);

    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract metadata from the session
        const orderId = session.metadata?.order_id;
        const userId = session.metadata?.user_id;
        const paymentId = session.metadata?.payment_id;
        
        console.log(`Processing checkout.session.completed for order: ${orderId}, user: ${userId}, payment: ${paymentId}`);
        
        // Call the database function to update payment and order status
        const { data, error } = await supabaseAdmin.rpc('handle_stripe_webhook_event', {
          event_type: event.type,
          payment_intent_id: session.payment_intent as string,
          session_id: session.id,
          status: 'paid'
        });
        
        if (error) {
          console.error('Error updating payment status:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        console.log('Payment status updated successfully:', data);
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Call the database function to update payment and order status
        const { data: piData, error: piError } = await supabaseAdmin.rpc('handle_stripe_webhook_event', {
          event_type: event.type,
          payment_intent_id: paymentIntent.id,
          session_id: null,
          status: 'paid'
        });
        
        if (piError) {
          console.error('Error updating payment status:', piError);
          return new Response(JSON.stringify({ error: piError.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        console.log('Payment status updated successfully:', piData);
        break;
        
      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Call the database function to update payment and order status
        const { data: failData, error: failError } = await supabaseAdmin.rpc('handle_stripe_webhook_event', {
          event_type: event.type,
          payment_intent_id: failedPaymentIntent.id,
          session_id: null,
          status: 'failed'
        });
        
        if (failError) {
          console.error('Error updating payment status:', failError);
          return new Response(JSON.stringify({ error: failError.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        console.log('Payment status updated successfully:', failData);
        break;
        
      default:
        console.log(`Unhandled event type: ${type}`);
    }

    // Return a response to acknowledge receipt of the event
    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process webhook',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
