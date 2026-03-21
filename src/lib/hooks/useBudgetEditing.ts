'use client';

import { useState, useRef, useCallback } from 'react';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { parseNumericInput, sanitizeNumericString } from '@/lib/types';

interface UseBudgetEditingOptions {
  clientId: string | null;
  currentBudget: number;
  onSaved: () => void;
}

interface UseBudgetEditingReturn {
  isEditing: boolean;
  budgetValue: string;
  setBudgetValue: (value: string) => void;
  budgetUpdateError: string | null;
  budgetInputRef: React.RefObject<HTMLInputElement | null>;
  startEditing: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleBlur: (rawValue: string) => void;
  cancel: () => void;
}

export function useBudgetEditing({
  clientId,
  currentBudget,
  onSaved,
}: UseBudgetEditingOptions): UseBudgetEditingReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');
  const [budgetUpdateError, setBudgetUpdateError] = useState<string | null>(null);
  const budgetInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = useSupabaseClient();
  const { showSaved, showToast } = useToast();

  const save = useCallback(async () => {
    if (!clientId) return;

    setBudgetUpdateError(null);

    try {
      const newBudget = parseNumericInput(budgetValue);
      if (newBudget < 0) {
        setBudgetUpdateError('Budget cannot be negative');
        return;
      }

      const { error } = await supabase
        .from('clients')
        .update({ total_budget: newBudget })
        .eq('id', clientId);

      if (error) {
        showToast('Failed to update budget', 'error');
        setBudgetUpdateError(error.message || 'Failed to update budget');
        return;
      }

      setIsEditing(false);
      showSaved();
      onSaved();
    } catch {
      showToast('Failed to update budget', 'error');
      setBudgetUpdateError('An unexpected error occurred');
    }
  }, [clientId, budgetValue, supabase, showSaved, showToast, onSaved]);

  const startEditing = useCallback(() => {
    setBudgetValue(sanitizeNumericString(currentBudget || 0));
    setBudgetUpdateError(null);
    setIsEditing(true);
    setTimeout(() => {
      budgetInputRef.current?.focus();
      budgetInputRef.current?.select();
    }, 0);
  }, [currentBudget]);

  const cancel = useCallback(() => {
    setIsEditing(false);
    setBudgetUpdateError(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }, [save, cancel]);

  const handleBlur = useCallback((rawValue: string) => {
    const value = parseNumericInput(rawValue);
    setBudgetValue(sanitizeNumericString(Math.max(0, value)));
    save();
  }, [save]);

  return {
    isEditing,
    budgetValue,
    setBudgetValue,
    budgetUpdateError,
    budgetInputRef,
    startEditing,
    handleKeyDown,
    handleBlur,
    cancel,
  };
}
