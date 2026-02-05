'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CategoryWithSpend, formatCurrency, formatPercent } from '@/lib/types';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CategoryRow from './CategoryRow';
import AddCategoryForm from './AddCategoryForm';

type SortKey = 'name' | 'target_amount' | 'allocation' | 'estimated_total' | 'actual_spend' | 'total_paid' | 'difference';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

function SortIndicator({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (direction === 'asc') {
    return (
      <svg className="w-3.5 h-3.5 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }
  if (direction === 'desc') {
    return (
      <svg className="w-3.5 h-3.5 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  }
  // Unsorted hint: subtle double chevron
  return (
    <svg className="w-3.5 h-3.5 inline-block ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5 5 5M7 13l5 5 5-5" />
    </svg>
  );
}

function SortHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig | null;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = sortConfig?.key === sortKey;
  const direction = isActive ? sortConfig!.direction : null;

  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wider select-none cursor-pointer hover:text-slate-700 hover:bg-slate-100 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${isActive ? 'text-slate-700' : 'text-slate-500'}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <SortIndicator direction={direction} />
    </th>
  );
}

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
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const supabase = useSupabaseClient();
  const { showToast } = useToast();

  // Sync ordered categories when props change
  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  }, []);

  const sortedCategories = useMemo(() => {
    if (!sortConfig) return orderedCategories;

    const { key, direction } = sortConfig;
    const sorted = [...orderedCategories].sort((a, b) => {
      let cmp = 0;
      switch (key) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'target_amount':
          cmp = a.target_amount - b.target_amount;
          break;
        case 'allocation':
          cmp = a.target_amount - b.target_amount;
          break;
        case 'estimated_total':
          cmp = a.estimated_total - b.estimated_total;
          break;
        case 'actual_spend':
          cmp = a.actual_spend - b.actual_spend;
          break;
        case 'total_paid':
          cmp = a.total_paid - b.total_paid;
          break;
        case 'difference':
          cmp = (a.target_amount - a.actual_spend) - (b.target_amount - b.actual_spend);
          break;
      }
      return direction === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [orderedCategories, sortConfig]);

  const handleDeleteCategory = (categoryId: string) => {
    const cat = orderedCategories.find(c => c.id === categoryId);
    setDeleteTarget({ id: categoryId, name: cat?.name || 'this category' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      onUpdate();
    } catch (err) {
      console.warn('Failed to delete category:', err);
      showToast('Failed to delete category', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Calculate total allocation percentage
  const totalAllocated = orderedCategories.reduce((sum, cat) => sum + Number(cat.target_amount), 0);
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

  const renderCategoryRow = (category: CategoryWithSpend, index: number, mode: 'table' | 'card') => (
    <CategoryRow
      key={category.id}
      category={category}
      totalBudget={totalBudget}
      onUpdate={onUpdate}
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
        if (index < orderedCategories.length - 1) {
          setEditingRowIndex(index + 1);
        } else {
          setEditingRowIndex(null);
        }
      }}
      renderMode={mode === 'card' ? 'card' : 'table'}
    />
  );

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden print:rounded-none print:border-slate-300">
        {/* Desktop table */}
        <table className="hidden md:table print:table w-full print:text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <SortHeader label="Category" sortKey="name" sortConfig={sortConfig} onSort={handleSort} align="left" />
              <SortHeader label="Target" sortKey="target_amount" sortConfig={sortConfig} onSort={handleSort} />
              <SortHeader label="Allocation" sortKey="allocation" sortConfig={sortConfig} onSort={handleSort} />
              <SortHeader label="Estimated" sortKey="estimated_total" sortConfig={sortConfig} onSort={handleSort} />
              <SortHeader label="Actual Spend" sortKey="actual_spend" sortConfig={sortConfig} onSort={handleSort} />
              <SortHeader label="Paid" sortKey="total_paid" sortConfig={sortConfig} onSort={handleSort} />
              <SortHeader label="Difference" sortKey="difference" sortConfig={sortConfig} onSort={handleSort} />
              {!isClientView && (
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y ${isClientView ? 'divide-slate-200' : 'divide-slate-100'}`}>
            {sortedCategories.map((category, index) => renderCategoryRow(category, index, 'table'))}
          </tbody>
          {orderedCategories.length > 0 && (
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
                  {formatCurrency(orderedCategories.reduce((sum, cat) => sum + cat.estimated_total, 0))}
                </td>
                <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm font-medium text-slate-900 text-right whitespace-nowrap`}>
                  {formatCurrency(orderedCategories.reduce((sum, cat) => sum + cat.actual_spend, 0))}
                </td>
                <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm font-medium text-slate-900 text-right whitespace-nowrap`}>
                  {formatCurrency(orderedCategories.reduce((sum, cat) => sum + cat.total_paid, 0))}
                </td>
                <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'}`}></td>
                {!isClientView && <td className="px-4 py-3"></td>}
              </tr>
            </tfoot>
          )}
        </table>

        {/* Mobile card list */}
        <div className="md:hidden print:hidden divide-y divide-slate-200">
          {orderedCategories.map((category, index) => renderCategoryRow(category, index, 'card'))}
          {orderedCategories.length > 0 && (
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
                <span className="text-xs text-slate-500 uppercase">Estimated</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatCurrency(orderedCategories.reduce((sum, cat) => sum + cat.estimated_total, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase">Actual Spend</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatCurrency(orderedCategories.reduce((sum, cat) => sum + cat.actual_spend, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase">Paid</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatCurrency(orderedCategories.reduce((sum, cat) => sum + cat.total_paid, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {orderedCategories.length === 0 && (
          <div className="p-8 text-center text-slate-500">No categories yet.</div>
        )}
      </div>

      {!isClientView && (
        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg">
          <h3 className="text-sm font-medium text-slate-900 mb-3">Add Category</h3>
          <AddCategoryForm budgetId={budgetId} onCategoryAdded={onUpdate} />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All line items will also be deleted.`}
        confirmLabel="Delete Category"
        loading={deleting}
      />
    </>
  );
}
