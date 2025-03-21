import { useState } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCategories } from '../hooks/useCategories';

interface Category {
  id: string;
  name: string;
}

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, loading } = useCategories();
  
  // Add a new category
  const handleAddCategory = () => {
    const categoryName = window.prompt('Enter new category name:');
    if (categoryName && categoryName.trim()) {
      addCategory(categoryName.trim())
        .then(() => {
          toast.success('Category added successfully');
        })
        .catch((error) => {
          console.error('Error adding category:', error);
          toast.error(`Failed to add category: ${error.message}`);
        });
    }
  };

  // Update an existing category
  const handleEditCategory = (id: string, currentName: string) => {
    const newName = window.prompt('Enter new category name:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
      updateCategory(id, newName.trim())
        .then(() => {
          toast.success('Category updated successfully');
        })
        .catch((error) => {
          console.error('Error updating category:', error);
          toast.error(`Failed to update category: ${error.message}`);
        });
    }
  };

  // Delete a category
  const handleDeleteCategory = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the "${name}" category?`)) {
      console.log('Attempting to delete category:', id, name);
      
      deleteCategory(id)
        .then(() => {
          console.log('Category deleted successfully:', id);
          toast.success('Category deleted successfully');
        })
        .catch((error) => {
          console.error('Error deleting category:', error);
          toast.error(`Failed to delete category: ${error.message}`);
        });
    }
  };

  if (loading) {
    return (
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Tag className="mr-2 h-5 w-5 text-purple-500" />
          Categories
        </h3>
        <button
          onClick={handleAddCategory}
          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <Plus className="-ml-1 mr-1 h-4 w-4" aria-hidden="true" />
          Add Category
        </button>
      </div>
      
      <div className="overflow-hidden ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.length > 0 ? (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditCategory(category.id!, category.name)}
                        className="text-gray-400 hover:text-purple-600"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id!, category.name)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                  No categories found. Add your first category!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Export categories for use in other components
export function useCategoryManager() {
  const [categories] = useState<Category[]>([
    { id: '1', name: 'Aerial' },
    { id: '2', name: 'Ground Effects' },
    { id: '3', name: 'Party Packs' }
  ]);
  
  return { categories };
}
