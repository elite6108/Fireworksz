import { useState } from 'react';
import { AdminProducts } from '../components/AdminProducts';
import AdminOrders from '../components/AdminOrders';
import ShippingSettings from '../components/ShippingSettings';
import { CategorySettings } from '../components/CategorySettings';
import { Package, ShoppingBag, Truck, Tag, Image } from 'lucide-react';
import { useAuth } from '../store/auth';
import { Navigate, Link } from 'react-router-dom';

export function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'shipping' | 'categories'>('products');

  // Check if user has admin role
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your products, shipping rates, and view customer orders
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`${
              activeTab === 'products'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            <Package className="mr-2 h-5 w-5" />
            Products
          </button>

          <button
            onClick={() => setActiveTab('shipping')}
            className={`${
              activeTab === 'shipping'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            <Truck className="mr-2 h-5 w-5" />
            Shipping
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`${
              activeTab === 'orders'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            Orders
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`${
              activeTab === 'categories'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            <Tag className="mr-2 h-5 w-5" />
            Categories
          </button>

          <Link
            to="/admin/gallery"
            className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
          >
            <Image className="mr-2 h-5 w-5" />
            Gallery
          </Link>
        </nav>
      </div>

      {/* Content */}
      <div className="mt-8">
        {activeTab === 'products' && <AdminProducts />}
        {activeTab === 'shipping' && <ShippingSettings />}
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'categories' && <CategorySettings />}
      </div>
    </div>
  );
}