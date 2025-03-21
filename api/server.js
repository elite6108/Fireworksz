import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Fireworks E-commerce API is running!');
});

// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    // Parse the request body
    const { line_items, success_url, cancel_url, order_id, user_id, payment_id } = req.body;

    // Validate required parameters
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({
        error: 'Invalid line_items parameter. Must be a non-empty array.'
      });
    }

    if (!success_url) {
      return res.status(400).json({
        error: 'Missing success_url parameter.'
      });
    }

    if (!cancel_url) {
      return res.status(400).json({
        error: 'Missing cancel_url parameter.'
      });
    }

    if (!order_id) {
      return res.status(400).json({
        error: 'Missing order_id parameter.'
      });
    }

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing user_id parameter.'
      });
    }

    console.log('Creating checkout session with line items:', JSON.stringify(line_items, null, 2));

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: {
        order_id,
        user_id,
        payment_id
      }
    });

    console.log('Checkout session created successfully:', session.id);

    // Return the session
    return res.status(200).json({
      id: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

// Special middleware for Stripe webhooks to get the raw body
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

// Handle Stripe webhook events
app.post('/api/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    // Verify the webhook signature if webhook secret is provided
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } else {
      // For local development without webhook signature verification
      console.log('⚠️ Webhook signature verification bypassed. This should only be used in development.');
      event = req.body;
    }
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Extract metadata from the session
        const orderId = session.metadata?.order_id;
        const userId = session.metadata?.user_id;
        const paymentId = session.metadata?.payment_id;
        
        console.log(`Processing checkout.session.completed for order: ${orderId}, user: ${userId}, payment: ${paymentId}`);
        
        // First, check if the order has items
        const { data: orderWithItems, error: orderItemsError } = await supabase
          .from('orders')
          .select(`
            id,
            items,
            order_items (count)
          `)
          .eq('id', orderId)
          .single();
          
        if (orderItemsError) {
          console.error('Error checking order items:', orderItemsError);
        } else {
          console.log('Order items check:', orderWithItems);
          
          // If the order has items stored in the JSONB column but no order_items records
          if (orderWithItems?.items && 
              Array.isArray(orderWithItems.items) && 
              orderWithItems.items.length > 0 && 
              (!orderWithItems.order_items || orderWithItems.order_items.count === 0)) {
            
            console.log('Creating order_items from items JSONB data');
            
            // Create order_items records from the items JSONB data
            for (const item of orderWithItems.items) {
              // Retrieve product data from Supabase
              const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, name, description, image_url, category, price')
                .eq('id', item.id)
                .single();

              if (productError) {
                console.error('Error retrieving product data:', productError);
              } else {
                console.log('Retrieved product data:', productData);
                
                const { data: orderItemData, error: orderItemError } = await supabase
                  .from('order_items')
                  .insert({
                    order_id: orderId,
                    product_id: productData.id,
                    product_name: productData.name,
                    product_description: productData.description,
                    image_url: productData.image_url,
                    category: productData.category,
                    quantity: item.quantity,
                    price: productData.price
                  });

                if (orderItemError) {
                  console.error('Error creating order item:', orderItemError);
                } else {
                  console.log('Created order item:', orderItemData);
                }
              }
            }
          }
        }
        
        // Update the order status
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .update({ 
            status: 'confirmed',
            payment_status: 'completed'
          })
          .eq('id', orderId)
          .select();
          
        if (orderError) {
          console.error('Error updating order status:', orderError);
        } else {
          console.log('Order status updated successfully:', orderData);
        }
        
        // Update the payment record
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .update({ 
            status: 'completed',
            payment_intent_id: session.payment_intent,
            metadata: {
              session_id: session.id,
              payment_intent_id: session.payment_intent
            }
          })
          .eq('id', paymentId)
          .select();
          
        if (paymentError) {
          console.error('Error updating payment record:', paymentError);
        } else {
          console.log('Payment record updated successfully:', paymentData);
        }
        
        // Call the database function to update payment and order status (if it exists)
        try {
          const { data, error } = await supabase.rpc('handle_stripe_webhook_event', {
            event_type: event.type,
            payment_intent_id: session.payment_intent,
            session_id: session.id,
            status: 'paid'
          });
          
          if (error) {
            console.error('Error calling webhook handler function:', error);
          } else {
            console.log('Webhook handler function executed successfully:', data);
          }
        } catch (rpcError) {
          console.error('RPC function may not exist, falling back to direct updates:', rpcError);
        }
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
