'use client';

import { useState } from 'react';
import { Payment, formatCurrency } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PaymentRow from './PaymentRow';
import AddPaymentForm from './AddPaymentForm';
import PaymentTemplateSelector from './PaymentTemplateSelector';

interface PaymentScheduleProps {
  payments: Payment[];
  lineItemId: string;
  actualCost?: number;
  estimatedCost?: number;
  weddingDate?: string;
  legacyPaidToDate: number;
  onUpdate: () => void;
  isClientView: boolean;
}

export default function PaymentSchedule({ payments, lineItemId, actualCost, estimatedCost, weddingDate, legacyPaidToDate, onUpdate, isClientView }: PaymentScheduleProps) {
  const supabase = createClient();
  const { showSaved, showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string; label: string } | null>(null);
  const [deletingPayment, setDeletingPayment] = useState(false);

  const totalScheduled = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = totalScheduled - totalPaid;

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const hasMultiplePending = pendingPayments.length >= 2;

  const handleDeletePayment = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    setPaymentToDelete({ id: paymentId, label: payment?.label || 'this payment' });
  };

  const handleDeletePaymentConfirm = async () => {
    if (!paymentToDelete) return;
    setDeletingPayment(true);
    try {
      const deletedPayment = payments.find(p => p.id === paymentToDelete.id);
      const { error } = await supabase.from('payments').delete().eq('id', paymentToDelete.id);
      if (error) throw error;

      // If actual_cost matches totalScheduled (auto-set from payments), sync it down
      if (deletedPayment && actualCost === totalScheduled) {
        const newTotal = totalScheduled - Number(deletedPayment.amount);
        await supabase
          .from('line_items')
          .update({ actual_cost: Math.max(0, newTotal) })
          .eq('id', lineItemId);
      }

      setPaymentToDelete(null);
      onUpdate();
    } catch (err) {
      console.warn('Failed to delete payment:', err);
      showToast('Failed to delete payment', 'error');
    } finally {
      setDeletingPayment(false);
    }
  };

  const handleToggleSelect = (paymentId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(paymentId)) {
        next.delete(paymentId);
      } else {
        next.add(paymentId);
      }
      return next;
    });
  };

  const handleMarkAllPaid = async () => {
    setBulkLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updates = pendingPayments.map(p =>
        supabase.from('payments').update({ status: 'paid', paid_date: today }).eq('id', p.id)
      );
      await Promise.all(updates);
      showSaved();
      onUpdate();
    } catch (err) {
      console.warn('Failed to mark all paid:', err);
      showToast('Failed to mark payments as paid', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleMarkSelectedPaid = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updates = Array.from(selectedIds).map(id =>
        supabase.from('payments').update({ status: 'paid', paid_date: today }).eq('id', id)
      );
      await Promise.all(updates);
      setSelectedIds(new Set());
      showSaved();
      onUpdate();
    } catch (err) {
      console.warn('Failed to mark selected paid:', err);
      showToast('Failed to mark selected payments as paid', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const hasLegacyData = legacyPaidToDate > 0 && payments.length === 0;
  const templateCost = (actualCost || 0) > 0 ? actualCost! : (estimatedCost || 0);
  const showTemplateSelector = !isClientView && payments.length === 0 && templateCost > 0;

  return (
    <div className="bg-slate-50 border-t border-slate-200">
      {/* Payment template selector */}
      {showTemplateSelector && (
        <PaymentTemplateSelector
          lineItemId={lineItemId}
          actualCost={templateCost}
          weddingDate={weddingDate}
          onPaymentsCreated={onUpdate}
        />
      )}

      {/* Payment mismatch warnings */}
      {payments.length > 0 && (actualCost || 0) > 0 && totalScheduled > (actualCost || 0) && (
        <div className="px-4 py-2 border-b border-amber-200 bg-amber-50 text-xs text-amber-700">
          Scheduled payments exceed actual cost by {formatCurrency(totalScheduled - (actualCost || 0))}
        </div>
      )}
      {payments.length > 0 && (actualCost || 0) > 0 && totalScheduled < (actualCost || 0) && totalScheduled > 0 && (
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
          Scheduled payments are {formatCurrency((actualCost || 0) - totalScheduled)} less than actual cost
        </div>
      )}

      {/* Summary bar */}
      {payments.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>Scheduled: <span className="font-medium text-slate-700">{formatCurrency(totalScheduled)}</span></span>
          <span>Paid: <span className="font-medium text-green-700">{formatCurrency(totalPaid)}</span></span>
          <span>Remaining: <span className="font-medium text-slate-700">{formatCurrency(remaining)}</span></span>
          {!isClientView && hasMultiplePending && (
            <div className="ml-auto flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleMarkSelectedPaid}
                  disabled={bulkLoading}
                  className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  Mark {selectedIds.size} Paid
                </button>
              )}
              <button
                type="button"
                onClick={handleMarkAllPaid}
                disabled={bulkLoading}
                className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                Mark All Paid
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legacy notice */}
      {hasLegacyData && (
        <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
          Legacy paid amount: {formatCurrency(legacyPaidToDate)}. Add payment records below to track individual payments.
        </div>
      )}

      {/* Payment rows */}
      {payments.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  {!isClientView && hasMultiplePending && (
                    <th className="px-2 py-1.5 w-8"></th>
                  )}
                  <th className="px-4 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Payment</th>
                  <th className="px-4 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="px-4 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                  <th className="px-4 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onUpdate={onUpdate}
                    onDelete={() => handleDeletePayment(payment.id)}
                    isClientView={isClientView}
                    showCheckbox={!isClientView && hasMultiplePending}
                    isSelected={selectedIds.has(payment.id)}
                    onToggleSelect={() => handleToggleSelect(payment.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden">
            {payments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                onUpdate={onUpdate}
                onDelete={() => handleDeletePayment(payment.id)}
                isClientView={isClientView}
                renderMode="card"
                showCheckbox={!isClientView && hasMultiplePending}
                isSelected={selectedIds.has(payment.id)}
                onToggleSelect={() => handleToggleSelect(payment.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Add payment form */}
      {!isClientView && (
        <div className="px-4 py-3 border-t border-slate-200">
          <AddPaymentForm lineItemId={lineItemId} actualCost={actualCost} totalScheduled={totalScheduled} onPaymentAdded={onUpdate} />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleDeletePaymentConfirm}
        title="Delete Payment"
        message={`Are you sure you want to delete "${paymentToDelete?.label}"?`}
        confirmLabel="Delete"
        loading={deletingPayment}
      />
    </div>
  );
}
