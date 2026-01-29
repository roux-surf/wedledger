'use client';

import Link from 'next/link';
import { ClientWithBudgetStatus, formatCurrency, formatDate } from '@/lib/types';

interface ClientCardProps {
  client: ClientWithBudgetStatus;
}

export default function ClientCard({ client }: ClientCardProps) {
  const statusColors = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusIndicatorColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  const statusLabels = {
    green: 'Under Budget',
    yellow: 'Near Budget',
    red: 'Over Budget',
  };

  return (
    <Link href={`/clients/${client.id}`}>
      <div className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{client.name}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {client.city}, {client.state}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${statusIndicatorColors[client.budget_status]}`}
            />
            <span
              className={`text-xs font-medium px-2 py-1 rounded border ${statusColors[client.budget_status]}`}
            >
              {statusLabels[client.budget_status]}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Wedding Date</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {formatDate(client.wedding_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Budget</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {formatCurrency(client.total_budget)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Spent</p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {formatCurrency(client.total_spent)} of {formatCurrency(client.total_budget)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
