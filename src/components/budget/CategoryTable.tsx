'use client';

import { useState, useEffect, useCallback } from 'react';
import { CategoryWithSpend, formatCurrency, formatPercent } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
  const [expandedDesktopIds, setExpandedDesktopIds] = useState<Set<string>>(new Set());
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();
  const { showToast } = useToast();

  // Sync ordered categories when props change
  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  // Clear desktop expanded rows when switching between coordinator/client view
  useEffect(() => {
    setExpandedDesktopIds(new Set());
  }, [isClientView]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCategories.findIndex(c => c.id === active.id);
    const newIndex = orderedCategories.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
    setOrderedCategories(newOrder);

    // Batch update sort_order values
    try {
      const updates = newOrder.map((cat, idx) => (
        supabase
          .from('categories')
          .update({ sort_order: idx })
          .eq('id', cat.id)
      ));
      await Promise.all(updates);
      onUpdate();
    } catch (err) {
      console.warn('Failed to reorder categories:', err);
      showToast('Failed to reorder categories', 'error');
      setOrderedCategories(categories); // Rollback
    }
  }, [orderedCategories, categories, supabase, onUpdate]);

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

  const handleMoveCategory = useCallback(async (categoryId: string, direction: 'up' | 'down') => {
    const idx = orderedCategories.findIndex(c => c.id === categoryId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= orderedCategories.length) return;

    const newOrder = arrayMove(orderedCategories, idx, targetIdx);
    setOrderedCategories(newOrder);

    try {
      const updates = newOrder.map((cat, i) => (
        supabase.from('categories').update({ sort_order: i }).eq('id', cat.id)
      ));
      await Promise.all(updates);
      onUpdate();
    } catch (err) {
      console.warn('Failed to move category:', err);
      showToast('Failed to move category', 'error');
      setOrderedCategories(categories);
    }
  }, [orderedCategories, categories, supabase, onUpdate]);

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

  const categoryIds = orderedCategories.map(c => c.id);

  const renderCategoryRow = (category: CategoryWithSpend, index: number, mode: 'table' | 'card') => (
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
        if (index < orderedCategories.length - 1) {
          setEditingRowIndex(index + 1);
        } else {
          setEditingRowIndex(null);
        }
      }}
      renderMode={mode === 'card' ? 'card' : 'table'}
      isExpanded={mode === 'card'
        ? expandedCategoryId === category.id
        : expandedDesktopIds.has(category.id)
      }
      onToggleExpand={mode === 'card'
        ? () => setExpandedCategoryId(expandedCategoryId === category.id ? null : category.id)
        : () => {
          setExpandedDesktopIds(prev => {
            const next = new Set(prev);
            if (next.has(category.id)) {
              next.delete(category.id);
            } else {
              next.add(category.id);
            }
            return next;
          });
        }
      }
      isDraggable={!isClientView}
      onMoveUp={index > 0 ? () => handleMoveCategory(category.id, 'up') : undefined}
      onMoveDown={index < orderedCategories.length - 1 ? () => handleMoveCategory(category.id, 'down') : undefined}
    />
  );

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden print:rounded-none print:border-slate-300">
        {/* Desktop table */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                  Estimated
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actual Spend
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Paid
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
            <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
              <tbody className={`divide-y ${isClientView ? 'divide-slate-200' : 'divide-slate-100'}`}>
                {orderedCategories.map((category, index) => renderCategoryRow(category, index, 'table'))}
              </tbody>
            </SortableContext>
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
        </DndContext>

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

      {selectedCategory && (
        <LineItemsModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          category={selectedCategory}
          onUpdate={() => {
            onUpdate();
            // Refresh the selected category data
            const updated = orderedCategories.find((c) => c.id === selectedCategory.id);
            if (updated) setSelectedCategory(updated);
          }}
          isClientView={isClientView}
        />
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
