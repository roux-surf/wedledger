'use client';

import Link from 'next/link';
import { ClientWithBudgetStatus, MilestoneAlert, formatCurrency, formatDate, formatShortDate } from '@/lib/types';

interface ClientCardProps {
  client: ClientWithBudgetStatus;
  onDelete?: (clientId: string, clientName: string) => void;
  milestones?: MilestoneAlert[];
}

const urgencyDotColors = {
  overdue: 'bg-rose',
  this_week: 'bg-champagne',
  upcoming: 'bg-warm-gray-light',
};

export default function ClientCard({ client, onDelete, milestones = [] }: ClientCardProps) {
  const statusColors = {
    green: 'bg-sage-light text-sage-dark border-sage',
    yellow: 'bg-champagne-light text-champagne-dark border-champagne',
    red: 'bg-rose-light text-rose-dark border-rose',
  };

  const statusIndicatorColors = {
    green: 'bg-sage',
    yellow: 'bg-champagne',
    red: 'bg-rose',
  };

  const statusLabels = {
    green: 'Under Budget',
    yellow: 'Near Budget',
    red: 'Over Budget',
  };

  return (
    <Link href={`/clients/${client.id}`}>
      <div className="bg-cream border border-stone rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-heading font-semibold tracking-tight text-charcoal truncate">{client.name}</h3>
            <p className="text-sm text-warm-gray mt-1">
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
                className="p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light transition-colors"
                title="Delete wedding"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-stone-lighter">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-warm-gray uppercase tracking-wider">Wedding Date</p>
              <p className="text-sm font-medium text-charcoal mt-1">
                {formatDate(client.wedding_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-warm-gray uppercase tracking-wider">Total Budget</p>
              <p className="text-sm font-medium text-charcoal mt-1">
                {formatCurrency(client.total_budget)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs text-warm-gray uppercase tracking-wider">Spent</p>
              <p className="text-sm font-medium text-charcoal mt-1">
                {formatCurrency(client.total_spent)} of {formatCurrency(client.total_budget)}
              </p>
            </div>
            {client.milestones_total > 0 && (
              <div>
                <p className="text-xs text-warm-gray uppercase tracking-wider">Timeline</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-medium text-charcoal">
                    {client.milestones_completed}/{client.milestones_total}
                  </p>
                  <div className="flex-1 h-1.5 bg-stone rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage rounded-full"
                      style={{ width: `${(client.milestones_completed / client.milestones_total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          {milestones.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-lighter space-y-1.5">
              {milestones.map((m) => (
                <div key={m.milestone_id} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyDotColors[m.urgency]}`} />
                  <span className="truncate text-charcoal">{m.title}</span>
                  <span className="ml-auto text-xs text-warm-gray-light shrink-0">{formatShortDate(m.target_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
