'use client';

import { MilestoneStatus } from '@/lib/types';

const STATUS_STYLES: Record<MilestoneStatus, { bg: string; label: string }> = {
  not_started: { bg: 'bg-slate-100 text-slate-600', label: 'Not Started' },
  in_progress: { bg: 'bg-blue-100 text-blue-700', label: 'In Progress' },
  completed: { bg: 'bg-green-100 text-green-700', label: 'Completed' },
};

interface MilestoneStatusBadgeProps {
  status: MilestoneStatus;
}

export default function MilestoneStatusBadge({ status }: MilestoneStatusBadgeProps) {
  const { bg, label } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${bg}`}>
      {label}
    </span>
  );
}
