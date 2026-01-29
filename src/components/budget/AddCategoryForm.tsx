'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('categories').insert({
        budget_id: budgetId,
        name: name.trim(),
        target_amount: parseFloat(targetAmount) || 0,
      });

      if (insertError) throw insertError;

      setName('');
      setTargetAmount('');
      onCategoryAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <Input
          id="category-name"
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Transportation"
          required
        />
      </div>
      <div className="w-32">
        <Input
          id="category-target"
          label="Target ($)"
          type="number"
          value={targetAmount}
          onChange={(e) => {
            const value = parseFloat(e.target.value) || 0;
            setTargetAmount(Math.max(0, value).toString());
          }}
          placeholder="0"
          min="0"
          step="0.01"
        />
      </div>
      <Button type="submit" disabled={loading || !name.trim()}>
        {loading ? 'Adding...' : 'Add'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
