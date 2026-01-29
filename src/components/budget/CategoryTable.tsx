'use client';

import { useState } from 'react';
import { CategoryWithSpend, formatCurrency, formatPercent } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import CategoryRow from './CategoryRow';
import LineItemsModal from './LineItemsModal';
import AddCategoryForm from './AddCategoryForm';

interface CategoryTableProps {
  categories: CategoryWithSpend[];
  budgetId: string;
  totalBudget: number;
  onUpdate: () => void;
  isClientView: boolean;
}

export default function CategoryTable({
  categories,
  budgetId,
  totalBudget,
  onUpdate,
  isClientView,
}: CategoryTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSpend | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
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

  // Calculate total allocation percentage
  const totalAllocated = categories.reduce((sum, cat) => sum + Number(cat.target_amount), 0);
  const totalAllocationPercent = totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0;

  // Determine allocation status
  const getAllocationStatus = () => {
    if (totalAllocationPercent < 99) {
      return { label: 'Under-allocated', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    } else if (totalAllocationPercent <= 101) {
      return { label: 'Fully allocated', color: 'text-green-600', bg: 'bg-green-50' };
    } else {
      return { label: 'Over-allocated', color: 'text-red-600', bg: 'bg-red-50' };
    }
  };

  const allocationStatus = getAllocationStatus();

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden print:rounded-none print:border-slate-300">
        {/* Desktop table */}
        <table className="hidden md:table print:table w-full print:text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Target
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Allocation
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actual Spend
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Difference
              </th>
              {!isClientView && (
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y ${isClientView ? 'divide-slate-200' : 'divide-slate-100'}`}>
            {categories.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                totalBudget={totalBudget}
                onUpdate={onUpdate}
                onViewLineItems={() => setSelectedCategory(category)}
                onDelete={() => handleDeleteCategory(category.id)}
                isClientView={isClientView}
                shouldStartEditing={editingRowIndex === index}
                onEditingChange={(editing) => {
                  if (editing) {
                    setEditingRowIndex(index);
                  } else if (editingRowIndex === index) {
                    setEditingRowIndex(null);
                  }
                }}
                onTabToNextRow={() => {
                  if (index < categories.length - 1) {
                    setEditingRowIndex(index + 1);
                  } else {
                    setEditingRowIndex(null);
                  }
                }}
              />
            ))}
          </tbody>
          {categories.length > 0 && (
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr className="break-inside-avoid">
                <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm font-medium text-slate-900`}>Total</td>
                <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm font-medium text-slate-900 text-right whitespace-nowrap`}>
                  {formatCurrency(totalAllocated)}
                </td>
                <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-right whitespace-nowrap`}>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-sm font-medium ${allocationStatus.bg} ${allocationStatus.color}`}>
                    {formatPercent(totalAllocationPercent)}
                    <span className="text-xs font-normal">({allocationStatus.label})</span>
                  </span>
                </td>
                <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm font-medium text-slate-900 text-right whitespace-nowrap`}>
                  {formatCurrency(categories.reduce((sum, cat) => sum + cat.actual_spend, 0))}
                </td>
                <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'}`}></td>
                {!isClientView && <td className="px-4 py-3"></td>}
              </tr>
            </tfoot>
          )}
        </table>

        {/* Mobile card list */}
        <div className="md:hidden print:hidden divide-y divide-slate-200">
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              totalBudget={totalBudget}
              onUpdate={onUpdate}
              onViewLineItems={() => setSelectedCategory(category)}
              onDelete={() => handleDeleteCategory(category.id)}
              isClientView={isClientView}
              shouldStartEditing={editingRowIndex === index}
              onEditingChange={(editing) => {
                if (editing) {
                  setEditingRowIndex(index);
                } else if (editingRowIndex === index) {
                  setEditingRowIndex(null);
                }
              }}
              onTabToNextRow={() => {
                if (index < categories.length - 1) {
                  setEditingRowIndex(index + 1);
                } else {
                  setEditingRowIndex(null);
                }
              }}
              renderMode="card"
              isExpanded={expandedCategoryId === category.id}
              onToggleExpand={() =>
                setExpandedCategoryId(expandedCategoryId === category.id ? null : category.id)
              }
            />
          ))}
          {categories.length > 0 && (
            <div className="p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900">Total</span>
                <span className="text-sm font-medium text-slate-900">{formatCurrency(totalAllocated)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase">Allocation</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${allocationStatus.bg} ${allocationStatus.color}`}>
                  {formatPercent(totalAllocationPercent)} ({allocationStatus.label})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase">Actual Spend</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatCurrency(categories.reduce((sum, cat) => sum + cat.actual_spend, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

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
