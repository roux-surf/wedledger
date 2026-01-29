'use client';

import { useState, useRef, useEffect } from 'react';
import { LineItem, formatCurrency, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface LineItemRowProps {
  item: LineItem;
  onUpdate: () => void;
  onDelete: () => void;
  isClientView: boolean;
  renderMode?: 'table' | 'card';
}

export default function LineItemRow({ item, onUpdate, onDelete, isClientView, renderMode = 'table' }: LineItemRowProps) {
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
  const { showSaved } = useToast();
  const formRef = useRef<HTMLTableRowElement>(null);
  const vendorInputRef = useRef<HTMLInputElement>(null);
  const estimatedInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = useRef<HTMLInputElement>(null);
  const paidInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

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
      showSaved();
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

  // Reset editing state when switching to client view
  useEffect(() => {
    if (isClientView && isEditing) {
      setIsEditing(false);
    }
  }, [isClientView]);

  const handleStartEdit = () => {
    if (isClientView) return;
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
    // Check if focus moved to another editable input in the same row
    const focusedElement = e.relatedTarget as HTMLElement;
    const editableInputs = [
      vendorInputRef.current,
      estimatedInputRef.current,
      actualInputRef.current,
      paidInputRef.current,
      notesInputRef.current,
    ];
    if (editableInputs.includes(focusedElement as HTMLInputElement | HTMLTextAreaElement)) {
      return; // Don't save yet, focus moved to another editable field
    }
    handleSave();
  };

  const remaining = parseNumericInput(formData.actual_cost) - parseNumericInput(formData.paid_to_date);

  if (renderMode === 'card') {
    if (isEditing && !isClientView) {
      return (
        <div className="p-4 bg-slate-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Vendor</label>
              <input
                ref={vendorInputRef}
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={(e) => e.target.select()}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Estimated</label>
                <input
                  ref={estimatedInputRef}
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
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Actual</label>
                <input
                  ref={actualInputRef}
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
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Paid</label>
                <input
                  ref={paidInputRef}
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
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Notes</label>
              <textarea
                ref={notesInputRef}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                rows={2}
              />
            </div>
            <Button size="sm" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="p-4"
        onClick={isClientView ? undefined : () => handleStartEdit()}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium text-slate-900 ${!isClientView ? 'cursor-pointer' : ''}`}>
            {item.vendor_name}
          </span>
          <span className="text-sm text-slate-600">{formatCurrency(remaining)} remaining</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Est: {formatCurrency(item.estimated_cost)}</span>
          <span>Actual: {formatCurrency(item.actual_cost)}</span>
          <span>Paid: {formatCurrency(item.paid_to_date)}</span>
        </div>
        {!isClientView && item.notes && (
          <p className="text-xs text-slate-400 mt-1 truncate">{item.notes}</p>
        )}
        {!isClientView && (
          <div className="mt-2">
            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              Delete
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (isEditing && !isClientView) {
    return (
      <tr ref={formRef} className="bg-slate-50">
        <td className="px-3 py-2">
          <input
            ref={vendorInputRef}
            type="text"
            name="vendor_name"
            value={formData.vendor_name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={(e) => e.target.select()}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            ref={estimatedInputRef}
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
            ref={actualInputRef}
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
            ref={paidInputRef}
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
            ref={notesInputRef}
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
          onClick={isClientView ? undefined : () => handleStartEdit()}
          className={clickableClass}
        >
          {item.vendor_name}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-900">
        <span
          onClick={isClientView ? undefined : () => handleStartEdit()}
          className={clickableClass}
        >
          {formatCurrency(item.estimated_cost)}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-900">
        <span
          onClick={isClientView ? undefined : () => handleStartEdit()}
          className={clickableClass}
        >
          {formatCurrency(item.actual_cost)}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-900">
        <span
          onClick={isClientView ? undefined : () => handleStartEdit()}
          className={clickableClass}
        >
          {formatCurrency(item.paid_to_date)}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(remaining)}</td>
      {!isClientView && (
        <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate">
          <span
            onClick={isClientView ? undefined : () => handleStartEdit()}
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
