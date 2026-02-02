'use client';

import { useState, useEffect, useRef } from 'react';
import { CategoryWithSpend, LineItemWithPayments, formatCurrency, formatPercent, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/components/ui/Toast';
import DragHandle from '@/components/ui/DragHandle';
import LineItemRow from './LineItemRow';
import AddLineItemRow from './AddLineItemRow';

interface CategoryRowProps {
  category: CategoryWithSpend;
  totalBudget: number;
  onUpdate: () => void;
  onViewLineItems: () => void;
  onDelete: () => void;
  isClientView: boolean;
  onTabToNextRow?: () => void;
  shouldStartEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  renderMode?: 'table' | 'card';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isDraggable?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function CategoryRow({
  category,
  totalBudget,
  onUpdate,
  onViewLineItems,
  onDelete,
  isClientView,
  onTabToNextRow,
  shouldStartEditing,
  onEditingChange,
  renderMode = 'table',
  isExpanded,
  onToggleExpand,
  isDraggable,
  onMoveUp,
  onMoveDown,
}: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState(category.target_amount.toString());
  const [allocationPercent, setAllocationPercent] = useState('');
  const [, setLoading] = useState(false);
  const supabase = createClient();
  const { showSaved } = useToast();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !isDraggable || renderMode === 'card' });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const lineItemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleLineItemDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = category.line_items || [];
    const oldIndex = items.findIndex(li => li.id === active.id);
    const newIndex = items.findIndex(li => li.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(items, oldIndex, newIndex);
    try {
      const updates = newOrder.map((li, idx) => (
        supabase.from('line_items').update({ sort_order: idx }).eq('id', li.id)
      ));
      await Promise.all(updates);
      onUpdate();
    } catch (err) {
      console.error('Failed to reorder line items:', err);
    }
  };

  const targetInputRef = useRef<HTMLInputElement>(null);
  const percentInputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Calculate allocation percentage from target amount
  const calculatePercent = (amount: number): string => {
    if (totalBudget <= 0) return '0';
    const percent = (amount / totalBudget) * 100;
    return sanitizeNumericString(Math.round(percent * 10) / 10);
  };

  // Calculate target amount from allocation percentage
  const calculateAmount = (percent: number): string => {
    const amount = (percent / 100) * totalBudget;
    return sanitizeNumericString(Math.round(amount * 100) / 100);
  };

  // Initialize allocation percent when entering edit mode or when category changes
  useEffect(() => {
    setTargetAmount(sanitizeNumericString(category.target_amount));
    setAllocationPercent(calculatePercent(category.target_amount));
  }, [category.target_amount, totalBudget]);

  // Handle external trigger to start editing
  useEffect(() => {
    if (shouldStartEditing && !isClientView) {
      handleStartEdit('target');
      onEditingChange?.(true);
    }
  }, [shouldStartEditing]);

  // Reset editing state when switching to client view
  useEffect(() => {
    if (isClientView && isEditing) {
      setIsEditing(false);
      onEditingChange?.(false);
    }
  }, [isClientView]);

  // Current allocation percentage for display
  const currentPercent = totalBudget > 0
    ? ((category.target_amount / totalBudget) * 100)
    : 0;

  const difference = category.target_amount - category.actual_spend;
  const isOver = difference < 0;
  const isNear = !isOver && category.target_amount > 0 && category.actual_spend >= category.target_amount * 0.9;

  const getDifferenceColor = () => {
    if (isOver) return 'text-red-600';
    if (isNear) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRowBackground = () => {
    if (isOver) return 'bg-red-50';
    if (isNear) return 'bg-yellow-50';
    return '';
  };

  const handleTargetAmountChange = (value: string) => {
    const amount = parseNumericInput(value);
    const clampedAmount = Math.max(0, amount);
    setTargetAmount(sanitizeNumericString(clampedAmount));
    setAllocationPercent(calculatePercent(clampedAmount));
  };

  const handleAllocationPercentChange = (value: string) => {
    const percent = parseNumericInput(value);
    const clampedPercent = Math.max(0, percent);
    setAllocationPercent(sanitizeNumericString(clampedPercent));
    setTargetAmount(calculateAmount(clampedPercent));
  };

  const handleSave = async (amountToSave?: number) => {
    setLoading(true);
    try {
      const newTargetAmount = amountToSave !== undefined ? amountToSave : parseNumericInput(targetAmount);
      const { error } = await supabase
        .from('categories')
        .update({ target_amount: newTargetAmount })
        .eq('id', category.id);

      if (error) throw error;
      setIsEditing(false);
      onEditingChange?.(false);
      showSaved();
      onUpdate();
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTargetAmount(sanitizeNumericString(category.target_amount));
    setAllocationPercent(calculatePercent(category.target_amount));
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleStartEdit = (focusTarget: 'target' | 'percent' = 'target') => {
    if (isClientView) return;
    setTargetAmount(sanitizeNumericString(category.target_amount));
    setAllocationPercent(calculatePercent(category.target_amount));
    setIsEditing(true);
    onEditingChange?.(true);
    setTimeout(() => {
      if (focusTarget === 'target') {
        targetInputRef.current?.focus();
        targetInputRef.current?.select();
      } else {
        percentInputRef.current?.focus();
        percentInputRef.current?.select();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent, source: 'target' | 'percent') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Compute the correct amount based on which field was edited
      if (source === 'percent') {
        const percent = parseNumericInput(allocationPercent);
        const amount = (Math.max(0, percent) / 100) * totalBudget;
        handleSave(Math.round(amount * 100) / 100);
      } else {
        handleSave(Math.max(0, parseNumericInput(targetAmount)));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab' && !e.shiftKey && source === 'percent') {
      // Tab forward from percent field - save and move to next row
      e.preventDefault();
      const percent = parseNumericInput(allocationPercent);
      const amount = (Math.max(0, percent) / 100) * totalBudget;
      handleSave(Math.round(amount * 100) / 100);
      onTabToNextRow?.();
    }
  };

  const handleBlur = (e: React.FocusEvent, amountToSave: number) => {
    // Check if focus moved to another editable input in the same row
    const focusedElement = e.relatedTarget as HTMLElement;
    const isTargetInput = focusedElement === targetInputRef.current;
    const isPercentInput = focusedElement === percentInputRef.current;
    if (isTargetInput || isPercentInput) {
      return; // Don't save yet, focus moved to another editable field
    }
    handleSave(amountToSave);
  };

  if (renderMode === 'card') {
    const lineItems = category.line_items || [];
    const hasExpandBehavior = !!onToggleExpand;
    const hasLineItems = lineItems.length > 0;

    return (
      <div className={`${getRowBackground()}`}>
        {/* Card header: tappable in client view for expand/collapse */}
        <div
          className={`p-4 ${hasExpandBehavior ? 'cursor-pointer hover:bg-slate-50/50 active:bg-slate-100/50 transition-colors' : ''}`}
          onClick={hasExpandBehavior ? onToggleExpand : undefined}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {hasExpandBehavior && (
                <svg
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-slate-600' : hasLineItems ? 'text-slate-400' : 'text-slate-300'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              <span className="text-sm font-semibold text-slate-900">{category.name}</span>
            </div>
            <span className="text-xs text-slate-500">{formatPercent(currentPercent)} of budget</span>
          </div>

          {/* Editable fields for coordinator */}
          {isEditing && !isClientView ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 uppercase mb-1">Budgeted</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-xs">$</span>
                    <input
                      ref={targetInputRef}
                      type="text"
                      inputMode="decimal"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'target')}
                      onBlur={(e) => {
                        const amount = Math.max(0, parseNumericInput(e.target.value));
                        handleTargetAmountChange(e.target.value);
                        handleBlur(e, amount);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase mb-1">Allocation</label>
                  <div className="flex items-center gap-1">
                    <input
                      ref={percentInputRef}
                      type="text"
                      inputMode="decimal"
                      value={allocationPercent}
                      onChange={(e) => setAllocationPercent(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'percent')}
                      onBlur={(e) => {
                        const percent = Math.max(0, parseNumericInput(e.target.value));
                        const amount = (percent / 100) * totalBudget;
                        const roundedAmount = Math.round(amount * 100) / 100;
                        handleAllocationPercentChange(e.target.value);
                        handleBlur(e, roundedAmount);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                    <span className="text-slate-500 text-xs">%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Committed</span>
                <span className="font-medium text-slate-900">{formatCurrency(category.actual_spend)}</span>
              </div>
            </div>
          ) : (
            /* Read-only data rows */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Budgeted</span>
                <span
                  className={`font-medium text-slate-900 ${!isClientView ? 'cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded' : ''}`}
                  onClick={isClientView ? undefined : (e) => { e.stopPropagation(); handleStartEdit('target'); }}
                >
                  {formatCurrency(category.target_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Committed</span>
                <span className="font-medium text-slate-900">{formatCurrency(category.actual_spend)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Remaining</span>
                <span className={`font-medium ${getDifferenceColor()}`}>
                  {isOver ? '-' : ''}{formatCurrency(Math.abs(difference))}
                </span>
              </div>
            </div>
          )}

          {/* Coordinator actions */}
          {!isClientView && !isEditing && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              {(onMoveUp || onMoveDown) && (
                <div className="flex items-center gap-0.5 mr-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
                    disabled={!onMoveUp}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
                    disabled={!onMoveDown}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              )}
              <button
                onClick={onViewLineItems}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
                title="Open line items detail view"
              >
                Detail view
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                aria-label="Delete"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Expanded line items (client view accordion) */}
        {isExpanded && isClientView && lineItems.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-slate-50 rounded-lg divide-y divide-slate-200">
              {lineItems.map((item: LineItemWithPayments) => (
                <div key={item.id} className="px-3 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-slate-700">{item.vendor_name}</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(item.actual_cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded line items (coordinator card mode) */}
        {isExpanded && !isClientView && (
          <div className="px-4 pb-4">
            {lineItems.length > 0 ? (
              <div className="bg-slate-50 rounded-lg divide-y divide-slate-200">
                {lineItems.map((item: LineItemWithPayments) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    onUpdate={onUpdate}
                    onDelete={() => handleDeleteLineItem(item.id)}
                    isClientView={false}
                    renderMode="card"
                  />
                ))}
              </div>
            ) : null}
            <AddLineItemRow categoryId={category.id} onUpdate={onUpdate} renderMode="card" />
          </div>
        )}
      </div>
    );
  }

  const lineItems = category.line_items || [];
  const hasLineItems = lineItems.length > 0;

  const handleDeleteLineItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this line item?')) return;
    try {
      const { error } = await supabase.from('line_items').delete().eq('id', itemId);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Failed to delete line item:', err);
    }
  };

  return (
    <>
      <tr ref={setNodeRef} style={sortableStyle} className={`break-inside-avoid ${getRowBackground()}`}>
        <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900`}>
          <div className="flex items-center gap-2">
            {isDraggable && (
              <DragHandle listeners={listeners} attributes={attributes} />
            )}
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex-shrink-0 p-0.5 rounded hover:bg-slate-100 transition-colors"
              aria-label={isExpanded ? 'Collapse line items' : 'Expand line items'}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-slate-600' : hasLineItems ? 'text-slate-400' : 'text-slate-300'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span
              className="cursor-pointer"
              onClick={onToggleExpand}
            >
              {category.name}
            </span>
          </div>
        </td>
        <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900 text-right whitespace-nowrap`}>
          {isEditing && !isClientView ? (
            <div className="flex items-center gap-2 justify-end">
              <span className="text-slate-500">$</span>
              <input
                ref={targetInputRef}
                type="text"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'target')}
                onBlur={(e) => {
                  const amount = Math.max(0, parseNumericInput(e.target.value));
                  handleTargetAmountChange(e.target.value);
                  handleBlur(e, amount);
                }}
                onFocus={(e) => e.target.select()}
                className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
          ) : (
            <span
              onClick={isClientView ? undefined : () => handleStartEdit('target')}
              className={isClientView ? '' : 'cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded'}
            >
              {formatCurrency(category.target_amount)}
            </span>
          )}
        </td>
        <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900 text-right whitespace-nowrap`}>
          {isEditing && !isClientView ? (
            <div className="flex items-center gap-1 justify-end">
              <input
                ref={percentInputRef}
                type="text"
                inputMode="decimal"
                value={allocationPercent}
                onChange={(e) => setAllocationPercent(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'percent')}
                onBlur={(e) => {
                  const percent = Math.max(0, parseNumericInput(e.target.value));
                  const amount = (percent / 100) * totalBudget;
                  const roundedAmount = Math.round(amount * 100) / 100;
                  handleAllocationPercentChange(e.target.value);
                  handleBlur(e, roundedAmount);
                }}
                onFocus={(e) => e.target.select()}
                className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
              />
              <span className="text-slate-500">%</span>
            </div>
          ) : (
            <span
              onClick={isClientView ? undefined : () => handleStartEdit('percent')}
              className={isClientView ? 'text-slate-600' : 'cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded text-slate-600'}
            >
              {formatPercent(currentPercent)}
            </span>
          )}
        </td>
        <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900 text-right whitespace-nowrap`}>{formatCurrency(category.actual_spend)}</td>
        <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm font-medium text-right whitespace-nowrap ${getDifferenceColor()}`}>
          {isOver ? '-' : '+'}
          {formatCurrency(Math.abs(difference))}
        </td>
        {!isClientView && (
          <td className="px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={onViewLineItems}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
                title="Open line items detail view"
              >
                Detail
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                aria-label="Delete"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        )}
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={isClientView ? 5 : 6} className="px-4 py-3">
            <div className="ml-6 overflow-x-auto">
              <DndContext sensors={lineItemSensors} collisionDetection={closestCenter} onDragEnd={handleLineItemDragEnd}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estimated</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actual</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Paid</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Remaining</th>
                    </tr>
                  </thead>
                  <SortableContext items={lineItems.map(li => li.id)} strategy={verticalListSortingStrategy}>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((item: LineItemWithPayments) => (
                        <LineItemRow
                          key={item.id}
                          item={item}
                          onUpdate={onUpdate}
                          onDelete={() => handleDeleteLineItem(item.id)}
                          isClientView={isClientView}
                          isDraggable={!isClientView}
                        />
                      ))}
                      {!isClientView && (
                        <AddLineItemRow categoryId={category.id} onUpdate={onUpdate} />
                      )}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
              {isClientView && !hasLineItems && (
                <p className="text-sm text-slate-500 italic py-2">No line items</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
