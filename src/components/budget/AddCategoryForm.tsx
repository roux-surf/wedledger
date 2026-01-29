'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseNumericInput, sanitizeNumericString } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface AddCategoryFormProps {
  budgetId: string;
  onCategoryAdded: () => void;
}

export default function AddCategoryForm({ budgetId, onCategoryAdded }: AddCategoryFormProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { showSaved } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('categories').insert({
        budget_id: budgetId,
        name: name.trim(),
        target_amount: parseNumericInput(targetAmount),
      });

      if (insertError) throw insertError;

      setName('');
      setTargetAmount('');
      showSaved();
      onCategoryAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleTargetAmountBlur = () => {
    const value = parseNumericInput(targetAmount);
    const clampedValue = Math.max(0, value);
    setTargetAmount(clampedValue > 0 ? sanitizeNumericString(clampedValue) : '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1">
        <Input
          id="category-name"
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          placeholder="e.g., Transportation"
          required
        />
      </div>
      <div className="w-full md:w-32">
        <Input
          id="category-target"
          label="Target ($)"
          type="text"
          inputMode="decimal"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          onBlur={handleTargetAmountBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          placeholder="0"
        />
      </div>
      <Button type="submit" disabled={loading || !name.trim()}>
        {loading ? 'Adding...' : 'Add'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
