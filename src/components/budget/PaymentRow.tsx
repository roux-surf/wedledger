'use client';

import { useState, useRef } from 'react';
import { Payment, formatCurrency, formatShortDate, getPaymentUrgency, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import DateInput from '@/components/ui/DateInput';

interface PaymentRowProps {
  payment: Payment;
  lineItemId: string;
  actualCost?: number;
  totalScheduled: number;
  onUpdate: () => void;
  onDelete: () => void;
  isClientView: boolean;
  renderMode?: 'table' | 'card';
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function PaymentRow({ payment, lineItemId, actualCost, totalScheduled, onUpdate, onDelete, isClientView, renderMode = 'table', showCheckbox, isSelected, onToggleSelect }: PaymentRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    label: payment.label,
    amount: sanitizeNumericString(payment.amount),
    due_date: payment.due_date || '',
  });
  const [loading, setLoading] = useState(false);
  const supabase = useSupabaseClient();
  const { showSaved, showToast } = useToast();
  const labelRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const editContainerRef = useRef<HTMLElement>(null);

  const getStatusBadge = () => {
    if (payment.status === 'paid') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sage-light text-sage-dark">Paid</span>;
    }
    if (payment.due_date) {
      const urgency = getPaymentUrgency(payment.due_date);
      if (urgency === 'overdue') {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-light text-rose-dark">Overdue</span>;
      }
      if (urgency === 'this_week') {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-champagne-light text-champagne-dark">Due Soon</span>;
      }
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-lighter text-warm-gray">Pending</span>;
  };

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const newAmount = parseNumericInput(formData.amount);
      const oldAmount = Number(payment.amount);
      const amountDelta = newAmount - oldAmount;

      const { error } = await supabase
        .from('payments')
        .update({
          label: formData.label,
          amount: newAmount,
          due_date: formData.due_date || null,
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Sync actual_cost when it tracks totalScheduled (auto-derived from payments)
      if (amountDelta !== 0 && actualCost === totalScheduled) {
        const newActualCost = Math.max(0, totalScheduled + amountDelta);
        await supabase
          .from('line_items')
          .update({ actual_cost: newActualCost })
          .eq('id', lineItemId);
      }

      setIsEditing(false);
      showSaved();
      onUpdate();
    } catch (err) {
      console.warn('Failed to update payment:', err);
      showToast('Failed to update payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      label: payment.label,
      amount: sanitizeNumericString(payment.amount),
      due_date: payment.due_date || '',
    });
    setIsEditing(false);
  };

  const handleTogglePaid = async () => {
    if (isClientView || loading) return;
    setLoading(true);
    try {
      const newStatus = payment.status === 'paid' ? 'pending' : 'paid';
      const { error } = await supabase
        .from('payments')
        .update({
          status: newStatus,
          paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', payment.id);

      if (error) throw error;
      showSaved();
      onUpdate();
    } catch (err) {
      console.warn('Failed to toggle payment status:', err);
      showToast('Failed to update payment status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (field?: 'label' | 'amount' | 'due_date') => {
    if (isClientView) return;
    setFormData({
      label: payment.label,
      amount: sanitizeNumericString(payment.amount),
      due_date: payment.due_date || '',
    });
    setIsEditing(true);
    if (field && field !== 'due_date') {
      const refMap = { label: labelRef, amount: amountRef };
      setTimeout(() => refMap[field].current?.focus(), 0);
    }
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
    if (loading) return;
    const focusedElement = e.relatedTarget as HTMLElement;
    if (focusedElement && editContainerRef.current?.contains(focusedElement)) {
      return;
    }
    handleSave();
  };

  // Card mode (mobile)
  if (renderMode === 'card') {
    if (isEditing && !isClientView) {
      return (
        <div ref={editContainerRef as React.RefObject<HTMLDivElement>} className="p-3 bg-stone-lighter border-b border-stone-lighter">
          <div className="space-y-2">
            <input
              ref={labelRef}
              type="text"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onFocus={(e) => e.target.select()}
              className="w-full px-2 py-1.5 border border-stone rounded text-sm"
              placeholder="Payment label"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                  const v = parseNumericInput(e.target.value);
                  setFormData(prev => ({ ...prev, amount: sanitizeNumericString(Math.max(0, v)) }));
                  handleBlur(e);
                }}
                onFocus={(e) => e.target.select()}
                className="w-full px-2 py-1.5 border border-stone rounded text-sm"
                placeholder="Amount"
              />
              <DateInput
                value={formData.due_date}
                onChange={(iso) => setFormData(prev => ({ ...prev, due_date: iso }))}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-full px-2 py-1.5 border border-stone rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-warm-gray-light">Enter to save · Esc to cancel</span>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light"
                aria-label="Delete"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="p-3 border-b border-stone-lighter flex items-center justify-between gap-2 hover:bg-stone-lighter transition-colors duration-100"
        onClick={isClientView ? undefined : () => handleStartEdit()}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${!isClientView ? 'cursor-pointer' : ''} ${payment.status === 'paid' ? 'text-warm-gray-light line-through' : 'text-charcoal'}`}>
              {payment.label}
            </span>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-3 text-xs text-warm-gray mt-0.5">
            <span>{formatCurrency(payment.amount)}</span>
            {payment.due_date && <span>Due {formatShortDate(payment.due_date)}</span>}
            {payment.paid_date && <span>Paid {formatShortDate(payment.paid_date)}</span>}
          </div>
        </div>
        {!isClientView && (
          <button
            onClick={(e) => { e.stopPropagation(); handleTogglePaid(); }}
            disabled={loading}
            className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' :
              payment.status === 'paid'
                ? 'bg-sage border-sage text-white'
                : 'border-stone hover:border-warm-gray-light'
            }`}
          >
            {payment.status === 'paid' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}
      </div>
    );
  }

  // Table mode (desktop)
  if (isEditing && !isClientView) {
    return (
      <tr ref={editContainerRef as React.RefObject<HTMLTableRowElement>} className="bg-stone-lighter">
        {showCheckbox && <td className="px-2 py-1.5"></td>}
        <td className="px-4 py-1.5">
          <input
            ref={labelRef}
            type="text"
            value={formData.label}
            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={(e) => e.target.select()}
            className="w-full px-2 py-1 border border-stone rounded text-sm"
          />
        </td>
        <td className="px-4 py-1.5">
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              const v = parseNumericInput(e.target.value);
              setFormData(prev => ({ ...prev, amount: sanitizeNumericString(Math.max(0, v)) }));
              handleBlur(e);
            }}
            onFocus={(e) => e.target.select()}
            className="w-24 px-2 py-1 border border-stone rounded text-sm"
          />
        </td>
        <td className="px-4 py-1.5">
          <DateInput
            value={formData.due_date}
            onChange={(iso) => setFormData(prev => ({ ...prev, due_date: iso }))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-28 px-2 py-1 border border-stone rounded text-sm"
          />
        </td>
        <td className="px-4 py-1.5">
          <div className="flex items-center justify-between">
            {getStatusBadge()}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-warm-gray-light">Enter to save · Esc to cancel</span>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light"
                aria-label="Delete"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  const clickableClass = !isClientView ? 'cursor-pointer hover:bg-stone-lighter px-1 -mx-1 rounded underline decoration-dashed decoration-transparent hover:decoration-warm-gray-light underline-offset-2 transition-colors' : '';

  return (
    <tr className={`hover:bg-stone-lighter transition-colors duration-100 ${payment.status === 'paid' ? 'opacity-60' : ''}`}>
      {showCheckbox && (
        <td className="px-2 py-1.5">
          {payment.status === 'pending' && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={onToggleSelect}
              className="rounded border-stone"
            />
          )}
        </td>
      )}
      <td className="px-4 py-1.5 text-sm text-charcoal">
        <span onClick={isClientView ? undefined : () => handleStartEdit('label')} className={clickableClass}>
          {payment.label}
        </span>
      </td>
      <td className="px-4 py-1.5 text-sm text-charcoal">
        <span onClick={isClientView ? undefined : () => handleStartEdit('amount')} className={clickableClass}>
          {formatCurrency(payment.amount)}
        </span>
      </td>
      <td className="px-4 py-1.5 text-sm text-warm-gray">
        <span onClick={isClientView ? undefined : () => handleStartEdit('due_date')} className={clickableClass}>
          {payment.due_date ? formatShortDate(payment.due_date) : '+ date'}
        </span>
      </td>
      <td className="px-4 py-1.5">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {!isClientView && (
            <button
              onClick={handleTogglePaid}
              disabled={loading}
              className={`text-xs underline ${loading ? 'text-stone cursor-not-allowed' : 'text-warm-gray hover:text-charcoal'}`}
            >
              {payment.status === 'paid' ? 'Undo' : 'Mark Paid'}
            </button>
          )}
          {!isClientView && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light"
              aria-label="Delete"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
