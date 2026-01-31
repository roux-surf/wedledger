'use client';

import Link from 'next/link';
import { ClientWithBudgetStatus, formatCurrency, formatDate } from '@/lib/types';

interface ClientCardProps {
  client: ClientWithBudgetStatus;
  onDelete?: (clientId: string, clientName: string) => void;
}

export default function ClientCard({ client, onDelete }: ClientCardProps) {
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
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDelete(client.id, client.name);
                }}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete wedding"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
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
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Spent</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {formatCurrency(client.total_spent)} of {formatCurrency(client.total_budget)}
              </p>
            </div>
            {client.milestones_total > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Timeline</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-medium text-slate-900">
                    {client.milestones_completed}/{client.milestones_total}
                  </p>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(client.milestones_completed / client.milestones_total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
