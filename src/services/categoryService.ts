import { supabase } from '../lib/supabase';

export interface Category {
  id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export class CategoryService {
  static async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  static async createCategory(category: Category): Promise<Category> {
    // Try using the RPC function first
    try {
      const { data, error } = await supabase
        .rpc('create_category_as_admin', { name: category.name })
        .single();

      if (error) {
        console.error('Error creating category via RPC:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (rpcError) {
      console.log('RPC method failed, falling back to direct insert:', rpcError);
      
      // Fall back to direct insert if RPC fails
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        throw new Error(error.message);
      }

      return data;
    }
  }

  static async updateCategory(id: string, category: Category): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw new Error(error.message);
    }

    return data;
  }

  static async deleteCategory(id: string): Promise<void> {
    console.log('CategoryService.deleteCategory called with id:', id);
    
    // Attempt direct delete - simple approach
    try {
      // First, get the category to make sure it exists
      const { data: category, error: getError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
        
      if (getError) {
        console.error('Error finding category:', getError);
        throw new Error(`Category not found: ${getError.message}`);
      }
      
      console.log('Found category to delete:', category);
      
      // Now delete it
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting category:', deleteError);
        throw new Error(`Failed to delete category: ${deleteError.message}`);
      }
      
      console.log('Category deleted successfully');
    } catch (error) {
      console.error('Delete category error:', error);
      throw error;
    }
  }
}
