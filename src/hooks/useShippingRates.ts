import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface ShippingRate {
  id: string;
  name: string;
  cost: number;
  is_default: boolean;
  created_at: string;
}

// Temporary in-memory shipping rates until database is set up
const DEFAULT_SHIPPING_RATES: ShippingRate[] = [
  {
    id: '1',
    name: 'Standard Shipping',
    cost: 5.99,
    is_default: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Express Shipping',
    cost: 15.99,
    is_default: false,
    created_at: new Date().toISOString()
  }
];

export const useShippingRates = () => {
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [defaultRate, setDefaultRate] = useState<ShippingRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [usingLocalRates, setUsingLocalRates] = useState(false);

  const fetchShippingRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to query shipping_rates table
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching shipping rates:', error);
        
        // If table doesn't exist, use local rates
        if (error.code === '42P01') { // Table doesn't exist
          console.log('Using local shipping rates since database table is not available');
          setShippingRates(DEFAULT_SHIPPING_RATES);
          setUsingLocalRates(true);
          
          // Find default rate in local rates
          const defaultShippingRate = DEFAULT_SHIPPING_RATES.find(rate => rate.is_default);
          setDefaultRate(defaultShippingRate || DEFAULT_SHIPPING_RATES[0]);
        } else {
          setError(new Error(error.message));
          toast.error('Failed to load shipping options');
        }
      } else if (data) {
        setShippingRates(data);
        setUsingLocalRates(false);
        
        // Find default rate
        const defaultShippingRate = data.find(rate => rate.is_default);
        setDefaultRate(defaultShippingRate || (data.length > 0 ? data[0] : null));
        
        console.log('Fetched shipping rates:', data);
      }
    } catch (err) {
      console.error('Error in fetchShippingRates:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      
      // Fallback to local rates
      setShippingRates(DEFAULT_SHIPPING_RATES);
      setUsingLocalRates(true);
      
      // Find default rate in local rates
      const defaultShippingRate = DEFAULT_SHIPPING_RATES.find(rate => rate.is_default);
      setDefaultRate(defaultShippingRate || DEFAULT_SHIPPING_RATES[0]);
      
      toast.error('Failed to load shipping options');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingRates();
  }, []);

  return {
    shippingRates,
    defaultRate,
    loading,
    error,
    usingLocalRates,
    refetch: fetchShippingRates
  };
};
