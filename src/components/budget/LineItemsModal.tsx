'use client';

import { useState } from 'react';
import { CategoryWithSpend, LineItemWithPayments, BookingStatus, formatCurrency, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import LineItemRow from './LineItemRow';

interface LineItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryWithSpend;
  onUpdate: () => void;
  isClientView: boolean;
}

export default function LineItemsModal({
  isOpen,
  onClose,
  category,
  onUpdate,
  isClientView,
}: LineItemsModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    vendor_name: '',
    estimated_cost: '',
    actual_cost: '',
    notes: '',
    booking_status: 'none' as BookingStatus,
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { showSaved } = useToast();

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.vendor_name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('line_items').insert({
        category_id: category.id,
        vendor_name: newItem.vendor_name.trim(),
        estimated_cost: parseNumericInput(newItem.estimated_cost),
        actual_cost: parseNumericInput(newItem.actual_cost),
        paid_to_date: 0,
        notes: newItem.notes || null,
        booking_status: newItem.booking_status,
      });

      if (error) throw error;

      setNewItem({
        vendor_name: '',
        estimated_cost: '',
        actual_cost: '',
        notes: '',
        booking_status: 'none',
      });
      setShowAddForm(false);
      showSaved();
      onUpdate();
    } catch (err) {
      console.error('Failed to add line item:', err);
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

  const handleAddFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowAddForm(false);
      setNewItem({
        vendor_name: '',
        estimated_cost: '',
        actual_cost: '',
        notes: '',
        booking_status: 'none',
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this line item?')) return;

    try {
      const { error } = await supabase.from('line_items').delete().eq('id', itemId);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Failed to delete line item:', err);
    }
  };

  const lineItems = (category.line_items || []) as LineItemWithPayments[];
  const totalActual = lineItems.reduce((sum, item) => sum + (Number(item.actual_cost) || 0), 0);
  const totalPaid = lineItems.reduce((sum, item) => {
    const hasPayments = item.payments && item.payments.length > 0;
    return sum + (hasPayments ? item.total_paid : (Number(item.paid_to_date) || 0));
  }, 0);
  const totalRemaining = totalActual - totalPaid;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${category.name} - Line Items`}>
      <div className="mb-4 p-4 bg-slate-50 rounded-lg">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500 uppercase">Target</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(category.target_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Actual Spend</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(totalActual)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Remaining to Pay</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(totalRemaining)}</p>
          </div>
        </div>
      </div>

      {lineItems.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estimated</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actual</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Paid</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Remaining</th>
                  {!isClientView && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    onUpdate={onUpdate}
                    onDelete={() => handleDeleteItem(item.id)}
                    isClientView={isClientView}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-slate-100">
            {lineItems.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                onUpdate={onUpdate}
                onDelete={() => handleDeleteItem(item.id)}
                isClientView={isClientView}
                renderMode="card"
              />
            ))}
          </div>
        </>
      ) : (
        <p className="text-center text-slate-500 py-8">No line items yet.</p>
      )}

      {!isClientView && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          {showAddForm ? (
            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={newItem.vendor_name}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, vendor_name: e.target.value }))}
                    onKeyDown={handleAddFormKeyDown}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                    placeholder="e.g., ABC Catering"
                    required
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
                    onKeyDown={handleAddFormKeyDown}
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
                    onKeyDown={handleAddFormKeyDown}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Booking Status</label>
                <select
                  value={newItem.booking_status}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, booking_status: e.target.value as BookingStatus }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
                >
                  <option value="none">None</option>
                  <option value="inquired">Inquired</option>
                  <option value="booked">Booked</option>
                  <option value="contracted">Contracted</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading || !newItem.vendor_name.trim()}>
                  {loading ? 'Adding...' : 'Add Line Item'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setShowAddForm(true)}>Add Line Item</Button>
          )}
        </div>
      )}
    </Modal>
  );
}
