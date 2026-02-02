'use client';

import { useState, useRef } from 'react';
import { BookingStatus, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface AddLineItemRowProps {
  categoryId: string;
  onUpdate: () => void;
  renderMode?: 'table' | 'card';
}

export default function AddLineItemRow({ categoryId, onUpdate, renderMode = 'table' }: AddLineItemRowProps) {
  const [formData, setFormData] = useState({
    vendor_name: '',
    estimated_cost: '',
    actual_cost: '',
    notes: '',
    booking_status: 'none' as BookingStatus,
    vendor_phone: '',
    vendor_email: '',
  });
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { showSaved } = useToast();
  const vendorRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      estimated_cost: '',
      actual_cost: '',
      notes: '',
      booking_status: 'none',
      vendor_phone: '',
      vendor_email: '',
    });
    setShowMore(false);
  };

  const handleSubmit = async () => {
    if (!formData.vendor_name.trim() || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('line_items').insert({
        category_id: categoryId,
        vendor_name: formData.vendor_name.trim(),
        estimated_cost: parseNumericInput(formData.estimated_cost),
        actual_cost: parseNumericInput(formData.actual_cost),
        paid_to_date: 0,
        notes: formData.notes || null,
        booking_status: formData.booking_status,
        vendor_phone: formData.vendor_phone || null,
        vendor_email: formData.vendor_email || null,
      });

      if (error) throw error;

      resetForm();
      showSaved();
      onUpdate();
      setTimeout(() => vendorRef.current?.focus(), 0);
    } catch (err) {
      console.error('Failed to add line item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      resetForm();
    }
  };

  const handleNumericBlur = (fieldName: string, value: string) => {
    const numValue = parseNumericInput(value);
    const clamped = Math.max(0, numValue);
    setFormData(prev => ({
      ...prev,
      [fieldName]: clamped > 0 ? sanitizeNumericString(clamped) : '',
    }));
  };

  if (renderMode === 'card') {
    return (
      <div className="p-3 bg-slate-50/50 border-t border-dashed border-slate-200">
        <div className="space-y-2">
          <input
            ref={vendorRef}
            type="text"
            value={formData.vendor_name}
            onChange={e => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
            placeholder="+ Add vendor..."
          />
          {formData.vendor_name.trim() && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.estimated_cost}
                  onChange={e => setFormData(prev => ({ ...prev, estimated_cost: e.target.value }))}
                  onBlur={e => handleNumericBlur('estimated_cost', e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                  placeholder="Estimated $"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.actual_cost}
                  onChange={e => setFormData(prev => ({ ...prev, actual_cost: e.target.value }))}
                  onBlur={e => handleNumericBlur('actual_cost', e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                  placeholder="Actual $"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.booking_status}
                  onChange={e => setFormData(prev => ({ ...prev, booking_status: e.target.value as BookingStatus }))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-600"
                >
                  <option value="none">No status</option>
                  <option value="inquired">Inquired</option>
                  <option value="booked">Booked</option>
                  <option value="contracted">Contracted</option>
                  <option value="completed">Completed</option>
                </select>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                  placeholder="Notes"
                />
              </div>
              {showMore ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={formData.vendor_phone}
                    onChange={e => setFormData(prev => ({ ...prev, vendor_phone: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                    placeholder="Phone"
                  />
                  <input
                    type="email"
                    value={formData.vendor_email}
                    onChange={e => setFormData(prev => ({ ...prev, vendor_email: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                    placeholder="Email"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMore(true)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  + More fields
                </button>
              )}
              <p className="text-xs text-slate-400">Press Enter to add, Escape to clear</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Table mode
  return (
    <tr className="bg-slate-50/30">
      <td className="px-3 py-1.5">
        <input
          ref={vendorRef}
          type="text"
          value={formData.vendor_name}
          onChange={e => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
          placeholder="+ Add vendor..."
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={formData.estimated_cost}
          onChange={e => setFormData(prev => ({ ...prev, estimated_cost: e.target.value }))}
          onBlur={e => handleNumericBlur('estimated_cost', e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-20 px-2 py-1 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
          placeholder="0"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={formData.actual_cost}
          onChange={e => setFormData(prev => ({ ...prev, actual_cost: e.target.value }))}
          onBlur={e => handleNumericBlur('actual_cost', e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-20 px-2 py-1 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
          placeholder="0"
        />
      </td>
      <td className="px-3 py-1.5 text-sm text-slate-400">-</td>
      <td className="px-3 py-1.5 text-sm text-slate-400">-</td>
      <td className="px-3 py-1.5">
        <input
          type="text"
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
          placeholder="Notes"
        />
      </td>
      <td className="px-3 py-1.5">
        <span className="text-xs text-slate-400">Enter to add</span>
      </td>
    </tr>
  );
}
