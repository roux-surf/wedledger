'use client';

import { Payment, formatCurrency } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import PaymentRow from './PaymentRow';
import AddPaymentForm from './AddPaymentForm';

interface PaymentScheduleProps {
  payments: Payment[];
  lineItemId: string;
  legacyPaidToDate: number;
  onUpdate: () => void;
  isClientView: boolean;
}

export default function PaymentSchedule({ payments, lineItemId, legacyPaidToDate, onUpdate, isClientView }: PaymentScheduleProps) {
  const supabase = createClient();

  const totalScheduled = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = totalScheduled - totalPaid;

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment?')) return;
    try {
      const { error } = await supabase.from('payments').delete().eq('id', paymentId);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Failed to delete payment:', err);
    }
  };

  const hasLegacyData = legacyPaidToDate > 0 && payments.length === 0;

  return (
    <div className="bg-slate-50 border-t border-slate-200">
      {/* Summary bar */}
      {payments.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>Scheduled: <span className="font-medium text-slate-700">{formatCurrency(totalScheduled)}</span></span>
          <span>Paid: <span className="font-medium text-green-700">{formatCurrency(totalPaid)}</span></span>
          <span>Remaining: <span className="font-medium text-slate-700">{formatCurrency(remaining)}</span></span>
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
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Payment</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  {!isClientView && (
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  )}
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
              />
            ))}
          </div>
        </>
      )}

      {/* Add payment form */}
      {!isClientView && (
        <div className="px-4 py-3 border-t border-slate-200">
          <AddPaymentForm lineItemId={lineItemId} onPaymentAdded={onUpdate} />
        </div>
      )}
    </div>
  );
}
