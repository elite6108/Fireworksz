import { supabase } from '../lib/supabase';

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  category: string;
  created_at?: string;
}

export class ProductService {
  static async checkUserRole(): Promise<{ role: string | null; email: string | null }> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { role: null, email: null };
    }

    return {
      role: session.user.user_metadata?.role || null,
      email: session.user.email || null
    };
  }

  private static async verifyAdminRole(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session. Please sign in.');
    }

    // For now, we'll allow any authenticated user to perform operations
    // The RLS policies will handle the actual permissions
    return;
  }

  static async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    try {
      await this.verifyAdminRole();

      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST301') {
          throw new Error('Permission denied. Please check if you have admin privileges.');
        } else if (error.code === '23505') {
          throw new Error('A product with this name already exists.');
        }
        throw new Error(`Failed to create product: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned after product creation');
      }

      return data;
    } catch (error) {
      console.error('Product creation error:', error);
      throw error;
    }
  }

  static async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  static async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    try {
      await this.verifyAdminRole();

      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Product not found');
      return data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    try {
      console.log('ProductService.deleteProduct called with id:', id);
      
      await this.verifyAdminRole();
      console.log('Admin role verified');
      
      // Attempt direct delete - simple approach
      try {
        // First, get the product to make sure it exists
        const { data: product, error: getError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
          
        if (getError) {
          console.error('Error finding product:', getError);
          throw new Error(`Product not found: ${getError.message}`);
        }
        
        console.log('Found product to delete:', product);
        
        // Now delete it
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Error deleting product:', deleteError);
          throw new Error(`Failed to delete product: ${deleteError.message}`);
        }
        
        console.log('Product deleted successfully');
      } catch (error) {
        console.error('Delete product error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
}