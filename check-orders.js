import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
  try {
    // Fetch recent orders with shipping information
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        shipping_cost,
        shipping_rate_id,
        shipping_rates (
          id,
          name,
          cost
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }
    
    console.log('Recent orders with shipping information:');
    orders.forEach(order => {
      console.log(`Order ID: ${order.id}`);
      console.log(`  Shipping Cost: ${order.shipping_cost}`);
      console.log(`  Shipping Rate ID: ${order.shipping_rate_id}`);
      console.log(`  Shipping Rate: ${order.shipping_rates ? order.shipping_rates.name : 'N/A'}`);
      console.log(`  Shipping Rate Cost: ${order.shipping_rates ? order.shipping_rates.cost : 'N/A'}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkOrders();
