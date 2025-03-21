import { supabase } from '../lib/supabase';

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    image_url: string;
  };
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  total: number;
  created_at: string;
  items: OrderItem[];
}

export class OrderService {
  static async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(
            name,
            image_url
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    return data || [];
  }

  static async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    // First check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }
    
    // Verify admin role
    if (user.user_metadata?.role !== 'admin') {
      throw new Error('Admin privileges required');
    }
    
    // Get the current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      throw fetchError;
    }
    
    console.log('Current order before update:', currentOrder);
    
    // Execute a raw SQL update to bypass any potential RLS issues
    // This is a more direct approach that might work when the regular update fails
    const { error: updateError } = await supabase.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_status: status
    });
    
    if (updateError) {
      console.error('Error updating order status:', updateError);
      throw updateError;
    }
    
    // Fetch the updated order with all its relations
    const { data: updatedOrder, error: refetchError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(
            name,
            image_url
          )
        )
      `)
      .eq('id', orderId)
      .single();
      
    if (refetchError || !updatedOrder) {
      console.error('Error fetching updated order:', refetchError);
      throw refetchError || new Error('Failed to fetch updated order');
    }
    
    // Verify the update was successful
    if (updatedOrder.status !== status) {
      console.error('Order status mismatch:', { 
        expected: status, 
        received: updatedOrder.status
      });
      throw new Error('Order status update failed - status was not changed');
    }
    
    return updatedOrder;
  }
}
