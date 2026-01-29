'use client';

import { useState } from 'react';
import { LineItem, formatCurrency } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

interface LineItemRowProps {
  item: LineItem;
  onUpdate: () => void;
  onDelete: () => void;
  isClientView: boolean;
}

export default function LineItemRow({ item, onUpdate, onDelete, isClientView }: LineItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: item.vendor_name,
    estimated_cost: item.estimated_cost.toString(),
    actual_cost: item.actual_cost.toString(),
    paid_to_date: item.paid_to_date.toString(),
    notes: item.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('line_items')
        .update({
          vendor_name: formData.vendor_name,
          estimated_cost: parseFloat(formData.estimated_cost) || 0,
          actual_cost: parseFloat(formData.actual_cost) || 0,
          paid_to_date: parseFloat(formData.paid_to_date) || 0,
          notes: formData.notes || null,
        })
        .eq('id', item.id);

      if (error) throw error;
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to update line item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      vendor_name: item.vendor_name,
      estimated_cost: item.estimated_cost.toString(),
      actual_cost: item.actual_cost.toString(),
      paid_to_date: item.paid_to_date.toString(),
      notes: item.notes || '',
    });
    setIsEditing(false);
  };

  const remaining = (parseFloat(formData.actual_cost) || 0) - (parseFloat(formData.paid_to_date) || 0);

  if (isEditing && !isClientView) {
    return (
      <tr className="bg-slate-50">
        <td className="px-3 py-2">
          <input
            type="text"
            name="vendor_name"
            value={formData.vendor_name}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            name="estimated_cost"
            value={formData.estimated_cost}
            onChange={handleChange}
            className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
            min="0"
            step="0.01"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            name="actual_cost"
            value={formData.actual_cost}
            onChange={handleChange}
            className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
            min="0"
            step="0.01"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            name="paid_to_date"
            value={formData.paid_to_date}
            onChange={handleChange}
            className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
            min="0"
            step="0.01"
          />
        </td>
        <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(remaining)}</td>
        <td className="px-3 py-2">
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
            rows={1}
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-3 py-2 text-sm text-slate-900">{item.vendor_name}</td>
      <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(item.estimated_cost)}</td>
      <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(item.actual_cost)}</td>
      <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(item.paid_to_date)}</td>
      <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(remaining)}</td>
      {!isClientView && (
        <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate">{item.notes || '-'}</td>
      )}
      {!isClientView && (
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
              Edit
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
