'use client';

import { useState, useRef } from 'react';
import { LineItem, formatCurrency, parseNumericInput, sanitizeNumericString } from '@/lib/types';
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
    estimated_cost: sanitizeNumericString(item.estimated_cost),
    actual_cost: sanitizeNumericString(item.actual_cost),
    paid_to_date: sanitizeNumericString(item.paid_to_date),
    notes: item.notes || '',
  });
  const [, setLoading] = useState(false);
  const supabase = createClient();
  const formRef = useRef<HTMLTableRowElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumericBlur = (fieldName: string, value: string) => {
    const numValue = parseNumericInput(value);
    const clampedValue = Math.max(0, numValue);
    setFormData((prev) => ({
      ...prev,
      [fieldName]: sanitizeNumericString(clampedValue),
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('line_items')
        .update({
          vendor_name: formData.vendor_name,
          estimated_cost: parseNumericInput(formData.estimated_cost),
          actual_cost: parseNumericInput(formData.actual_cost),
          paid_to_date: parseNumericInput(formData.paid_to_date),
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
      estimated_cost: sanitizeNumericString(item.estimated_cost),
      actual_cost: sanitizeNumericString(item.actual_cost),
      paid_to_date: sanitizeNumericString(item.paid_to_date),
      notes: item.notes || '',
    });
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setFormData({
      vendor_name: item.vendor_name,
      estimated_cost: sanitizeNumericString(item.estimated_cost),
      actual_cost: sanitizeNumericString(item.actual_cost),
      paid_to_date: sanitizeNumericString(item.paid_to_date),
      notes: item.notes || '',
    });
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if focus moved to another input in the same row
    const focusedElement = e.relatedTarget as HTMLElement;
    if (formRef.current?.contains(focusedElement)) {
      return; // Don't save yet, focus is still within the row
    }
    handleSave();
  };

  const remaining = parseNumericInput(formData.actual_cost) - parseNumericInput(formData.paid_to_date);

  if (isEditing && !isClientView) {
    return (
      <tr ref={formRef} className="bg-slate-50">
        <td className="px-3 py-2">
          <input
            type="text"
            name="vendor_name"
            value={formData.vendor_name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            inputMode="decimal"
            name="estimated_cost"
            value={formData.estimated_cost}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              handleNumericBlur('estimated_cost', e.target.value);
              handleBlur(e);
            }}
            onFocus={(e) => e.target.select()}
            className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            inputMode="decimal"
            name="actual_cost"
            value={formData.actual_cost}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              handleNumericBlur('actual_cost', e.target.value);
              handleBlur(e);
            }}
            onFocus={(e) => e.target.select()}
            className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            inputMode="decimal"
            name="paid_to_date"
            value={formData.paid_to_date}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              handleNumericBlur('paid_to_date', e.target.value);
              handleBlur(e);
            }}
            onFocus={(e) => e.target.select()}
            className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
          />
        </td>
        <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(remaining)}</td>
        <td className="px-3 py-2">
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
            rows={1}
          />
        </td>
        <td className="px-3 py-2">
          <Button size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </td>
      </tr>
    );
  }

  const clickableClass = !isClientView ? 'cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded' : '';

  return (
    <tr>
      <td className="px-3 py-2 text-sm text-slate-900">
        <span
          onClick={() => !isClientView && handleStartEdit()}
          className={clickableClass}
        >
          {item.vendor_name}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-900">
        <span
          onClick={() => !isClientView && handleStartEdit()}
          className={clickableClass}
        >
          {formatCurrency(item.estimated_cost)}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-900">
        <span
          onClick={() => !isClientView && handleStartEdit()}
          className={clickableClass}
        >
          {formatCurrency(item.actual_cost)}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-900">
        <span
          onClick={() => !isClientView && handleStartEdit()}
          className={clickableClass}
        >
          {formatCurrency(item.paid_to_date)}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(remaining)}</td>
      {!isClientView && (
        <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate">
          <span
            onClick={() => !isClientView && handleStartEdit()}
            className={clickableClass}
          >
            {item.notes || '-'}
          </span>
        </td>
      )}
      {!isClientView && (
        <td className="px-3 py-2">
          <Button size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </td>
      )}
    </tr>
  );
}
