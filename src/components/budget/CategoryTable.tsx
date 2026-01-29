'use client';

import { useState } from 'react';
import { CategoryWithSpend } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import CategoryRow from './CategoryRow';
import LineItemsModal from './LineItemsModal';
import AddCategoryForm from './AddCategoryForm';

interface CategoryTableProps {
  categories: CategoryWithSpend[];
  budgetId: string;
  onUpdate: () => void;
  isClientView: boolean;
}

export default function CategoryTable({
  categories,
  budgetId,
  onUpdate,
  isClientView,
}: CategoryTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSpend | null>(null);
  const supabase = createClient();

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? All line items will also be deleted.')) {
      return;
    }

    try {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Target
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actual Spend
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Difference
              </th>
              {!isClientView && (
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onUpdate={onUpdate}
                onViewLineItems={() => setSelectedCategory(category)}
                onDelete={() => handleDeleteCategory(category.id)}
                isClientView={isClientView}
              />
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <div className="p-8 text-center text-slate-500">No categories yet.</div>
        )}
      </div>

      {!isClientView && (
        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg">
          <h3 className="text-sm font-medium text-slate-900 mb-3">Add Category</h3>
          <AddCategoryForm budgetId={budgetId} onCategoryAdded={onUpdate} />
        </div>
      )}

      {selectedCategory && (
        <LineItemsModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          category={selectedCategory}
          onUpdate={() => {
            onUpdate();
            // Refresh the selected category data
            const updated = categories.find((c) => c.id === selectedCategory.id);
            if (updated) setSelectedCategory(updated);
          }}
          isClientView={isClientView}
        />
      )}
    </>
  );
}
