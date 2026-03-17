'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CategoryWithSpend, formatCurrency, formatPercent } from '@/lib/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import CategoryRow from './CategoryRow';
import AddCategoryForm from './AddCategoryForm';

type SortKey = 'name' | 'target_amount' | 'actual_spend' | 'difference';

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
  return (
    <svg className="w-3.5 h-3.5 inline-block ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5 5 5M7 13l5 5 5-5" />
    </svg>
  );
}

function SortButton({
  label,
  sortKey,
  sortConfig,
  onSort,
  align = 'left',
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
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`text-xs font-medium uppercase tracking-wider select-none cursor-pointer hover:text-slate-700 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${isActive ? 'text-slate-700' : 'text-slate-500'}`}
    >
      {label}
      <SortIndicator direction={direction} />
    </button>
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
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const supabase = useSupabaseClient();
  const { showToast } = useToast();

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
        case 'actual_spend':
          cmp = a.actual_spend - b.actual_spend;
          break;
        case 'difference':
          cmp = (a.actual_spend - a.target_amount) - (b.actual_spend - b.target_amount);
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

  const totalAllocated = orderedCategories.reduce((sum, cat) => sum + Number(cat.target_amount), 0);
  const totalActualSpend = orderedCategories.reduce((sum, cat) => sum + cat.actual_spend, 0);
  const totalRemaining = totalAllocated - totalActualSpend;
  const totalRatio = totalAllocated > 0 ? totalActualSpend / totalAllocated : (totalActualSpend > 0 ? 2 : 0);
  const totalBarWidth = Math.min(totalRatio * 100, 100);

  const getTotalBarColor = () => {
    if (totalRatio > 1) return 'bg-red-500';
    if (totalRatio >= 0.85) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTotalRemainingColor = () => {
    if (totalRemaining < 0) return 'text-red-600';
    if (totalRatio >= 0.85) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden print:rounded-none print:border-slate-300">
        {/* Sort header — desktop only */}
        <div className="hidden md:flex items-center gap-4 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <div className="w-48 shrink-0">
            <SortButton label="Category" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
          </div>
          <div className="w-24 shrink-0 text-right">
            <SortButton label="Target" sortKey="target_amount" sortConfig={sortConfig} onSort={handleSort} align="right" />
          </div>
          <div className="w-24 shrink-0 text-right">
            <SortButton label="Spent" sortKey="actual_spend" sortConfig={sortConfig} onSort={handleSort} align="right" />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Progress</span>
          </div>
          <div className="w-28 shrink-0 text-right">
            <SortButton label="Remaining" sortKey="difference" sortConfig={sortConfig} onSort={handleSort} align="right" />
          </div>
          <div className="w-8 shrink-0" />
        </div>

        {/* Desktop rows */}
        <div className="hidden md:block print:block">
          {sortedCategories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              totalBudget={totalBudget}
              onUpdate={onUpdate}
              onDelete={() => handleDeleteCategory(category.id)}
              isClientView={isClientView}
              renderMode="row"
            />
          ))}
        </div>

        {/* Mobile card list */}
        <div className="md:hidden print:hidden divide-y divide-slate-100">
          {sortedCategories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              totalBudget={totalBudget}
              onUpdate={onUpdate}
              onDelete={() => handleDeleteCategory(category.id)}
              isClientView={isClientView}
              renderMode="card"
            />
          ))}
        </div>

        {/* Footer totals */}
        {orderedCategories.length > 0 && (
          <>
            {/* Desktop footer */}
            <div className="hidden md:flex items-center gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <div className="w-48 shrink-0 min-w-0">
                <p className="text-sm font-medium text-slate-900">Total</p>
              </div>
              <div className="w-24 shrink-0 text-right">
                <span className="text-sm text-slate-500 tabular-nums">{formatCurrency(totalAllocated)}</span>
              </div>
              <div className="w-24 shrink-0 text-right">
                <span className="text-sm font-medium text-slate-900 tabular-nums">{formatCurrency(totalActualSpend)}</span>
              </div>
              <div className="flex-1 min-w-[10rem]">
                <div className="print:hidden">
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getTotalBarColor()}`}
                      style={{ width: `${totalBarWidth}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 tabular-nums mt-0.5">{formatPercent(totalRatio * 100)}</p>
                </div>
                <span className="hidden print:inline text-xs text-slate-600 tabular-nums">{formatCurrency(totalActualSpend)} / {formatCurrency(totalAllocated)}</span>
              </div>
              <div className="w-28 shrink-0 text-right">
                <span className={`text-sm font-medium tabular-nums ${getTotalRemainingColor()}`}>
                  {totalRemaining < 0 ? `-${formatCurrency(Math.abs(totalRemaining))}` : formatCurrency(totalRemaining)}
                </span>
              </div>
              <div className="w-8 shrink-0" />
            </div>

            {/* Mobile footer */}
            <div className="md:hidden p-4 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900">Total</span>
                <span className={`text-sm font-medium tabular-nums ${getTotalRemainingColor()}`}>
                  {totalRemaining < 0 ? `-${formatCurrency(Math.abs(totalRemaining))}` : `${formatCurrency(totalRemaining)} left`}
                </span>
              </div>
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all ${getTotalBarColor()}`}
                  style={{ width: `${totalBarWidth}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400 tabular-nums">{formatCurrency(totalActualSpend)} spent</span>
                <span className="text-xs text-slate-400 tabular-nums">{formatCurrency(totalAllocated)} allocated</span>
              </div>
            </div>
          </>
        )}

        {/* Inline add form — desktop */}
        {!isClientView && orderedCategories.length > 0 && (
          <div className="hidden md:block px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <AddCategoryForm budgetId={budgetId} onCategoryAdded={onUpdate} />
          </div>
        )}

        {/* Inline add form — mobile */}
        {!isClientView && orderedCategories.length > 0 && (
          <div className="md:hidden px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <AddCategoryForm budgetId={budgetId} onCategoryAdded={onUpdate} />
          </div>
        )}

        {orderedCategories.length === 0 && (
          <div className="m-4">
            <div className="p-8 text-center text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-lg mb-4">
              No categories yet. Add one below to start building your budget.
            </div>
            {!isClientView && (
              <AddCategoryForm budgetId={budgetId} onCategoryAdded={onUpdate} />
            )}
          </div>
        )}
      </div>

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
