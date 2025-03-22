// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0";

// Get environment variables
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_51R4Y8ZA7SYYwoWYUNbgZsad1F9z0xaFCbPNcvnuEYPnFXV3Uowlb1hREqYsBug8LBzWPP1t9Ned0HS9P2Uc6zMhN00P0JrqKJ5';

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      status: 204,
    });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    const { 
      line_items, 
      success_url, 
      cancel_url, 
      order_id, 
      user_id, 
      payment_id,
      discount_info
    } = requestData;

    console.log('Request body:', requestData);

    // Validate required parameters
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid line items' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
          } 
        }
      );
    }

    if (!success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'Missing success_url or cancel_url' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
          } 
        }
      );
    }

    // Create metadata object with proper typing
    const metadata: Record<string, string> = {
      order_id: order_id.toString(),
      user_id: user_id.toString(),
      payment_id: payment_id.toString()
    };

    // Add discount info to metadata if available
    if (discount_info) {
      metadata.discount_code = discount_info.code;
      if (discount_info.amount) {
        metadata.discount_amount = discount_info.amount.toString();
      }
    }

    // Prepare line items array
    const checkoutLineItems = [...line_items];
    
    // Add discount as a negative line item if applicable
    if (discount_info && discount_info.amount && discount_info.amount > 0) {
      // Convert discount amount to cents and ensure it's a negative value
      const discountAmountInCents = Math.round(discount_info.amount * 100);
      
      checkoutLineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Discount (${discount_info.code})`,
            description: 'Applied discount code'
          },
          unit_amount: -discountAmountInCents,
        },
        quantity: 1
      });
    }

    // Create the checkout session
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: checkoutLineItems,
      mode: 'payment',
      success_url,
      cancel_url,
      metadata
    };

    console.log('Creating session with params:', sessionParams);
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('Session created:', session.id);

    // Return the session ID and URL
    return new Response(
      JSON.stringify({
        id: session.id,
        url: session.url,
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        } 
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        } 
      }
    );
  }
});
