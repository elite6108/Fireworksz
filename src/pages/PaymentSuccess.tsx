import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ShoppingBag, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useStore } from '../store';

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  payment_status?: string;
  payment_id?: string;
  shipping_address: {
    full_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
}

export function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const clearCart = useStore((state) => state.clearCart);

  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }

    const fetchOrder = async () => {
      try {
        // First try to get the order directly
        let { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('Error fetching order by ID:', error);
          
          // If we have a session ID but couldn't find the order by ID,
          // try to find the order through the payment record
          if (sessionId) {
            const { data: paymentData, error: paymentError } = await supabase
              .from('payments')
              .select('order_id')
              .filter('metadata->session_id', 'eq', sessionId)
              .single();
              
            if (paymentError) {
              throw paymentError;
            }
            
            if (paymentData && paymentData.order_id) {
              const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', paymentData.order_id)
                .single();
                
              if (orderError) {
                throw orderError;
              }
              
              data = orderData;
            }
          } else {
            throw error;
          }
        }
        
        setOrder(data);
        
        // Clear the cart once we've confirmed the order exists
        clearCart();
        
        // If the order status is still pending, update it to show as confirmed
        if (data && (data.status === 'pending' || data.payment_status === 'pending')) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: 'confirmed',
              payment_status: 'completed'
            })
            .eq('id', data.id);
            
          if (updateError) {
            console.error('Error updating order status:', updateError);
          }
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Could not find your order. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, sessionId, navigate, clearCart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h2>
          <p className="text-gray-600 mb-8">We couldn't find the order you're looking for.</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-purple-600 hover:text-purple-700"
          >
            <Home className="h-5 w-5 mr-2" />
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        <p className="text-lg text-gray-600 mb-8">
          Thank you for your purchase. Your order has been confirmed.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Order ID:</span>
            <span className="text-gray-900 font-medium">{order.id}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Date:</span>
            <span className="text-gray-900 font-medium">
              {new Date(order.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Status:</span>
            <span className="text-green-600 font-medium capitalize">
              {order.status}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Payment Status:</span>
            <span className={`font-medium capitalize ${
              order.payment_status === 'completed' ? 'text-green-600' : 
              order.payment_status === 'failed' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {order.payment_status || 'pending'}
            </span>
          </div>
          {order.shipping_address && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Shipping Details</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-900">{order.shipping_address.full_name}</p>
                <p className="text-gray-600">{order.shipping_address.address}</p>
                <p className="text-gray-600">
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip_code}
                </p>
                <p className="text-gray-600">{order.shipping_address.country}</p>
              </div>
            </div>
          )}
          <div className="flex justify-between pt-4 border-t border-gray-200 mt-4">
            <span className="text-gray-900 font-semibold">Total:</span>
            <span className="text-gray-900 font-bold">${order.total.toFixed(2)}</span>
          </div>
        </div>
        
        <p className="text-gray-600 mb-8">
          We've sent a confirmation email to your registered email address.
          You can track your order status in your account.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => navigate('/orders')}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            View My Orders
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Home className="h-5 w-5 mr-2" />
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
