import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe('pk_test_51R4Y8ZA7SYYwoWYUbDkQ7LXoEPbgMCPYe2sRfSGY9WFbRSAbQibXzOcmtJ2jHxui8J6hs3gPdTEz9MWx02LTx9fv00TxoYH9wp');

export interface CartItem {
  id: string;
  name: string;
  images?: string[];
  quantity: number;
  price: number;
  product?: any;
}

export interface LineItem {
  price_data: {
    currency: string;
    product_data: {
      name: string;
      images?: string[];
    };
    unit_amount: number;
  };
  quantity: number;
}

export interface CheckoutSessionParams {
  line_items: LineItem[];
  success_url: string;
  cancel_url: string;
}

export class StripeService {
  static async createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<Response> {
    try {
      // Call our serverless function to create a checkout session
      const response = await supabase.functions.invoke('create-checkout-session', {
        body: params,
      });

      if (response.error) {
        console.error('Error creating checkout session:', response.error);
        throw new Error(response.error.message);
      }

      return new Response(JSON.stringify(response.data), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }

  static async redirectToCheckout(sessionId: string): Promise<void> {
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Redirect to checkout error:', error);
      throw new Error(`Failed to redirect to checkout: ${error.message}`);
    }
  }

  static getStripeInstance() {
    return stripePromise;
  }
}
