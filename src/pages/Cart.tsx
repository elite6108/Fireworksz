import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowLeft, CreditCard } from 'lucide-react';
import { useStore } from '../store';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';

export function Cart() {
  const { cart, updateQuantity, removeFromCart } = useStore();
  const getSubtotal = useStore((state) => state.getSubtotal);
  const getTax = useStore((state) => state.getTax);
  const getShipping = useStore((state) => state.getShipping);
  const getTotal = useStore((state) => state.getTotal);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const item = cart.find((i) => i.product_id === productId);
    if (item && newQuantity <= item.product.stock) {
      updateQuantity(productId, newQuantity);
    } else {
      toast.error('Requested quantity exceeds available stock');
    }
  };

  const handleCheckout = () => {
    setLoading(true);
    try {
      if (!user) {
        toast.error('Please sign in to checkout');
        navigate('/auth');
        return;
      }

      navigate('/checkout');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some awesome fireworks to your cart!</p>
          <Link
            to="/shop"
            className="inline-flex items-center text-purple-600 hover:text-purple-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        <div className="lg:col-span-7">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h2>
          <div className="space-y-6">
            {cart.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center justify-between border-b border-gray-200 pb-6"
              >
                <div className="flex items-center">
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="h-24 w-24 object-cover rounded-md"
                  />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {item.product.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      ${item.price.toFixed(2)} each
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center border rounded-md">
                    <button
                      onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                      className="p-2 text-gray-600 hover:text-purple-600"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                      className="p-2 text-gray-600 hover:text-purple-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center mt-8 text-purple-600 hover:text-purple-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Continue Shopping
          </Link>
        </div>

        <div className="lg:col-span-5 mt-12 lg:mt-0">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">${getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (8%)</span>
                <span className="text-gray-900">${getTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">
                  {getShipping() === 0 ? 'Free' : `$${getShipping().toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-medium text-gray-900">Total</span>
                  <span className="text-lg font-medium text-gray-900">
                    ${getTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full mt-6 bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Checkout
                </>
              )}
            </button>
            {!user && (
              <p className="mt-4 text-sm text-gray-600 text-center">
                Please{' '}
                <Link to="/auth" className="text-purple-600 hover:text-purple-700">
                  sign in
                </Link>{' '}
                to checkout
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}