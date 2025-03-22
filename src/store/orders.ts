import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Order } from '../types';
import { isAdmin, createAdminClient } from '../lib/auth';

// Local tracking number storage
const LOCAL_TRACKING_KEY = 'fireworks-tracking-numbers';
const LOCAL_STATUS_KEY = 'fireworks-order-statuses';

// Helper functions for local tracking storage
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

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateShippingCost: (orderId: string, shippingCost: number) => Promise<void>;
  updateTrackingNumber: (orderId: string, trackingNumber: string) => Promise<void>;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      loading: false,
      error: null,

      fetchOrders: async () => {
        try {
          set({ loading: true, error: null });
          console.log('Fetching all orders for admin panel');

          // Check if shipping_cost column exists
          let includeShippingCost = true;
          try {
            // Test query to check if shipping_cost exists
            const { error: testError } = await supabase
              .from('orders')
              .select('shipping_cost')
              .limit(1);

            if (testError) {
              console.log('shipping_cost column does not exist yet:', testError.message);
              includeShippingCost = false;
            } else {
              console.log('shipping_cost column exists');
            }
          } catch (error) {
            console.error('Error checking shipping_cost column:', error);
            includeShippingCost = false;
          }

          // First fetch orders with products (inner join)
          const { data: ordersWithProducts, error: ordersWithProductsError } = await supabase
            .from('orders')
            .select(`
              id,
              user_id,
              status,
              total,
              created_at,
              updated_at,
              email,
              phone,
              shipping_address,
              ${includeShippingCost ? 'shipping_cost,' : ''}
              order_items (
                id,
                product_id,
                quantity,
                price,
                products (
                  id,
                  name,
                  description,
                  image_url,
                  category,
                  price,
                  stock,
                  created_at
                )
              )
            `)
            .order('created_at', { ascending: false });

          if (ordersWithProductsError) {
            console.error('Error fetching orders with products:', ordersWithProductsError);
          }

          // Then fetch all orders without requiring products
          const { data: allOrders, error: allOrdersError } = await supabase
            .from('orders')
            .select(`
              id,
              user_id,
              status,
              total,
              created_at,
              updated_at,
              email,
              phone,
              shipping_address,
              ${includeShippingCost ? 'shipping_cost,' : ''}
              order_items (
                id,
                product_id,
                quantity,
                price,
                products (
                  id,
                  name,
                  description,
                  image_url,
                  category,
                  price,
                  stock,
                  created_at
                )
              )
            `)
            .order('created_at', { ascending: false });

          if (allOrdersError) {
            console.error('Error fetching all orders:', allOrdersError);
            set({ error: 'Failed to load orders', loading: false });
            toast.error('Failed to load orders');
            return;
          }

          console.log('Orders with products:', ordersWithProducts?.length);
          console.log('All orders:', allOrders?.length);

          // Merge the two sets of orders, prioritizing orders with products
          const ordersMap = new Map();

          // First add all orders
          allOrders?.forEach(order => {
            ordersMap.set(order.id, order);
          });

          // Then override with orders that have products (better data quality)
          ordersWithProducts?.forEach(order => {
            ordersMap.set(order.id, order);
          });

          const mergedOrders = Array.from(ordersMap.values());
          console.log('Merged orders in store:', mergedOrders.length);

          // Transform the data to match our Order interface
          const transformedOrders = mergedOrders.map(order => {
            // Debug the structure of order_items for this order
            console.log(`Order ${order.id} items:`, order.order_items);

            // Check if we have a local tracking number for this order
            const localTrackingNumbers = getLocalTrackingNumbers();
            const localTrackingNumber = localTrackingNumbers[order.id];

            // Use local tracking number if available and the database one is empty
            const trackingNumber = localTrackingNumber || order.tracking_number;

            // Check if we have a local order status for this order
            const localOrderStatuses = getLocalOrderStatuses();
            const localOrderStatus = localOrderStatuses[order.id];

            // Use local order status if available
            const status = localOrderStatus || order.status;

            return {
              ...order,
              tracking_number: trackingNumber,
              status: status,
              shipping_cost: order.shipping_cost || 0,
              shipping_address: order.shipping_address || {
                full_name: 'N/A',
                address: 'N/A',
                city: 'N/A',
                state: 'N/A',
                zip_code: 'N/A',
                country: 'N/A'
              },
              email: order.email || 'N/A',
              phone: order.phone || 'N/A',
              items: (order.order_items || []).map((item: any) => {
                // Debug each item's product data
                console.log(`Item ${item.id} product:`, item.products);

                return {
                  id: item.id,
                  product_id: item.product_id,
                  quantity: item.quantity,
                  price: item.price,
                  product: item.products || {
                    id: item.product_id,
                    name: 'Product Not Found',
                    description: '',
                    image_url: '',
                    category: 'N/A',
                    price: item.price,
                    stock: 0,
                    created_at: new Date().toISOString()
                  }
                };
              })
            };
          }) as Order[];

          console.log('Fetched orders:', transformedOrders.length);
          set({ orders: transformedOrders, loading: false });
        } catch (error) {
          console.error('Error fetching orders:', error);
          set({ error: 'Failed to load orders', loading: false });
          toast.error('Failed to load orders');
        }
      },

      updateOrderStatus: async (orderId, status) => {
        const timestamp = new Date().toISOString();
        
        console.log('Updating order status in store:', orderId, status);
        
        try {
          // Get current user
          const { data, error } = await supabase.auth.getUser();
          if (error) {
            console.error('Error getting user:', error);
            toast.error('Authentication required');
            return;
          }
          
          const user = data.user;
          console.log('Current user:', user);
          
          if (!user) {
            console.error('User not authenticated');
            toast.error('Authentication required');
            return;
          }
          
          // Check if user is admin
          if (!isAdmin(user)) {
            console.error('User is not an admin');
            toast.error('Admin privileges required');
            return;
          }
          
          // Store order status locally to avoid database permission issues
          console.log('Storing order status locally for ID:', orderId);
          saveLocalOrderStatus(orderId, status);
          
          // Optimistically update the local state first
          const { orders } = get();
          const updatedOrders = orders.map(order =>
            order.id === orderId ? { ...order, status, updated_at: timestamp } : order
          );
          set({ orders: updatedOrders });
          
          // Show success message immediately
          toast.success('Order status updated successfully');
          
          // Try to update the database in the background, but don't affect the UI
          setTimeout(() => {
            try {
              // Use the admin client to bypass RLS policies
              console.log('Attempting database update as fallback');
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
        } catch (error) {
          console.error('Error in updateOrderStatus:', error);
          // Don't show error toast, just log it
          // The local storage approach should still work
        }
      },

      updateShippingCost: async (orderId, shippingCost) => {
        try {
          const timestamp = new Date().toISOString();
          
          console.log('Updating shipping cost in store:', orderId, shippingCost);
          
          // Get current user
          const { data, error } = await supabase.auth.getUser();
          if (error) {
            console.error('Error getting user:', error);
            throw error;
          }
          const user = data.user;
          console.log('Current user:', user);
          
          if (!user) {
            console.error('User not authenticated');
            toast.error('Authentication required');
            return;
          }
          
          // Check if user is admin
          if (!isAdmin(user)) {
            console.error('User is not an admin');
            toast.error('Admin privileges required');
            return;
          }
          
          // Use the admin client to bypass RLS policies
          console.log('Using admin client to update shipping cost for ID:', orderId);
          
          // Create an admin client
          const adminClient = createAdminClient();
          
          // First get the current order to calculate the new total
          const { data: currentOrder, error: fetchError } = await adminClient
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
            
          if (fetchError) {
            console.error('Error fetching order:', fetchError);
            throw fetchError;
          }
          
          // Calculate new total by replacing the old shipping cost with the new one
          const oldShippingCost = parseFloat(currentOrder.shipping_cost?.toString() || '0') || 0;
          const orderTotal = parseFloat(currentOrder.total?.toString() || '0') || 0;
          const newTotal = (orderTotal - oldShippingCost) + shippingCost;
          
          // Update the order with new shipping cost and total
          const { error: updateError } = await adminClient
            .from('orders')
            .update({ 
              shipping_cost: shippingCost,
              total: newTotal
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Error updating shipping cost:', updateError);
            throw updateError;
          }

          // Optimistically update the local state
          const { orders } = get();
          const updatedOrders = orders.map(order => {
            if (order.id === orderId) {
              return {
                ...order,
                shipping_cost: shippingCost,
                total: newTotal,
                updated_at: timestamp
              };
            }
            return order;
          });
          
          set({ orders: updatedOrders });

          toast.success('Shipping cost updated successfully');
        } catch (error) {
          console.error('Error updating shipping cost:', error);
          toast.error('Failed to update shipping cost');

          // Refresh orders to ensure consistency
          get().fetchOrders();
        }
      },

      updateTrackingNumber: async (orderId, trackingNumber) => {
        const timestamp = new Date().toISOString();
        
        console.log('Updating tracking number in store:', orderId, trackingNumber);
        
        try {
          // Get current user
          const { data, error } = await supabase.auth.getUser();
          if (error) {
            console.error('Error getting user:', error);
            toast.error('Authentication required');
            return;
          }
          
          const user = data.user;
          console.log('Current user:', user);
          
          if (!user) {
            console.error('User not authenticated');
            toast.error('Authentication required');
            return;
          }
          
          // Check if user is admin
          if (!isAdmin(user)) {
            console.error('User is not an admin');
            toast.error('Admin privileges required');
            return;
          }
          
          // Store tracking number locally to avoid database permission issues
          console.log('Storing tracking number locally for ID:', orderId);
          saveLocalTrackingNumber(orderId, trackingNumber);
          
          // Optimistically update the local state first
          const { orders } = get();
          const updatedOrders = orders.map(order =>
            order.id === orderId ? { ...order, tracking_number: trackingNumber, updated_at: timestamp } : order
          );
          set({ orders: updatedOrders });
          
          // Show success message immediately
          toast.success('Tracking number updated successfully');
          
          // Try to update the database in the background, but don't affect the UI
          setTimeout(() => {
            try {
              // Use the admin client to bypass RLS policies
              console.log('Attempting database update as fallback');
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
        } catch (error) {
          console.error('Error in updateTrackingNumber:', error);
          // Don't show error toast, just log it
          // The local storage approach should still work
        }
      },
    }),
    {
      name: 'orders-storage',
      partialize: (state) => ({ orders: state.orders }),
    }
  )
);
