import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { CreditCard, ArrowLeft, Tag } from 'lucide-react';
import { useShippingRates } from '../hooks/useShippingRates';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface DiscountInfo {
  id: string | null;
  amount: number;
  code: string;
}

interface OrderData {
  user_id: string;
  items: {
    product_id: string;
    quantity: number;
    price: number;
  }[];
  shipping_address: {
    full_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  shipping_rate: string;
  shipping_cost: number;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  payment_status: string;
  discount_amount: number;
  discount_code_id?: string; // Optional UUID
}

interface StripeData {
  line_items: {
    price_data: {
      currency: string;
      product_data: {
        name: string;
        images?: string[];
        description?: string;
      };
      unit_amount: number;
    };
    quantity: number;
  }[];
  success_url: string;
  cancel_url: string;
  order_id: string;
  user_id: string;
  payment_id: string;
  discount_info?: {
    code: string;
    amount: number;
    id?: string;
  };
}

export function Checkout() {
  const navigate = useNavigate();
  const cart = useStore((state) => state.cart);
  const getSubtotal = useStore((state) => state.getSubtotal);
  const getTax = useStore((state) => state.getTax);
  const getTotal = useStore((state) => state.getTotal);
  const selectedShippingRate = useStore((state) => state.selectedShippingRate);
  const setShippingRate = useStore((state) => state.setShippingRate);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { shippingRates, defaultRate } = useShippingRates();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  useEffect(() => {
    if (!selectedShippingRate && defaultRate) {
      setShippingRate(defaultRate);
    }
  }, [defaultRate, selectedShippingRate, setShippingRate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDiscountCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountCode(e.target.value);
  };

  // Client-side discount codes
  const DISCOUNT_CODES: Record<string, { type: 'percentage' | 'fixed', value: number, maxAmount?: number, minPurchase?: number }> = {
    'WELCOME10': { type: 'percentage', value: 10, maxAmount: 100 },
    'SUMMER25': { type: 'percentage', value: 25, maxAmount: 200, minPurchase: 50 },
    'FREESHIP': { type: 'fixed', value: 15 }
  };

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) {
      toast.error('Please enter a discount code');
      return;
    }

    setApplyingDiscount(true);

    try {
      const normalizedCode = discountCode.trim().toUpperCase();
      console.log('Applying discount code:', normalizedCode, 'for subtotal:', getSubtotal());
      
      // Always check client-side first for immediate feedback
      const clientDiscountDetails = DISCOUNT_CODES[normalizedCode];
      
      // If we have a client-side match, apply it immediately
      if (clientDiscountDetails) {
        console.log('Client-side discount found:', clientDiscountDetails);
        
        // Check minimum purchase requirement
        if (clientDiscountDetails.minPurchase && getSubtotal() < clientDiscountDetails.minPurchase) {
          toast.error(`This code requires a minimum purchase of $${clientDiscountDetails.minPurchase}`);
          setDiscountInfo(null);
          setApplyingDiscount(false);
          return;
        }
        
        // Calculate discount amount
        let discountAmount = 0;
        if (clientDiscountDetails.type === 'percentage') {
          discountAmount = getSubtotal() * (clientDiscountDetails.value / 100);
          if (clientDiscountDetails.maxAmount && discountAmount > clientDiscountDetails.maxAmount) {
            discountAmount = clientDiscountDetails.maxAmount;
          }
        } else { // fixed amount
          discountAmount = clientDiscountDetails.value;
        }
        
        // Apply the discount
        setDiscountInfo({
          id: normalizedCode, // Use the code as the ID for client-side discounts
          amount: discountAmount,
          code: normalizedCode
        });
        
        console.log('Client-side discount applied:', discountAmount);
        toast.success(`Discount applied: $${discountAmount.toFixed(2)}`);
        setApplyingDiscount(false);
        return;
      }
      
      // If no client-side match, try the server-side function
      console.log('No client-side discount found, trying server-side');
      const { data, error } = await supabase.rpc('apply_discount', {
        p_code: normalizedCode,
        p_subtotal: getSubtotal()
      });

      console.log('Server discount response:', data, error);

      if (error || !data || !data.discount_id) {
        console.log('Server-side discount failed');
        toast.error('Invalid or expired discount code');
        setDiscountInfo(null);
      } else {
        // Server-side discount worked
        setDiscountInfo({
          id: data.discount_id,
          amount: data.discount_amount,
          code: normalizedCode
        });
        console.log('Server-side discount applied:', data.discount_amount);
        toast.success(`Discount applied: $${data.discount_amount.toFixed(2)}`);
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('Failed to apply discount code');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setDiscountInfo(null);
    setDiscountCode('');
    toast.success('Discount removed');
  };

  // Calculate the final total with discount applied
  const getFinalTotal = () => {
    const total = getTotal();
    if (discountInfo && discountInfo.amount > 0) {
      return Math.max(0, total - discountInfo.amount);
    }
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to checkout');
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!selectedShippingRate) {
      toast.error('Please select a shipping option');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare the order data
      const orderData: OrderData = {
        user_id: user.id,
        items: cart.map(item => ({
          product_id: item.id || item.product_id, // Handle both id formats
          quantity: item.quantity,
          price: item.price
        })),
        shipping_address: {
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country: formData.country
        },
        shipping_rate: selectedShippingRate.id,
        shipping_cost: selectedShippingRate.cost,
        subtotal: getSubtotal(),
        tax: getTax(),
        total: getFinalTotal(),
        status: 'pending',
        payment_status: 'pending',
        discount_amount: discountInfo?.amount || 0
      };

      // Only include discount_code_id if it's a valid UUID (from server-side discount)
      if (discountInfo?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(discountInfo.id)) {
        orderData.discount_code_id = discountInfo.id;
      }

      console.log('Creating order with data:', orderData);

      // 1. Create the order in the database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }
      
      // 2. Create a payment record
      const paymentData = {
        user_id: user.id,
        order_id: order.id,
        amount: order.total,
        currency: 'usd',
        payment_method: 'stripe',
        status: 'pending',
        metadata: { 
          order_items: JSON.stringify(cart),
          discount_code: discountInfo?.code || null,
          discount_amount: discountInfo?.amount || 0
        }
      };

      console.log('Creating payment with data:', paymentData);

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        throw paymentError;
      }

      // Calculate discount per item if we have a discount
      let discountRemaining = 0;
      
      if (discountInfo && discountInfo.amount > 0) {
        // For percentage discounts, we'll apply them proportionally to each item
        // For fixed discounts, we'll distribute them evenly
        discountRemaining = discountInfo.amount;
      }

      // 3. Create a Stripe checkout session with discount applied to items
      const stripeItems = [];
      
      // Add product items with discount applied
      for (const item of cart) {
        // Calculate how much discount to apply to this item
        let itemDiscount = 0;
        if (discountInfo && discountInfo.amount > 0) {
          // Apply discount proportionally based on item's contribution to total
          const itemTotal = item.price * item.quantity;
          const proportion = itemTotal / getSubtotal();
          itemDiscount = Math.min(discountRemaining, discountInfo.amount * proportion);
          discountRemaining -= itemDiscount;
          
          // Calculate discount per unit
          const discountPerUnit = itemDiscount / item.quantity;
          
          // Apply discount to item price, ensuring it doesn't go below $0.50 (minimum Stripe allows)
          const discountedPrice = Math.max(0.5, item.price - discountPerUnit);
          
          stripeItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name,
                images: item.images || [],
                // Only include description if it's not empty
                ...(item.description && item.description.trim() !== '' ? { description: item.description } : {})
              },
              unit_amount: Math.round(discountedPrice * 100), // Convert to cents
            },
            quantity: item.quantity,
          });
        } else {
          // No discount, use regular price
          stripeItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name,
                images: item.images || [],
                // Only include description if it's not empty
                ...(item.description && item.description.trim() !== '' ? { description: item.description } : {})
              },
              unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: item.quantity,
          });
        }
      }
      
      // Add tax as a separate line item
      const taxAmount = getTax();
      if (taxAmount > 0) {
        stripeItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tax',
              description: 'Sales tax'
            },
            unit_amount: Math.round(taxAmount * 100), // Convert to cents
          },
          quantity: 1,
        });
      }
      
      // Add shipping as a separate line item
      stripeItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Shipping (${selectedShippingRate.name})`,
          },
          unit_amount: Math.round(selectedShippingRate.cost * 100), // Convert to cents
        },
        quantity: 1,
      });
      
      // If we have any remaining discount (due to rounding), add a note
      if (discountInfo && discountInfo.amount > 0 && discountRemaining > 0.01) {
        stripeItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Discount (${discountInfo.code})`,
              description: 'Discount applied to your order'
            },
            unit_amount: -Math.round(discountRemaining * 100), // Convert to cents, negative amount
          },
          quantity: 1,
        });
      }

      const stripeData: StripeData = {
        line_items: stripeItems,
        success_url: `${window.location.origin}/checkout/success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/cart`,
        order_id: order.id,
        user_id: user.id,
        payment_id: payment.id
      };

      // Add discount info to metadata
      if (discountInfo && discountInfo.amount > 0) {
        stripeData.discount_info = {
          code: discountInfo.code,
          amount: discountInfo.amount
        };
      }

      console.log('Creating Stripe session with data:', stripeData);

      const response = await fetch(`http://localhost:3001/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stripeData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Stripe session creation error:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const sessionData = await response.json();
      console.log('Stripe session created:', sessionData);
      
      if (sessionData.url) {
        // Update payment record with session ID
        await supabase
          .from('payments')
          .update({
            metadata: {
              ...payment.metadata,
              session_id: sessionData.id
            }
          })
          .eq('id', payment.id);
          
        // Store cart items in localStorage before redirecting
        // This ensures we can recover them if the user cancels the checkout
        localStorage.setItem('saved_cart', JSON.stringify(cart));
        
        // Redirect to Stripe checkout
        window.location.href = sessionData.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to process checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some items to your cart before checking out.</p>
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center text-purple-600 hover:text-purple-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
        <div className="lg:col-span-7">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
          
          <form onSubmit={handleSubmit}>
            <div className="border-b border-gray-200 pb-8 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Information</h2>
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6">
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    id="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State / Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                    ZIP / Postal Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6">
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  >
                    <option value="">Select a country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="MX">Mexico</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-8 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Method</h2>
              <div className="mt-4 space-y-4">
                {shippingRates.map((rate) => (
                  <div key={`shipping-rate-${rate.id}`} className="flex items-center">
                    <input
                      id={`shipping-${rate.id}`}
                      name="shippingMethod"
                      type="radio"
                      checked={selectedShippingRate?.id === rate.id}
                      onChange={() => setShippingRate(rate)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <label htmlFor={`shipping-${rate.id}`} className="ml-3 flex justify-between w-full">
                      <span className="text-sm font-medium text-gray-900">{rate.name}</span>
                      <span className="text-sm font-medium text-gray-900">${rate.cost.toFixed(2)}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Cart
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-10 lg:mt-0 lg:col-span-5">
          <div className="bg-gray-50 rounded-lg px-6 py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="flow-root">
              <ul className="-my-4 divide-y divide-gray-200">
                {cart.map((item) => (
                  <li key={`cart-item-${item.id || item.product_id}`} className="flex py-4">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex flex-1 flex-col">
                      <div>
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3>{item.name}</h3>
                          <p className="ml-4">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex flex-1 items-end justify-between text-sm">
                        <p className="text-gray-500">Qty {item.quantity}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between text-base font-medium text-gray-900 mb-2">
                <p>Subtotal</p>
                <p>${getSubtotal().toFixed(2)}</p>
              </div>
              <div className="flex justify-between text-base font-medium text-gray-900 mb-2">
                <p>Shipping</p>
                <p>${selectedShippingRate ? selectedShippingRate.cost.toFixed(2) : '0.00'}</p>
              </div>
              <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
                <p>Tax</p>
                <p>${getTax().toFixed(2)}</p>
              </div>
              {discountInfo && discountInfo.amount > 0 && (
                <div className="flex justify-between text-base font-medium text-gray-900 mb-2 text-green-600">
                  <p>Discount</p>
                  <p>-${discountInfo.amount.toFixed(2)}</p>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
                <p>Total</p>
                <p>${getFinalTotal().toFixed(2)}</p>
              </div>
            </div>
            
            {/* Discount Code Section */}
            <div className="mb-4 border-t border-gray-200 pt-4">
              <h3 className="text-md font-medium mb-2 flex items-center">
                <Tag size={16} className="mr-2" />
                Discount Code
              </h3>
              {!discountInfo ? (
                <div className="flex">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={handleDiscountCodeChange}
                    placeholder="Enter code"
                    className="border rounded-l px-3 py-2 w-full text-sm"
                    disabled={applyingDiscount}
                  />
                  <button
                    type="button"
                    onClick={applyDiscountCode}
                    className="bg-blue-500 text-white rounded-r px-3 py-2 text-sm hover:bg-blue-600 transition-colors"
                    disabled={applyingDiscount || !discountCode.trim()}
                  >
                    {applyingDiscount ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{discountInfo.code}</span>
                    <span className="text-green-600 block text-sm">-${discountInfo.amount.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeDiscount}
                    className="text-red-500 text-sm hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
