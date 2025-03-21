import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Order } from '../types';

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateShippingCost: (orderId: string, shippingCost: number) => Promise<void>;
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
            const { data: testData, error: testError } = await supabase
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

            return {
              ...order,
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
        try {
          const timestamp = new Date().toISOString();
          const { error } = await supabase
            .from('orders')
            .update({ status, updated_at: timestamp })
            .eq('id', orderId);

          if (error) throw error;

          // Optimistically update the local state
          const { orders } = get();
          const updatedOrders = orders.map(order =>
            order.id === orderId ? { ...order, status, updated_at: timestamp } : order
          );
          set({ orders: updatedOrders });

          toast.success('Order status updated successfully');
        } catch (error) {
          console.error('Error updating order status:', error);
          toast.error('Failed to update order status');

          // Refresh orders to ensure consistency
          get().fetchOrders();
        }
      },

      updateShippingCost: async (orderId, shippingCost) => {
        try {
          const timestamp = new Date().toISOString();

          // Calculate the new total by adding shipping cost to the sum of item prices
          const { orders } = get();
          const order = orders.find(o => o.id === orderId);

          if (!order) {
            throw new Error('Order not found');
          }

          // Calculate subtotal (sum of item prices * quantities)
          const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          // New total is subtotal + shipping cost
          const total = subtotal + shippingCost;

          // Check if shipping_cost column exists before updating
          let includeShippingCost = true;
          try {
            // Test query to check if shipping_cost exists
            const { data: testData, error: testError } = await supabase
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

          const { error } = await supabase
            .from('orders')
            .update({
              total: total,
              updated_at: timestamp,
              ...(includeShippingCost && { shipping_cost: shippingCost })
            })
            .eq('id', orderId);

          if (error) throw error;

          // Optimistically update the local state
          const updatedOrders = orders.map(order =>
            order.id === orderId ? {
              ...order,
              shipping_cost: includeShippingCost ? shippingCost : order.shipping_cost,
              total: total,
              updated_at: timestamp
            } : order
          );
          set({ orders: updatedOrders });

          toast.success('Shipping cost updated successfully');
        } catch (error) {
          console.error('Error updating shipping cost:', error);
          toast.error('Failed to update shipping cost');

          // Refresh orders to ensure consistency
          get().fetchOrders();
        }
      }
    }),
    {
      name: 'orders-storage',
      partialize: (state) => ({
        orders: state.orders,
      }),
    }
  )
);
