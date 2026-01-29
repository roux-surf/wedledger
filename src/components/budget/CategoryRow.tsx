'use client';

import { useState, useEffect, useRef } from 'react';
import { CategoryWithSpend, formatCurrency, formatPercent, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

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
}: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState(category.target_amount.toString());
  const [allocationPercent, setAllocationPercent] = useState('');
  const [, setLoading] = useState(false);
  const supabase = createClient();
  const { showSaved } = useToast();

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

  return (
    <tr ref={rowRef} className={`break-inside-avoid ${getRowBackground()}`}>
      <td className={`px-4 ${isClientView ? 'py-4' : 'py-3'} text-sm text-slate-900`}>{category.name}</td>
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
            <Button size="sm" variant="secondary" onClick={onViewLineItems}>
              Items
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </td>
      )}
    </tr>
  );
}
