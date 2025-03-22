import { useEffect, useState } from 'react';
import { useOrdersStore } from '../store/orders';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const AdminOrders = () => {
  const { user } = useAuth();
  const { orders, loading, fetchOrders } = useOrdersStore();
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState<{[key: string]: string}>({});

  // Direct fetch for admin orders using service role to bypass RLS
  const fetchAdminOrders = async () => {
    try {
      setAdminLoading(true);
      console.log('Directly fetching admin orders');
      
      // First, get all order IDs to check which ones need items
      const { data: orderIds, error: orderIdsError } = await supabase
        .from('orders')
        .select('id')
        .order('created_at', { ascending: false });
        
      if (orderIdsError) {
        console.error('Error fetching order IDs:', orderIdsError);
        toast.error('Failed to load orders. Please try again.');
        setAdminLoading(false);
        return;
      }
      
      console.log(`Found ${orderIds?.length || 0} order IDs for admin`);
      
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
        
        console.log(`Admin: Order ${orderId} has ${orderItemsCount?.length || 0} order_items`);
        
        // If no order_items, try to create them from the items JSONB data
        if (!orderItemsCount || orderItemsCount.length === 0) {
          console.log(`Admin: Creating order_items for order ${orderId}`);
          
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
            console.log(`Admin: Order ${orderId} has ${orderWithItems.items.length} items in JSONB`);
            
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
                console.log(`Admin: Created order_item for product ${productData.name} in order ${orderId}`);
              }
            }
          } else {
            console.log(`Admin: Order ${orderId} has no items in JSONB data`);
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
          payment_status,
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders. Please try again.');
        setAdminLoading(false);
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
      setAdminOrders(transformedOrders);
      setAdminLoading(false);
    } catch (error) {
      console.error('Error in fetchAdminOrders:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is admin
    if (user?.role === 'admin') {
      // Then fetch orders
      fetchOrders();
      fetchAdminOrders();

      // Set up real-time subscription for order updates
      const subscription = supabase
        .channel('orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          () => {
            // Refresh orders when changes occur
            fetchOrders();
            fetchAdminOrders();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fetchOrders, user]);

  // Merge orders from both sources to ensure we have all orders with product data
  const mergedOrders = [...orders];
  
  // Add any admin orders not already in the store orders
  adminOrders.forEach(adminOrder => {
    if (!mergedOrders.some(order => order.id === adminOrder.id)) {
      mergedOrders.push(adminOrder);
    }
  });
  
  // Sort by created_at date (newest first)
  const displayOrders = mergedOrders.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Debug display orders
  console.log('Display orders count:', displayOrders.length);
  if (displayOrders.length > 0) {
    console.log('First display order items:', displayOrders[0].items);
    if (displayOrders[0].items && displayOrders[0].items.length > 0) {
      console.log('First item product:', displayOrders[0].items[0].product);
    }
  }

  if ((loading && adminLoading) || displayOrders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Calculate subtotal (sum of item prices * quantities)
  const calculateSubtotal = (order: Order) => {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Handle tracking number input change
  const handleTrackingInputChange = (orderId: string, value: string) => {
    setTrackingInputs(prev => ({
      ...prev,
      [orderId]: value
    }));
  };

  // Handle tracking number submission
  const handleTrackingSubmit = async (orderId: string) => {
    const trackingNumber = trackingInputs[orderId]?.trim();
    
    if (!trackingNumber) {
      toast.error('Please enter a tracking number');
      return;
    }
    
    console.log('Submitting tracking number:', orderId, trackingNumber);
    
    try {
      // Use the store function which handles localStorage and database updates
      await useOrdersStore.getState().updateTrackingNumber(orderId, trackingNumber);
      
      // Clear the input after successful submission
      setTrackingInputs(prev => ({
        ...prev,
        [orderId]: ''
      }));
      
      // Refresh orders to show the updated tracking number
      fetchAdminOrders();
    } catch (error) {
      console.error('Error in handleTrackingSubmit:', error);
      // Error handling is done in the store function
    }
  };

  // Update order status using the store function
  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    console.log('Updating order status:', orderId, status);
    
    try {
      // Use the store function which handles localStorage and database updates
      await useOrdersStore.getState().updateOrderStatus(orderId, status);
      
      // Refresh orders to show the updated status
      fetchAdminOrders();
    } catch (error) {
      console.error('Error in handleStatusChange:', error);
      // Error handling is done in the store function
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">All Orders ({displayOrders.length})</h2>
      <div className="space-y-8">
        {displayOrders.map((order) => {
          // Debug each order's items as we render
          console.log(`Rendering order ${order.id} with ${order.items?.length || 0} items`);
          const subtotal = calculateSubtotal(order);
          
          return (
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
                <p className="text-sm mt-2">
                  <span className="font-medium">Items Ordered:</span>{' '}
                  {order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0}
                </p>
                
                {/* Display tracking number if available */}
                {order.tracking_number && (
                  <p className="text-sm mt-2">
                    <span className="font-medium">Tracking Number:</span>{' '}
                    <span className="text-blue-600">{order.tracking_number}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end space-y-2">
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                  className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
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
            </div>

            {/* Tracking number input field for shipped orders */}
            {order.status === 'shipped' && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  {order.tracking_number ? 'Update Tracking Number' : 'Add Tracking Number'}
                </h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={trackingInputs[order.id] || ''}
                    onChange={(e) => handleTrackingInputChange(order.id, e.target.value)}
                    placeholder={order.tracking_number || 'Enter tracking number'}
                    className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                  />
                  <button
                    onClick={() => handleTrackingSubmit(order.id)}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h4>
                <div className="text-sm text-gray-600">
                  <p className="mb-1">Email: {order.email !== 'N/A' ? order.email : (order.shipping_address as any)?.email || 'N/A'}</p>
                  <p>Phone: {order.phone !== 'N/A' ? order.phone : (order.shipping_address as any)?.phone || 'N/A'}</p>
                </div>
              </div>

              {order.shipping_address && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping Details</h4>
                  <div className="text-sm text-gray-600">
                    <p>{order.shipping_address.full_name}</p>
                    <p>{order.shipping_address.address}</p>
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip_code}
                    </p>
                    <p>{order.shipping_address.country}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-base font-medium text-gray-900 mb-4">Order Items</h4>
              <div className="overflow-hidden ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items?.map((item) => {
                      // Debug each item as we render it
                      console.log(`Rendering item ${item.id} with product:`, item.product);
                      return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 relative">
                              {item.product?.image_url && (
                                <img
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.product?.name || 'Product Not Found'}
                              </div>
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {item.product?.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {item.product?.category || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Subtotal:
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                        ${subtotal.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Shipping:
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                        {order.shipping_method ? (
                          <span>{order.shipping_method.name} (${order.shipping_method.cost.toFixed(2)})</span>
                        ) : (
                          <span>${order.shipping_cost.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Order Total:
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                        ${order.total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};

export default AdminOrders;