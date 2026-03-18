'use client';

import Link from 'next/link';
import { MarketplaceClient, MilestoneAlert, formatCurrency, formatDate, formatShortDate } from '@/lib/types';

interface MarketplaceClientListProps {
  clients: MarketplaceClient[];
  milestonesByClient: Record<string, MilestoneAlert[]>;
}

export default function MarketplaceClientList({ clients, milestonesByClient }: MarketplaceClientListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <MarketplaceClientCard key={client.id} client={client} milestones={milestonesByClient[client.id] || []} />
      ))}
    </div>
  );
}

const urgencyDotColors = {
  overdue: 'bg-red-500',
  this_week: 'bg-amber-500',
  upcoming: 'bg-slate-400',
};

function MarketplaceClientCard({ client, milestones }: { client: MarketplaceClient; milestones: MilestoneAlert[] }) {
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

  const engagementLabel = client.engagement_type === 'consultation' ? 'Consultation' : 'Subscription';

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

        {/* Marketplace badge and couple name */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Marketplace
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {engagementLabel}
          </span>
          <span className="text-xs text-slate-500">{client.couple_name}</span>
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
          {milestones.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              {milestones.map((m) => (
                <div key={m.milestone_id} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyDotColors[m.urgency]}`} />
                  <span className="truncate text-slate-700">{m.title}</span>
                  <span className="ml-auto text-xs text-slate-400 shrink-0">{formatShortDate(m.target_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
