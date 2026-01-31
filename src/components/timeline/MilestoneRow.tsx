'use client';

import { MilestoneWithBudget, MilestoneStatus, formatShortDate } from '@/lib/types';
import { formatRelativeMonths } from '@/lib/milestoneTemplates';
import MilestoneStatusBadge from './MilestoneStatusBadge';
import BudgetLinkBadge from './BudgetLinkBadge';

interface MilestoneRowProps {
  milestone: MilestoneWithBudget;
  isClientView: boolean;
  onStatusChange: (id: string, status: MilestoneStatus) => void;
  onEdit: (milestone: MilestoneWithBudget) => void;
  onDelete: (id: string) => void;
}

export default function MilestoneRow({
  milestone,
  isClientView,
  onStatusChange,
  onEdit,
  onDelete,
}: MilestoneRowProps) {
  const isPastDue = new Date(milestone.target_date + 'T00:00:00') < new Date() && milestone.status !== 'completed';

  return (
    <div className={`flex items-start gap-3 py-3 px-4 rounded-lg border transition-colors ${
      milestone.status === 'completed'
        ? 'bg-green-50/50 border-green-200'
        : isPastDue
          ? 'bg-red-50/50 border-red-200'
          : 'bg-white border-slate-200'
    }`}>
      {/* Checkbox / status indicator */}
      <div className="pt-0.5 shrink-0">
        {isClientView ? (
          <button
            onClick={() => {
              if (milestone.status !== 'completed') {
                onStatusChange(milestone.id, 'completed');
              }
            }}
            disabled={milestone.status === 'completed'}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              milestone.status === 'completed'
                ? 'bg-green-500 border-green-500 text-white cursor-default'
                : 'border-slate-300 hover:border-slate-400 cursor-pointer'
            }`}
          >
            {milestone.status === 'completed' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : (
          <select
            value={milestone.status}
            onChange={(e) => onStatusChange(milestone.id, e.target.value as MilestoneStatus)}
            className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${
            milestone.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
          }`}>
            {milestone.title}
          </span>
          {!isClientView && <MilestoneStatusBadge status={milestone.status} />}
          {isPastDue && (
            <span className="text-xs font-medium text-red-600">Past due</span>
          )}
        </div>
        {milestone.description && (
          <p className="text-xs text-slate-500 mt-0.5">{milestone.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-slate-400">
            {formatShortDate(milestone.target_date)}
            {!isClientView && ` (${formatRelativeMonths(milestone.months_before)})`}
          </span>
          {milestone.category_name && milestone.category_target !== undefined && milestone.category_spent !== undefined && (
            <BudgetLinkBadge
              categoryName={milestone.category_name}
              categoryTarget={milestone.category_target}
              categorySpent={milestone.category_spent}
              isClientView={isClientView}
            />
          )}
        </div>
      </div>

      {/* Actions — coordinator only */}
      {!isClientView && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(milestone)}
            className="text-slate-400 hover:text-slate-600 p-1"
            title="Edit milestone"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(milestone.id)}
            className="text-slate-400 hover:text-red-600 p-1"
            title="Delete milestone"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
