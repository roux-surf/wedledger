'use client';

import Link from 'next/link';
import { MilestoneAlert, formatShortDate } from '@/lib/types';

interface UpcomingMilestonesProps {
  alerts: MilestoneAlert[];
}

export default function UpcomingMilestones({ alerts }: UpcomingMilestonesProps) {
  if (alerts.length === 0) return null;

  const overdue = alerts.filter((a) => a.urgency === 'overdue');
  const thisWeek = alerts.filter((a) => a.urgency === 'this_week');
  const upcoming = alerts.filter((a) => a.urgency === 'upcoming');

  const renderSection = (
    title: string,
    items: MilestoneAlert[],
    bgClass: string,
    dotClass: string
  ) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          <h4 className="text-sm font-medium text-slate-700">{title}</h4>
          <span className="text-xs text-slate-400">({items.length})</span>
        </div>
        <div className="space-y-1">
          {items.map((alert) => (
            <Link key={alert.milestone_id} href={`/clients/${alert.client_id}`}>
              <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${bgClass} hover:opacity-80 transition-opacity cursor-pointer`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{alert.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{alert.client_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">{formatShortDate(alert.target_date)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Milestones</h3>
      <div className="space-y-4">
        {renderSection('Overdue', overdue, 'bg-red-50', 'bg-red-500')}
        {renderSection('Due This Week', thisWeek, 'bg-amber-50', 'bg-amber-500')}
        {renderSection('Upcoming', upcoming, 'bg-slate-50', 'bg-slate-400')}
      </div>
    </div>
  );
}
