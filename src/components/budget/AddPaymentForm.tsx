'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseNumericInput, sanitizeNumericString } from '@/lib/types';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface AddPaymentFormProps {
  lineItemId: string;
  onPaymentAdded: () => void;
}

export default function AddPaymentForm({ lineItemId, onPaymentAdded }: AddPaymentFormProps) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { showSaved } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('payments').insert({
        line_item_id: lineItemId,
        label: label.trim(),
        amount: parseNumericInput(amount),
        due_date: dueDate || null,
      });

      if (error) throw error;

      setLabel('');
      setAmount('');
      setDueDate('');
      showSaved();
      onPaymentAdded();
    } catch (err) {
      console.error('Failed to add payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountBlur = () => {
    const value = parseNumericInput(amount);
    const clamped = Math.max(0, value);
    setAmount(clamped > 0 ? sanitizeNumericString(clamped) : '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setLabel('');
      setAmount('');
      setDueDate('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 md:flex-row md:items-end">
      <div className="flex-1">
        <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
          placeholder="e.g., Deposit, Final Balance"
          required
        />
      </div>
      <div className="w-full md:w-28">
        <label className="block text-xs font-medium text-slate-600 mb-1">Amount</label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={handleAmountBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
          placeholder="0"
        />
      </div>
      <div className="w-full md:w-36">
        <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
        />
      </div>
      <Button type="submit" size="sm" disabled={loading || !label.trim()}>
        {loading ? 'Adding...' : 'Add'}
      </Button>
    </form>
  );
}
