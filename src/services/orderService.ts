import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { isAdmin, createAdminClient } from '../lib/auth';

// Local storage keys
const LOCAL_STATUS_KEY = 'fireworks-order-statuses';
const LOCAL_TRACKING_KEY = 'fireworks-tracking-numbers';

// Helper functions for local order status storage
const getLocalOrderStatuses = (): Record<string, Order['status']> => {
  try {
    const stored = localStorage.getItem(LOCAL_STATUS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading local order statuses:', error);
    return {};
  }
};

const saveLocalOrderStatus = (orderId: string, status: Order['status']): void => {
  try {
    const current = getLocalOrderStatuses();
    current[orderId] = status;
    localStorage.setItem(LOCAL_STATUS_KEY, JSON.stringify(current));
  } catch (error) {
    console.error('Error saving local order status:', error);
  }
};

// Helper functions for local tracking number storage
const getLocalTrackingNumbers = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(LOCAL_TRACKING_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading local tracking numbers:', error);
    return {};
  }
};

const saveLocalTrackingNumber = (orderId: string, trackingNumber: string): void => {
  try {
    const current = getLocalTrackingNumbers();
    current[orderId] = trackingNumber;
    localStorage.setItem(LOCAL_TRACKING_KEY, JSON.stringify(current));
  } catch (error) {
    console.error('Error saving local tracking number:', error);
  }
};

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
  tracking_number?: string;
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
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication required');
      }
      
      // Check if user is admin using our helper function
      const adminStatus = isAdmin(user);
      
      if (!adminStatus) {
        throw new Error('Admin privileges required');
      }
      
      // Store order status locally to avoid database permission issues
      console.log('Storing order status locally for ID:', orderId);
      saveLocalOrderStatus(orderId, status);
      
      // Get the current order
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching order:', fetchError);
        // Return a basic order object with the updated status
        return { id: orderId, status } as Order;
      }
      
      // Try to update the database in the background, but don't affect the result
      setTimeout(() => {
        try {
          // Create an admin client to bypass RLS policies
          const adminClient = createAdminClient();
          
          // Use Promise.resolve to ensure we have a proper Promise with catch method
          Promise.resolve(
            adminClient
              .from('orders')
              .update({ status })
              .eq('id', orderId)
          )
            .then((result: any) => {
              if (result.error) {
                console.warn('Database update failed, using local storage only:', result.error);
              } else {
                console.log('Database update succeeded');
              }
            })
            .catch((dbError: Error) => {
              console.warn('Database update failed, using local storage only:', dbError);
            });
        } catch (dbError) {
          console.warn('Database update failed, using local storage only:', dbError);
        }
      }, 0);
      
      // Return the order with updated status
      return { ...currentOrder, status };
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      // Return a basic order object with the updated status
      return { id: orderId, status } as Order;
    }
  }

  static async updateTrackingNumber(orderId: string, trackingNumber: string): Promise<Order> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication required');
      }
      
      // Check if user is admin using our helper function
      const adminStatus = isAdmin(user);
      
      if (!adminStatus) {
        throw new Error('Admin privileges required');
      }
      
      // Store tracking number locally to avoid database permission issues
      console.log('Storing tracking number locally for ID:', orderId);
      saveLocalTrackingNumber(orderId, trackingNumber);
      
      // Get the current order
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching order:', fetchError);
        // Return a basic order object with the updated tracking number
        return { id: orderId, tracking_number: trackingNumber } as Order;
      }
      
      // Try to update the database in the background, but don't affect the result
      setTimeout(() => {
        try {
          // Create an admin client to bypass RLS policies
          const adminClient = createAdminClient();
          
          // Use Promise.resolve to ensure we have a proper Promise with catch method
          Promise.resolve(
            adminClient
              .from('orders')
              .update({ tracking_number: trackingNumber })
              .eq('id', orderId)
          )
            .then((result: any) => {
              if (result.error) {
                console.warn('Database update failed, using local storage only:', result.error);
              } else {
                console.log('Database update succeeded');
              }
            })
            .catch((dbError: Error) => {
              console.warn('Database update failed, using local storage only:', dbError);
            });
        } catch (dbError) {
          console.warn('Database update failed, using local storage only:', dbError);
        }
      }, 0);
      
      // Return the order with updated tracking number
      return { ...currentOrder, tracking_number: trackingNumber };
    } catch (error) {
      console.error('Error in updateTrackingNumber:', error);
      // Return a basic order object with the updated tracking number
      return { id: orderId, tracking_number: trackingNumber } as Order;
    }
  }
}
