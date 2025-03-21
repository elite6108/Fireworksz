import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ShippingRate {
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

const ShippingSettings = () => {
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRate, setNewRate] = useState({ name: '', cost: 0, is_default: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [usingLocalRates, setUsingLocalRates] = useState(false);

  // Fetch shipping rates
  const fetchShippingRates = async () => {
    try {
      setLoading(true);
      
      // Try to query shipping_rates table
      const { data: rates, error } = await supabase
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
          toast.error('Database not configured. Using temporary shipping rates.');
        } else {
          toast.error('Failed to load shipping rates');
        }
      } else {
        setShippingRates(rates || []);
        setUsingLocalRates(false);
        console.log('Fetched shipping rates:', rates);
      }
    } catch (error) {
      console.error('Error in fetchShippingRates:', error);
      setShippingRates(DEFAULT_SHIPPING_RATES);
      setUsingLocalRates(true);
      toast.error('An error occurred. Using temporary shipping rates.');
    } finally {
      setLoading(false);
    }
  };

  // Add new shipping rate
  const addShippingRate = async () => {
    try {
      if (!newRate.name.trim()) {
        toast.error('Please enter a name for the shipping rate');
        return;
      }
      
      if (newRate.cost < 0) {
        toast.error('Shipping cost cannot be negative');
        return;
      }

      if (usingLocalRates) {
        // Add to local rates
        const newId = (Math.max(...shippingRates.map(r => parseInt(r.id))) + 1).toString();
        
        // If this is set as default, update existing default first
        let updatedRates = [...shippingRates];
        if (newRate.is_default) {
          updatedRates = updatedRates.map(rate => ({
            ...rate,
            is_default: false
          }));
        }
        
        // Add new rate
        updatedRates.push({
          id: newId,
          name: newRate.name,
          cost: newRate.cost,
          is_default: newRate.is_default,
          created_at: new Date().toISOString()
        });
        
        setShippingRates(updatedRates);
        toast.success('Shipping rate added (locally)');
        setNewRate({ name: '', cost: 0, is_default: false });
        return;
      }
      
      // If this is set as default, update existing default first
      if (newRate.is_default) {
        await supabase
          .from('shipping_rates')
          .update({ is_default: false })
          .eq('is_default', true);
      }
      
      // Insert new rate
      const { error } = await supabase
        .from('shipping_rates')
        .insert({
          name: newRate.name,
          cost: newRate.cost,
          is_default: newRate.is_default
        });
      
      if (error) {
        console.error('Error adding shipping rate:', error);
        toast.error('Failed to add shipping rate');
      } else {
        toast.success('Shipping rate added successfully');
        setNewRate({ name: '', cost: 0, is_default: false });
        fetchShippingRates();
      }
    } catch (error) {
      console.error('Error in addShippingRate:', error);
      toast.error('An error occurred while adding the shipping rate');
    }
  };

  // Update shipping rate
  const updateShippingRate = async (id: string, updates: Partial<ShippingRate>) => {
    try {
      if (usingLocalRates) {
        // Update local rates
        let updatedRates = [...shippingRates];
        
        // If setting as default, update existing default first
        if (updates.is_default) {
          updatedRates = updatedRates.map(rate => ({
            ...rate,
            is_default: rate.id === id ? true : false
          }));
        } else {
          updatedRates = updatedRates.map(rate => 
            rate.id === id ? { ...rate, ...updates } : rate
          );
        }
        
        setShippingRates(updatedRates);
        toast.success('Shipping rate updated (locally)');
        setEditingId(null);
        return;
      }
      
      // If setting as default, update existing default first
      if (updates.is_default) {
        await supabase
          .from('shipping_rates')
          .update({ is_default: false })
          .eq('is_default', true);
      }
      
      const { error } = await supabase
        .from('shipping_rates')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating shipping rate:', error);
        toast.error('Failed to update shipping rate');
      } else {
        toast.success('Shipping rate updated successfully');
        setEditingId(null);
        fetchShippingRates();
      }
    } catch (error) {
      console.error('Error in updateShippingRate:', error);
      toast.error('An error occurred while updating the shipping rate');
    }
  };

  // Delete shipping rate
  const deleteShippingRate = async (id: string, isDefault: boolean) => {
    try {
      if (isDefault) {
        toast.error('Cannot delete the default shipping rate');
        return;
      }
      
      if (usingLocalRates) {
        // Delete from local rates
        setShippingRates(shippingRates.filter(rate => rate.id !== id));
        toast.success('Shipping rate deleted (locally)');
        return;
      }
      
      const { error } = await supabase
        .from('shipping_rates')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting shipping rate:', error);
        toast.error('Failed to delete shipping rate');
      } else {
        toast.success('Shipping rate deleted successfully');
        fetchShippingRates();
      }
    } catch (error) {
      console.error('Error in deleteShippingRate:', error);
      toast.error('An error occurred while deleting the shipping rate');
    }
  };

  // Set as default shipping rate
  const setAsDefault = async (id: string) => {
    try {
      if (usingLocalRates) {
        // Update local rates
        const updatedRates = shippingRates.map(rate => ({
          ...rate,
          is_default: rate.id === id ? true : false
        }));
        
        setShippingRates(updatedRates);
        toast.success('Default shipping rate updated (locally)');
        return;
      }
      
      // First, set all rates to non-default
      await supabase
        .from('shipping_rates')
        .update({ is_default: false })
        .eq('is_default', true);
      
      // Then set the selected rate as default
      const { error } = await supabase
        .from('shipping_rates')
        .update({ is_default: true })
        .eq('id', id);
      
      if (error) {
        console.error('Error setting default shipping rate:', error);
        toast.error('Failed to set default shipping rate');
      } else {
        toast.success('Default shipping rate updated');
        fetchShippingRates();
      }
    } catch (error) {
      console.error('Error in setAsDefault:', error);
      toast.error('An error occurred while setting the default shipping rate');
    }
  };

  useEffect(() => {
    fetchShippingRates();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Shipping Settings</h2>
      
      {usingLocalRates && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-700">
            <strong>Note:</strong> Database table for shipping rates is not available. 
            Changes made here will be temporary and lost on page refresh.
          </p>
          <p className="text-yellow-700 mt-1">
            Please run the migration to create the shipping_rates table for permanent storage.
          </p>
        </div>
      )}
      
      {/* Add new shipping rate */}
      <div className="mb-8 p-4 bg-gray-50 rounded-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Shipping Rate</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={newRate.name}
              onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="e.g., Standard Shipping"
            />
          </div>
          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
              Cost ($)
            </label>
            <input
              type="number"
              id="cost"
              min="0"
              step="0.01"
              value={newRate.cost}
              onChange={(e) => setNewRate({ ...newRate, cost: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-end">
            <div className="flex items-center mr-4">
              <input
                type="checkbox"
                id="is_default"
                checked={newRate.is_default}
                onChange={(e) => setNewRate({ ...newRate, is_default: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                Set as Default
              </label>
            </div>
            <button
              onClick={addShippingRate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Add Rate
            </button>
          </div>
        </div>
      </div>
      
      {/* Shipping rates list */}
      <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Rates</h3>
      {shippingRates.length === 0 ? (
        <p className="text-gray-500 italic">No shipping rates found. Add your first shipping rate above.</p>
      ) : (
        <div className="overflow-hidden ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shippingRates.map((rate) => (
                <tr key={rate.id} className={rate.is_default ? 'bg-purple-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingId === rate.id ? (
                      <input
                        type="text"
                        value={rate.name}
                        onChange={(e) => setShippingRates(rates => 
                          rates.map(r => r.id === rate.id ? { ...r, name: e.target.value } : r)
                        )}
                        className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    ) : (
                      rate.name
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {editingId === rate.id ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.cost}
                        onChange={(e) => setShippingRates(rates => 
                          rates.map(r => r.id === rate.id ? { ...r, cost: parseFloat(e.target.value) || 0 } : r)
                        )}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    ) : (
                      `$${rate.cost.toFixed(2)}`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {rate.is_default ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => setAsDefault(rate.id)}
                        className="text-xs text-purple-600 hover:text-purple-900"
                      >
                        Set as Default
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    {editingId === rate.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => updateShippingRate(rate.id, {
                            name: rate.name,
                            cost: rate.cost,
                            is_default: rate.is_default
                          })}
                          className="text-green-600 hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            fetchShippingRates(); // Reset to original values
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => setEditingId(rate.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteShippingRate(rate.id, rate.is_default)}
                          className="text-red-600 hover:text-red-900"
                          disabled={rate.is_default}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p>Note: The default shipping rate will be automatically applied during checkout.</p>
        <p>Shipping costs cannot be modified after an order has been placed.</p>
      </div>
    </div>
  );
};

export default ShippingSettings;
