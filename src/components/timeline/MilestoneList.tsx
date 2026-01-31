'use client';

import { MilestoneWithBudget, MilestoneStatus } from '@/lib/types';
import MilestoneRow from './MilestoneRow';

interface TimeGroup {
  label: string;
  milestones: MilestoneWithBudget[];
}

function groupByPhase(milestones: MilestoneWithBudget[]): TimeGroup[] {
  const groups: TimeGroup[] = [
    { label: '12+ months before', milestones: [] },
    { label: '6 – 12 months before', milestones: [] },
    { label: '3 – 6 months before', milestones: [] },
    { label: '1 – 3 months before', milestones: [] },
    { label: 'Less than 1 month', milestones: [] },
  ];

  for (const m of milestones) {
    if (m.months_before >= 12) groups[0].milestones.push(m);
    else if (m.months_before >= 6) groups[1].milestones.push(m);
    else if (m.months_before >= 3) groups[2].milestones.push(m);
    else if (m.months_before >= 1) groups[3].milestones.push(m);
    else groups[4].milestones.push(m);
  }

  return groups.filter((g) => g.milestones.length > 0);
}

interface MilestoneListProps {
  milestones: MilestoneWithBudget[];
  isClientView: boolean;
  onStatusChange: (id: string, status: MilestoneStatus) => void;
  onEdit: (milestone: MilestoneWithBudget) => void;
  onDelete: (id: string) => void;
}

export default function MilestoneList({
  milestones,
  isClientView,
  onStatusChange,
  onEdit,
  onDelete,
}: MilestoneListProps) {
  const groups = groupByPhase(milestones);

  if (milestones.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No milestones yet. Add milestones to start tracking your timeline.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            {group.label}
          </h4>
          <div className="space-y-2">
            {group.milestones.map((m) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                isClientView={isClientView}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
