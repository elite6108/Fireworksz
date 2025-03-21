import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../store/auth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Order } from '../types';

export function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user?.id) return;

    try {
      console.log('Fetching orders for user:', user.id);
      
      // First, get the order IDs to check which ones need items
      const { data: orderIds, error: orderIdsError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (orderIdsError) {
        console.error('Error fetching order IDs:', orderIdsError);
        toast.error('Failed to load your orders. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log(`Found ${orderIds?.length || 0} order IDs`);
      
      // For each order that has no items, create them from the items JSONB data
      for (const orderIdObj of orderIds || []) {
        const orderId = orderIdObj.id;
        
        // Check if this order has any order_items
        const { data: orderItemsCount, error: countError } = await supabase
          .from('order_items')
          .select('id', { count: 'exact' })
          .eq('order_id', orderId);
          
        if (countError) {
          console.error(`Error checking order_items for order ${orderId}:`, countError);
          continue;
        }
        
        console.log(`Order ${orderId} has ${orderItemsCount?.length || 0} order_items`);
        
        // If no order_items, try to create them from the items JSONB data
        if (!orderItemsCount || orderItemsCount.length === 0) {
          console.log(`Creating order_items for order ${orderId}`);
          
          // Get the order with its items JSONB data
          const { data: orderWithItems, error: orderError } = await supabase
            .from('orders')
            .select('id, items')
            .eq('id', orderId)
            .single();
            
          if (orderError) {
            console.error(`Error fetching order ${orderId}:`, orderError);
            continue;
          }
          
          if (orderWithItems?.items && Array.isArray(orderWithItems.items) && orderWithItems.items.length > 0) {
            console.log(`Order ${orderId} has ${orderWithItems.items.length} items in JSONB`);
            
            // Create order_items for each item in the JSONB data
            for (const item of orderWithItems.items) {
              // Get product data
              const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, name, description, image_url, category, price')
                .eq('id', item.product_id || item.id)
                .single();
                
              if (productError) {
                console.error(`Error fetching product for item in order ${orderId}:`, productError);
                continue;
              }
              
              // Create the order_item
              const { error: insertError } = await supabase
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
                
              if (insertError) {
                console.error(`Error creating order_item for order ${orderId}:`, insertError);
              } else {
                console.log(`Created order_item for product ${productData.name} in order ${orderId}`);
              }
            }
          } else {
            console.log(`Order ${orderId} has no items in JSONB data`);
          }
        }
      }
      
      // Now fetch all orders with their order_items
      const { data: orders, error } = await supabase
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
          shipping_cost,
          shipping_rate_id,
          shipping_rates (
            id,
            name,
            cost
          ),
          order_items (
            id,
            product_id,
            quantity,
            price,
            product_name,
            product_description,
            image_url,
            category,
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load your orders. Please try again.');
        setLoading(false);
        return;
      }

      console.log(`Found ${orders?.length || 0} orders`);
      
      // Log each order's data for debugging
      orders?.forEach(order => {
        console.log(`Order ${order.id}:`, {
          email: order.email,
          phone: order.phone,
          items_count: order.order_items?.length || 0
        });
      });

      // Transform the data to match our Order interface
      const transformedOrders = (orders || []).map(order => {
        // Extract contact info from shipping_address if email/phone are not directly on the order
        const email = order.email || (order.shipping_address && order.shipping_address.email) || 'N/A';
        const phone = order.phone || (order.shipping_address && order.shipping_address.phone) || 'N/A';
        
        return {
          ...order,
          email,
          phone,
          shipping_address: order.shipping_address || {
            full_name: 'N/A',
            address: 'N/A',
            city: 'N/A',
            state: 'N/A',
            zip_code: 'N/A',
            country: 'N/A'
          },
          shipping_method: order.shipping_rates ? {
            name: order.shipping_rates.name,
            cost: parseFloat(order.shipping_rates.cost)
          } : null,
          shipping_cost: order.shipping_rates ? parseFloat(order.shipping_rates.cost) : (parseFloat(order.shipping_cost) || 0),
          items: (order.order_items || []).map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: parseFloat(item.price),
            product: item.products || {
              id: item.product_id,
              name: item.product_name || 'Product Not Found',
              description: item.product_description || '',
              image_url: item.image_url || '',
              category: item.category || 'N/A',
              price: parseFloat(item.price),
              stock: 0,
              created_at: new Date().toISOString()
            }
          }))
        };
      }) as Order[];

      console.log('Transformed orders:', transformedOrders);
      setOrders(transformedOrders);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchOrders:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      console.log('Orders component: User authenticated, fetching orders');
      // Force a hard refresh of orders data
      setTimeout(() => {
        console.log("Attempting to fetch orders after timeout");
        fetchOrders();
      }, 500);

      // Debug the user object
      console.log("Current user:", user);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your orders</h2>
          <Link to="/auth" className="text-purple-600 hover:text-purple-700">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No orders yet</h2>
          <p className="text-gray-600 mb-8">Start shopping to create your first order!</p>
          <Link to="/shop" className="text-purple-600 hover:text-purple-700 inline-flex items-center">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center mb-8">
        <Link to="/" className="flex items-center text-purple-600 hover:text-purple-700">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Shop
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-8">Your Orders ({orders.length})</h2>
      
      {/* Debug output */}
      <div className="bg-yellow-100 p-4 mb-6 rounded">
        <h3 className="font-bold">Debug Info:</h3>
        <p>User ID: {user?.id || 'Not logged in'}</p>
        <p>Orders count: {orders.length}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <pre className="mt-2 text-xs overflow-auto max-h-40">
          {JSON.stringify(orders.slice(0, 1), null, 2)}
        </pre>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
          <Link to="/" className="text-purple-600 hover:text-purple-700">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                  <p className="text-sm text-gray-500">
                    Placed on {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  {order.updated_at !== order.created_at && (
                    <p className="text-xs text-gray-400">
                      Last updated: {new Date(order.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  order.status === 'refunded' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              {/* Contact Information */}
              <div className="mb-4 bg-gray-50 p-3 rounded">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm">{order.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm">{order.phone}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="mb-4 bg-gray-50 p-3 rounded">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping Address</h4>
                <p className="text-sm">{order.shipping_address.full_name}</p>
                <p className="text-sm">{order.shipping_address.address}</p>
                <p className="text-sm">
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip_code}
                </p>
                <p className="text-sm">{order.shipping_address.country}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Order Summary</h4>
                <div className="space-y-2">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <div className="flex items-center">
                          {item.product?.image_url && (
                            <img 
                              src={item.product.image_url} 
                              alt={item.product?.name} 
                              className="h-10 w-10 object-cover rounded mr-3"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.product?.name || 'Product'}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No items found for this order</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">Total</p>
                    <p className="text-sm font-bold">${parseFloat(order.total.toString()).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}