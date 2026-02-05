'use client';

import { useState, useRef } from 'react';
import { Payment, formatCurrency, formatShortDate, getPaymentUrgency, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface PaymentRowProps {
  payment: Payment;
  onUpdate: () => void;
  onDelete: () => void;
  isClientView: boolean;
  renderMode?: 'table' | 'card';
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function PaymentRow({ payment, onUpdate, onDelete, isClientView, renderMode = 'table', showCheckbox, isSelected, onToggleSelect }: PaymentRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    label: payment.label,
    amount: sanitizeNumericString(payment.amount),
    due_date: payment.due_date || '',
  });
  const [, setLoading] = useState(false);
  const supabase = useSupabaseClient();
  const { showSaved, showToast } = useToast();
  const labelRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const getStatusBadge = () => {
    if (payment.status === 'paid') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Paid</span>;
    }
    if (payment.due_date) {
      const urgency = getPaymentUrgency(payment.due_date);
      if (urgency === 'overdue') {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
      }
      if (urgency === 'this_week') {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Due Soon</span>;
      }
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Pending</span>;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          label: formData.label,
          amount: parseNumericInput(formData.amount),
          due_date: formData.due_date || null,
        })
        .eq('id', payment.id);

      if (error) throw error;
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
    if (isClientView) return;
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
    }
  };

  const handleStartEdit = () => {
    if (isClientView) return;
    setFormData({
      label: payment.label,
      amount: sanitizeNumericString(payment.amount),
      due_date: payment.due_date || '',
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
    const focusedElement = e.relatedTarget as HTMLElement;
    const editableInputs = [labelRef.current, amountRef.current, dueDateRef.current];
    if (editableInputs.includes(focusedElement as HTMLInputElement)) {
      return;
    }
    handleSave();
  };

  // Card mode (mobile)
  if (renderMode === 'card') {
    if (isEditing && !isClientView) {
      return (
        <div className="p-3 bg-slate-50 border-b border-slate-100">
          <div className="space-y-2">
            <input
              ref={labelRef}
              type="text"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onFocus={(e) => e.target.select()}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
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
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                placeholder="Amount"
              />
              <input
                ref={dueDateRef}
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
              />
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
              aria-label="Delete"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="p-3 border-b border-slate-100 flex items-center justify-between gap-2"
        onClick={isClientView ? undefined : handleStartEdit}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${!isClientView ? 'cursor-pointer' : ''} ${payment.status === 'paid' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
              {payment.label}
            </span>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span>{formatCurrency(payment.amount)}</span>
            {payment.due_date && <span>Due {formatShortDate(payment.due_date)}</span>}
            {payment.paid_date && <span>Paid {formatShortDate(payment.paid_date)}</span>}
          </div>
        </div>
        {!isClientView && (
          <button
            onClick={(e) => { e.stopPropagation(); handleTogglePaid(); }}
            className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              payment.status === 'paid'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-slate-300 hover:border-slate-400'
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
      <tr className="bg-slate-50">
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
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
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
            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
          />
        </td>
        <td className="px-4 py-1.5">
          <input
            ref={dueDateRef}
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="px-2 py-1 border border-slate-300 rounded text-sm"
          />
        </td>
        <td className="px-4 py-1.5">
          <div className="flex items-center justify-between">
            {getStatusBadge()}
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
              aria-label="Delete"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  const clickableClass = !isClientView ? 'cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded' : '';

  return (
    <tr className={payment.status === 'paid' ? 'opacity-60' : ''}>
      {showCheckbox && (
        <td className="px-2 py-1.5">
          {payment.status === 'pending' && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={onToggleSelect}
              className="rounded border-slate-300"
            />
          )}
        </td>
      )}
      <td className="px-4 py-1.5 text-sm text-slate-900">
        <span onClick={isClientView ? undefined : handleStartEdit} className={clickableClass}>
          {payment.label}
        </span>
      </td>
      <td className="px-4 py-1.5 text-sm text-slate-900">
        <span onClick={isClientView ? undefined : handleStartEdit} className={clickableClass}>
          {formatCurrency(payment.amount)}
        </span>
      </td>
      <td className="px-4 py-1.5 text-sm text-slate-500">
        {payment.due_date ? formatShortDate(payment.due_date) : '-'}
      </td>
      <td className="px-4 py-1.5">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {!isClientView && (
            <button
              onClick={handleTogglePaid}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              {payment.status === 'paid' ? 'Undo' : 'Mark Paid'}
            </button>
          )}
          {!isClientView && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
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
