'use client';

import { useState } from 'react';
import { CategoryWithSpend, formatCurrency } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

interface CategoryRowProps {
  category: CategoryWithSpend;
  onUpdate: () => void;
  onViewLineItems: () => void;
  onDelete: () => void;
  isClientView: boolean;
}

export default function CategoryRow({
  category,
  onUpdate,
  onViewLineItems,
  onDelete,
  isClientView,
}: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState(category.target_amount.toString());
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

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

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ target_amount: parseFloat(targetAmount) || 0 })
        .eq('id', category.id);

      if (error) throw error;
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTargetAmount(category.target_amount.toString());
    setIsEditing(false);
  };

  return (
    <tr className={getRowBackground()}>
      <td className="px-4 py-3 text-sm text-slate-900">{category.name}</td>
      <td className="px-4 py-3 text-sm text-slate-900">
        {isEditing && !isClientView ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">$</span>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
              min="0"
              step="0.01"
            />
          </div>
        ) : (
          formatCurrency(category.target_amount)
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-900">{formatCurrency(category.actual_spend)}</td>
      <td className={`px-4 py-3 text-sm font-medium ${getDifferenceColor()}`}>
        {isOver ? '-' : '+'}
        {formatCurrency(Math.abs(difference))}
      </td>
      {!isClientView && (
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={loading}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={onViewLineItems}>
                  Items
                </Button>
                <Button size="sm" variant="danger" onClick={onDelete}>
                  Delete
                </Button>
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
