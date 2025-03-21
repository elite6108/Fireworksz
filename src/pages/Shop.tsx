import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Product } from '../types';
import toast from 'react-hot-toast'; 
import { CategoryService } from '../services/categoryService';

export function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<{id: string, name: string, displayName: string}[]>([]);
  const addToCart = useStore((state) => state.addToCart);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const categoryData = await CategoryService.getCategories();
      
      // Add 'all' as the first option
      const formattedCategories = [
        { id: 'all', name: 'all', displayName: 'All' },
        ...categoryData.map(cat => ({
          id: cat.id || '',
          name: cat.name,
          displayName: cat.name.charAt(0).toUpperCase() + cat.name.slice(1)
        }))
      ];
      
      setCategories(formattedCategories);
      
      // After loading categories, load products
      loadProducts();
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to default categories if there's an error
      setCategories([
        { id: 'all', name: 'all', displayName: 'All' },
        { id: '1', name: 'Aerial', displayName: 'Aerial' },
        { id: '2', name: 'Ground Effects', displayName: 'Ground Effects' },
        { id: '3', name: 'Party Packs', displayName: 'Party Packs' }
      ]);
      loadProducts();
    }
  }

  async function loadProducts() {
    try {
      setLoading(true);
      console.log('Loading products for category:', selectedCategory);
      
      let query = supabase.from('products').select('*');
      
      if (selectedCategory !== 'all') {
        // Find the selected category's actual name
        const category = categories.find(c => c.id === selectedCategory);
        if (category && category.name !== 'all') {
          console.log('Filtering by category name:', category.name);
          query = query.eq('category', category.name);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('Loaded products:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (categories.length > 0) {
      loadProducts();
    }
  }, [selectedCategory, categories]);

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('This product is out of stock');
      return;
    }

    addToCart({
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      quantity: 1,
      price: product.price,
      product
    });
    
    toast.success('Added to cart!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Category Filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {category.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative pb-[100%]">
              <img
                src={product.image_url}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
              <p className="mt-1 text-gray-500 text-sm line-clamp-2">{product.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">
                  ${product.price.toFixed(2)}
                </span>
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock <= 0}
                  className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                    product.stock <= 0
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {product.stock > 0 ? (
                  <span className="text-green-600">{product.stock} in stock</span>
                ) : (
                  <span className="text-red-600">Out of stock</span>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Category: {product.category}
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found in this category.</p>
        </div>
      )}
    </div>
  );
}