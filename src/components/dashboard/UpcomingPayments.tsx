'use client';

import Link from 'next/link';
import { PaymentAlert, formatCurrency, formatShortDate } from '@/lib/types';

interface UpcomingPaymentsProps {
  alerts: PaymentAlert[];
}

export default function UpcomingPayments({ alerts }: UpcomingPaymentsProps) {
  if (alerts.length === 0) return null;

  const overdue = alerts.filter((a) => a.urgency === 'overdue');
  const thisWeek = alerts.filter((a) => a.urgency === 'this_week');
  const upcoming = alerts.filter((a) => a.urgency === 'upcoming');

  const renderSection = (
    title: string,
    items: PaymentAlert[],
    bgClass: string,
    dotClass: string
  ) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          <h4 className="text-sm font-medium text-charcoal">{title}</h4>
          <span className="text-xs text-warm-gray-light">({items.length})</span>
        </div>
        <div className="space-y-1">
          {items.map((alert) => (
            <Link key={alert.payment_id} href={`/clients/${alert.client_id}`}>
              <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${bgClass} hover:opacity-80 transition-opacity cursor-pointer`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-charcoal truncate">{alert.vendor_name}</span>
                    <span className="text-warm-gray-light">-</span>
                    <span className="text-warm-gray truncate">{alert.label}</span>
                  </div>
                  <div className="text-xs text-warm-gray mt-0.5">
                    {alert.client_name} &bull; {alert.category_name}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-charcoal">{formatCurrency(alert.amount)}</p>
                  <p className="text-xs text-warm-gray">{formatShortDate(alert.due_date)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-cream border border-stone rounded-lg p-5 mb-6">
      <h3 className="text-lg font-semibold text-charcoal mb-4">Upcoming Payments</h3>
      <div className="space-y-4">
        {renderSection('Overdue', overdue, 'bg-rose-light', 'bg-rose')}
        {renderSection('Due This Week', thisWeek, 'bg-champagne-light', 'bg-champagne')}
        {renderSection('Upcoming', upcoming, 'bg-stone-lighter', 'bg-warm-gray-light')}
      </div>
    </div>
  );
}
