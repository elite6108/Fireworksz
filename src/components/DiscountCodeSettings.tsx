import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, X, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DiscountCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  usage_limit?: number;
  usage_count: number;
}

interface DiscountCodeFormData {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  usage_limit?: number;
}

export function DiscountCodeSettings() {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DiscountCodeFormData>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase_amount: undefined,
    max_discount_amount: undefined,
    start_date: undefined,
    end_date: undefined,
    is_active: true,
    usage_limit: undefined
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const fetchDiscountCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscountCodes(data || []);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast.error('Failed to load discount codes');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (discountCode?: DiscountCode) => {
    if (discountCode) {
      setEditingId(discountCode.id);
      setFormData({
        code: discountCode.code,
        description: discountCode.description,
        discount_type: discountCode.discount_type,
        discount_value: discountCode.discount_value,
        min_purchase_amount: discountCode.min_purchase_amount,
        max_discount_amount: discountCode.max_discount_amount,
        start_date: discountCode.start_date,
        end_date: discountCode.end_date,
        is_active: discountCode.is_active,
        usage_limit: discountCode.usage_limit
      });
    } else {
      setEditingId(null);
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase_amount: undefined,
        max_discount_amount: undefined,
        start_date: undefined,
        end_date: undefined,
        is_active: true,
        usage_limit: undefined
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) {
      errors.code = 'Discount code is required';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code.trim())) {
      errors.code = 'Code should only contain uppercase letters, numbers, underscores, and hyphens';
    }

    if (formData.discount_value <= 0) {
      errors.discount_value = 'Value must be greater than 0';
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      errors.discount_value = 'Percentage cannot exceed 100%';
    }

    if (formData.min_purchase_amount !== undefined && formData.min_purchase_amount < 0) {
      errors.min_purchase_amount = 'Minimum purchase cannot be negative';
    }

    if (formData.max_discount_amount !== undefined && formData.max_discount_amount <= 0) {
      errors.max_discount_amount = 'Maximum discount must be greater than 0';
    }

    if (formData.usage_limit !== undefined && formData.usage_limit <= 0) {
      errors.usage_limit = 'Usage limit must be greater than 0';
    }

    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      errors.end_date = 'Expiry date must be after start date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Convert empty strings to null for optional fields
      const dataToSubmit = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        description: formData.description || null,
        min_purchase_amount: formData.min_purchase_amount || null,
        max_discount_amount: formData.max_discount_amount || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        usage_limit: formData.usage_limit || null
      };

      if (editingId) {
        // Update existing discount code
        const { error } = await supabase
          .from('discount_codes')
          .update(dataToSubmit)
          .eq('id', editingId);

        if (error) {
          console.error('Error updating discount code:', error);
          toast.error(`Failed to update discount code: ${error.message}`);
          return;
        }
        toast.success('Discount code updated successfully');
      } else {
        // Create new discount code
        const { error } = await supabase
          .from('discount_codes')
          .insert([dataToSubmit]);

        if (error) {
          console.error('Error creating discount code:', error);
          toast.error(`Failed to create discount code: ${error.message}`);
          return;
        }
        toast.success('Discount code created successfully');
      }

      closeModal();
      fetchDiscountCodes();
    } catch (error: any) {
      console.error('Error saving discount code:', error);
      toast.error(`Failed to save discount code: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Discount code deleted successfully');
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error deleting discount code:', error);
      toast.error('Failed to delete discount code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Discount Codes</h2>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Discount Code
        </button>
      </div>

      {loading && discountCodes.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : discountCodes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No discount codes found. Create your first one!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conditions
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {discountCodes.map((code) => (
                <tr key={code.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {code.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {code.discount_type === 'fixed_amount' ? 'fixed' : code.discount_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.discount_type === 'percentage' ? `${code.discount_value}%` : `$${code.discount_value.toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.min_purchase_amount ? `Min: $${code.min_purchase_amount.toFixed(2)}` : ''}
                    {code.min_purchase_amount && code.max_discount_amount ? ', ' : ''}
                    {code.max_discount_amount ? `Max: $${code.max_discount_amount.toFixed(2)}` : ''}
                    {!code.min_purchase_amount && !code.max_discount_amount ? 'None' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      code.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {code.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.usage_count} / {code.usage_limit || '∞'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(code)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for adding/editing discount codes */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingId ? 'Edit Discount Code' : 'Create Discount Code'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${formErrors.code ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                  placeholder="SUMMER25"
                />
                {formErrors.code && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Use uppercase letters, numbers, underscores, and hyphens only.
                </p>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="Summer sale discount"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="discount_type" className="block text-sm font-medium text-gray-700">
                    Discount Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="discount_type"
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount ($)</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="discount_value" className="block text-sm font-medium text-gray-700">
                    Value <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">
                        {formData.discount_type === 'percentage' ? '%' : '$'}
                      </span>
                    </div>
                    <input
                      type="number"
                      id="discount_value"
                      name="discount_value"
                      value={formData.discount_value}
                      onChange={handleInputChange}
                      className={`block w-full pl-7 border ${formErrors.discount_value ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                      placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                      step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={formData.discount_type === 'percentage' ? '100' : undefined}
                    />
                  </div>
                  {formErrors.discount_value && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.discount_value}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="min_purchase_amount" className="block text-sm font-medium text-gray-700">
                    Minimum Purchase (optional)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="min_purchase_amount"
                      name="min_purchase_amount"
                      value={formData.min_purchase_amount || ''}
                      onChange={handleInputChange}
                      className={`block w-full pl-7 border ${formErrors.min_purchase_amount ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                      placeholder="25.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {formErrors.min_purchase_amount && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.min_purchase_amount}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="max_discount_amount" className="block text-sm font-medium text-gray-700">
                    Maximum Discount (optional)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="max_discount_amount"
                      name="max_discount_amount"
                      value={formData.max_discount_amount || ''}
                      onChange={handleInputChange}
                      className={`block w-full pl-7 border ${formErrors.max_discount_amount ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                      placeholder="100.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {formErrors.max_discount_amount && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.max_discount_amount}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                    Start Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date || ''}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border ${formErrors.end_date ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                  />
                  {formErrors.end_date && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.end_date}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="usage_limit" className="block text-sm font-medium text-gray-700">
                    Usage Limit (optional)
                  </label>
                  <input
                    type="number"
                    id="usage_limit"
                    name="usage_limit"
                    value={formData.usage_limit || ''}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border ${formErrors.usage_limit ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                    placeholder="100"
                    min="1"
                    step="1"
                  />
                  {formErrors.usage_limit && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.usage_limit}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty for unlimited usage
                  </p>
                </div>
                
                <div className="flex items-center h-full pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              {Object.keys(formErrors).length > 0 && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Please fix the errors above before submitting
                      </h3>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {editingId ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
