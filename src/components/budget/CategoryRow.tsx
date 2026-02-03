'use client';

import { useState, useEffect, useRef } from 'react';
import { CategoryWithSpend, formatCurrency, formatPercent, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/components/ui/Toast';
import DragHandle from '@/components/ui/DragHandle';

interface CategoryRowProps {
  category: CategoryWithSpend;
  totalBudget: number;
  onUpdate: () => void;
  onDelete: () => void;
  isClientView: boolean;
  onTabToNextRow?: () => void;
  shouldStartEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  renderMode?: 'table' | 'card';
  isDraggable?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function CategoryRow({
  category,
  totalBudget,
  onUpdate,
  onDelete,
  isClientView,
  onTabToNextRow,
  shouldStartEditing,
  onEditingChange,
  renderMode = 'table',
  isDraggable,
  onMoveUp,
  onMoveDown,
}: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState(category.target_amount.toString());
  const [allocationPercent, setAllocationPercent] = useState('');
  const [, setLoading] = useState(false);
  const supabase = createClient();
  const { showSaved, showToast } = useToast();

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

  const targetInputRef = useRef<HTMLInputElement>(null);
  const percentInputRef = useRef<HTMLInputElement>(null);

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
      console.warn('Failed to update category:', err);
      showToast('Failed to update category', 'error');
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
    return (
      <div className={`${getRowBackground()}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
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
                <span className="text-slate-500">Estimated</span>
                <span className="font-medium text-slate-900">{formatCurrency(category.estimated_total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Committed</span>
                <span className="font-medium text-slate-900">{formatCurrency(category.actual_spend)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Paid</span>
                <span className="font-medium text-slate-900">{formatCurrency(category.total_paid)}</span>
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
      </div>
    );
  }

  return (
    <tr ref={setNodeRef} style={sortableStyle} className={`break-inside-avoid ${getRowBackground()}`}>
      <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900`}>
        <div className="flex items-center gap-2">
          {isDraggable && (
            <DragHandle listeners={listeners} attributes={attributes} />
          )}
          <span>{category.name}</span>
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
      <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900 text-right whitespace-nowrap`}>{formatCurrency(category.estimated_total)}</td>
      <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900 text-right whitespace-nowrap`}>{formatCurrency(category.actual_spend)}</td>
      <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900 text-right whitespace-nowrap`}>{formatCurrency(category.total_paid)}</td>
      <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm font-medium text-right whitespace-nowrap ${getDifferenceColor()}`}>
        {isOver ? '-' : '+'}
        {formatCurrency(Math.abs(difference))}
      </td>
      {!isClientView && (
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
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
  );
}
