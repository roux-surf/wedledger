'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseNumericInput, sanitizeNumericString } from '@/lib/types';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface AddLineItemFormProps {
  categoryId: string;
  onItemAdded: () => void;
}

export default function AddLineItemForm({ categoryId, onItemAdded }: AddLineItemFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    vendor_name: '',
    estimated_cost: '',
    actual_cost: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { showSaved, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.vendor_name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('line_items').insert({
        category_id: categoryId,
        vendor_name: newItem.vendor_name.trim(),
        estimated_cost: parseNumericInput(newItem.estimated_cost),
        actual_cost: parseNumericInput(newItem.actual_cost),
        paid_to_date: 0,
        notes: newItem.notes || null,
      });

      if (error) throw error;

      setNewItem({ vendor_name: '', estimated_cost: '', actual_cost: '', notes: '' });
      setShowForm(false);
      showSaved();
      onItemAdded();
    } catch (err) {
      console.error('Failed to add line item:', err);
      showError('Failed to add line item');
    } finally {
      setLoading(false);
    }
  };

  const handleNumericBlur = (fieldName: string, value: string) => {
    const numValue = parseNumericInput(value);
    const clampedValue = Math.max(0, numValue);
    setNewItem((prev) => ({
      ...prev,
      [fieldName]: clampedValue > 0 ? sanitizeNumericString(clampedValue) : '',
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowForm(false);
      setNewItem({ vendor_name: '', estimated_cost: '', actual_cost: '', notes: '' });
    }
  };

  if (!showForm) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
        Add Line Item
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Vendor Name</label>
          <input
            type="text"
            value={newItem.vendor_name}
            onChange={(e) => setNewItem((prev) => ({ ...prev, vendor_name: e.target.value }))}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
            placeholder="e.g., ABC Catering"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Cost</label>
          <input
            type="text"
            inputMode="decimal"
            value={newItem.estimated_cost}
            onChange={(e) => setNewItem((prev) => ({ ...prev, estimated_cost: e.target.value }))}
            onBlur={(e) => handleNumericBlur('estimated_cost', e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Actual Cost</label>
          <input
            type="text"
            inputMode="decimal"
            value={newItem.actual_cost}
            onChange={(e) => setNewItem((prev) => ({ ...prev, actual_cost: e.target.value }))}
            onBlur={(e) => handleNumericBlur('actual_cost', e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes (Internal)</label>
        <textarea
          value={newItem.notes}
          onChange={(e) => setNewItem((prev) => ({ ...prev, notes: e.target.value }))}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
          rows={2}
          placeholder="Internal notes..."
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !newItem.vendor_name.trim()}>
          {loading ? 'Adding...' : 'Add Line Item'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => { setShowForm(false); setNewItem({ vendor_name: '', estimated_cost: '', actual_cost: '', notes: '' }); }}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
