import { useState, useEffect } from 'react';
import { CategoryService, Category } from '../services/categoryService';
import toast from 'react-hot-toast';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await CategoryService.getCategories();
      setCategories(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to load categories: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (name: string) => {
    try {
      const newCategory = await CategoryService.createCategory({ name });
      setCategories([...categories, newCategory]);
      toast.success('Category added successfully');
      return newCategory;
    } catch (err: any) {
      toast.error(`Failed to add category: ${err.message}`);
      throw err;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    try {
      const updatedCategory = await CategoryService.updateCategory(id, { name });
      setCategories(
        categories.map((category) =>
          category.id === id ? updatedCategory : category
        )
      );
      toast.success('Category updated successfully');
      return updatedCategory;
    } catch (err: any) {
      toast.error(`Failed to update category: ${err.message}`);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await CategoryService.deleteCategory(id);
      setCategories(categories.filter((category) => category.id !== id));
      toast.success('Category deleted successfully');
    } catch (err: any) {
      toast.error(`Failed to delete category: ${err.message}`);
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory
  };
}
