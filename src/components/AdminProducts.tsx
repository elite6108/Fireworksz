import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { ProductService, Product } from '../services/productService';
import { RoleCheck } from './RoleCheck';
import { CategoryManager } from './CategoryManager';
import { useCategories } from '../hooks/useCategories';
import { GallerySelector } from './GallerySelector';

export function AdminProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isGallerySelectorOpen, setIsGallerySelectorOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  // Use the useCategories hook to get categories from the database
  const { categories, loading: categoriesLoading } = useCategories();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }

    loadProducts();
  }, [user, navigate]);

  const loadProducts = async () => {
    try {
      const data = await ProductService.getProducts();
      setProducts(data);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error(error.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user || user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const category = formData.get('category') as string;
    console.log('Selected category:', category);

    const productData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      stock: parseInt(formData.get('stock') as string),
      image_url: formData.get('image_url') as string,
      category: category,
    };

    console.log('Saving product with data:', productData);

    try {
      if (editingProduct) {
        await ProductService.updateProduct(editingProduct.id!, productData);
        toast.success('Product updated successfully');
      } else {
        await ProductService.createProduct(productData);
        toast.success('Product added successfully');
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      form.reset();
      loadProducts(); // Reload the products list
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!user || user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      return;
    }

    if (!confirm('Are you sure you want to delete this product?')) return;

    console.log('Attempting to delete product:', productId);
    try {
      await ProductService.deleteProduct(productId);
      console.log('Product deleted successfully:', productId);
      toast.success('Product deleted successfully');
      loadProducts(); // Reload the products list
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product');
    }
  };

  if (isLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <RoleCheck requiredRole="admin">
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </button>
        </div>

        {/* Category Management Section */}
        <CategoryManager />

        <div className="grid grid-cols-1 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-16 w-16 object-cover rounded"
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${product.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setIsModalOpen(true);
                    }}
                    className="text-gray-400 hover:text-purple-600"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id!)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={editingProduct?.name}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={editingProduct?.description}
                    required
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    step="0.01"
                    defaultValue={editingProduct?.price}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    defaultValue={editingProduct?.stock}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                    Image URL
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="url"
                      id="image_url"
                      name="image_url"
                      value={selectedImageUrl || editingProduct?.image_url || ''}
                      onChange={(e) => setSelectedImageUrl(e.target.value)}
                      required
                      className="flex-grow block w-full rounded-none rounded-l-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsGallerySelectorOpen(true)}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {selectedImageUrl && (
                    <div className="mt-2">
                      <img 
                        src={selectedImageUrl} 
                        alt="Selected product image" 
                        className="h-24 w-auto object-contain border rounded"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    defaultValue={editingProduct?.category || ''}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Gallery Selector Modal */}
        {isGallerySelectorOpen && (
          <GallerySelector
            onSelect={(imageUrl) => {
              setSelectedImageUrl(imageUrl);
              setIsGallerySelectorOpen(false);
            }}
            onClose={() => setIsGallerySelectorOpen(false)}
          />
        )}
      </div>
    </RoleCheck>
  );
}