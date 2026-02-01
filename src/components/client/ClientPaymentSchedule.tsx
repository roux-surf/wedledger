'use client';

import { ScheduledPayment } from '@/lib/clientDataTransformers';
import { formatCurrency, formatShortDate } from '@/lib/types';

interface ClientPaymentScheduleProps {
  payments: ScheduledPayment[];
}

const urgencyConfig = {
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
  this_week: { label: 'Due Soon', className: 'bg-amber-100 text-amber-700' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
  no_date: { label: 'No Date', className: 'bg-slate-100 text-slate-500' },
};

export default function ClientPaymentSchedule({ payments }: ClientPaymentScheduleProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
        Upcoming Payments
      </h4>

      {payments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">All payments are up to date.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="text-left pb-2 font-medium">Vendor</th>
                  <th className="text-left pb-2 font-medium">Payment</th>
                  <th className="text-left pb-2 font-medium">Category</th>
                  <th className="text-right pb-2 font-medium">Amount</th>
                  <th className="text-left pb-2 font-medium pl-4">Due Date</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const config = urgencyConfig[p.urgency];
                  return (
                    <tr key={p.paymentId} className="text-slate-600">
                      <td className="py-2.5 font-medium text-slate-900">{p.vendorName}</td>
                      <td className="py-2.5">{p.label}</td>
                      <td className="py-2.5 text-slate-500">{p.categoryName}</td>
                      <td className="py-2.5 text-right font-medium text-slate-900">{formatCurrency(p.amount)}</td>
                      <td className="py-2.5 pl-4">
                        {p.dueDate ? formatShortDate(p.dueDate) : '—'}
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {payments.map((p) => {
              const config = urgencyConfig[p.urgency];
              return (
                <div key={p.paymentId} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-slate-900 font-medium text-sm truncate">{p.vendorName}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {p.label} &bull; {p.categoryName}
                      </p>
                    </div>
                    <p className="text-slate-900 font-medium text-sm whitespace-nowrap">{formatCurrency(p.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-500 text-xs">
                      {p.dueDate ? formatShortDate(p.dueDate) : 'No due date'}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
