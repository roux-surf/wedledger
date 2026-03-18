'use client';

import { MilestoneStatus } from '@/lib/types';

const STATUS_STYLES: Record<MilestoneStatus, { bg: string; label: string }> = {
  not_started: { bg: 'bg-stone-lighter text-warm-gray', label: 'Not Started' },
  in_progress: { bg: 'bg-champagne-light text-champagne-dark', label: 'In Progress' },
  completed: { bg: 'bg-sage-light text-sage-dark', label: 'Completed' },
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
