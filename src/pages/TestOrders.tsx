import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../store/auth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function TestOrders() {
  const { user } = useAuth();
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRawOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      console.log('Test component: Fetching raw orders for user:', user.id);
      
      // Simple query to get just the basic order data
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching raw orders:', error);
        setError(error.message);
        toast.error('Failed to load orders data');
        return;
      }

      console.log('Raw orders data:', data);
      setRawData(data || []);
    } catch (e: any) {
      console.error('Exception in fetchRawOrders:', e);
      setError(e.message);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      console.log('TestOrders: User authenticated, fetching raw data');
      fetchRawOrders();
    }
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-5 w-5" />
          <span>Back to Home</span>
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">Test Orders Page</h1>
      
      <div className="bg-blue-100 p-4 mb-6 rounded">
        <h3 className="font-bold">Debug Info:</h3>
        <p>User ID: {user?.id || 'Not logged in'}</p>
        <p>Raw Data Count: {rawData.length}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        {error && <p className="text-red-500">Error: {error}</p>}
        <button 
          onClick={fetchRawOrders}
          className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : rawData.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No orders found in the database.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Raw Orders Data:</h2>
          {rawData.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-medium">Order #{order.id.slice(0, 8)}</h3>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100">
                  {order.status}
                </span>
              </div>
              <p>Created: {new Date(order.created_at).toLocaleString()}</p>
              <p>Email: {order.email || 'N/A'}</p>
              <p>Phone: {order.phone || 'N/A'}</p>
              <p>Total: ${parseFloat(order.total).toFixed(2)}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => console.log('Full order data:', order)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  Log Full Data to Console
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TestOrders;
