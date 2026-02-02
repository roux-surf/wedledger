'use client';

import { useEffect, useRef, useState } from 'react';
import { MilestoneWithBudget, MilestoneStatus, formatShortDate } from '@/lib/types';
import { getGanttPosition, getMonthsBetween, formatRelativeMonths } from '@/lib/milestoneTemplates';
import MilestoneStatusBadge from './MilestoneStatusBadge';
import BudgetLinkBadge from './BudgetLinkBadge';

interface GanttTimelineProps {
  milestones: MilestoneWithBudget[];
  weddingDate: string;
  isClientView: boolean;
  onStatusChange: (id: string, status: MilestoneStatus) => void;
  onEdit: (milestone: MilestoneWithBudget) => void;
}

function getTimelineBounds(milestones: MilestoneWithBudget[], weddingDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Start: earliest of today or earliest milestone, minus 1 month padding
  let earliest = todayStr;
  for (const m of milestones) {
    if (m.target_date < earliest) earliest = m.target_date;
  }
  const startDate = new Date(earliest + 'T00:00:00');
  startDate.setMonth(startDate.getMonth() - 1);
  const start = startDate.toISOString().split('T')[0];

  // End: wedding date + 1 month padding
  const endDate = new Date(weddingDate + 'T00:00:00');
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().split('T')[0];

  return { start, end, todayStr };
}

function getMonthMarkers(start: string, end: string): { date: string; label: string }[] {
  const markers: { date: string; label: string }[] = [];
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  // Start at the first day of the month after start
  const current = new Date(startDate);
  current.setDate(1);
  if (current <= startDate) current.setMonth(current.getMonth() + 1);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    markers.push({ date: dateStr, label });
    current.setMonth(current.getMonth() + 1);
  }

  return markers;
}

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  not_started: 'bg-slate-300',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
};

export default function GanttTimeline({
  milestones,
  weddingDate,
  isClientView,
  onStatusChange,
  onEdit,
}: GanttTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ milestone: MilestoneWithBudget; x: number; y: number } | null>(null);

  const { start, end, todayStr } = getTimelineBounds(milestones, weddingDate);
  const monthMarkers = getMonthMarkers(start, end);
  const totalMonths = Math.max(getMonthsBetween(start, end), 1);
  const todayPct = getGanttPosition(todayStr, start, end);
  const weddingPct = getGanttPosition(weddingDate, start, end);

  // Auto-scroll to center on today
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollTarget = (todayPct / 100) * container.scrollWidth - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [todayPct]);

  if (milestones.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No milestones yet. Add milestones to start tracking your timeline.
      </p>
    );
  }

  // Min width: 80px per month
  const minWidth = Math.max(totalMonths * 80, 600);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="overflow-x-auto border border-slate-200 rounded-lg bg-white"
      >
        <div style={{ minWidth: `${minWidth}px` }} className="relative">
          {/* Month header row */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
            <div className="w-40 shrink-0 px-3 py-1 text-xs font-semibold text-slate-500 border-r border-slate-200">
              Milestone
            </div>
            <div className="flex-1 relative h-6">
              {monthMarkers.map((marker) => {
                const pct = getGanttPosition(marker.date, start, end);
                return (
                  <div
                    key={marker.date}
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: `${pct}%` }}
                  >
                    <span className="text-[10px] text-slate-400 whitespace-nowrap -translate-x-1/2">
                      {marker.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Milestone rows */}
          {milestones.map((m) => {
            const pct = getGanttPosition(m.target_date, start, end);
            const isPastDue = m.target_date < todayStr && m.status !== 'completed';

            return (
              <div
                key={m.id}
                className="flex border-b border-slate-100 hover:bg-slate-50/50 group"
              >
                {/* Label column */}
                <div className="w-40 shrink-0 px-3 py-1 border-r border-slate-100 flex items-center min-w-0">
                  <span className={`text-xs font-medium truncate ${
                    m.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}>
                    {m.title}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-1">·&nbsp;{formatShortDate(m.target_date)}</span>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative py-1 px-1">
                  {/* Month grid lines */}
                  {monthMarkers.map((marker) => {
                    const markerPct = getGanttPosition(marker.date, start, end);
                    return (
                      <div
                        key={marker.date}
                        className="absolute top-0 bottom-0 border-l border-slate-100"
                        style={{ left: `${markerPct}%` }}
                      />
                    );
                  })}

                  {/* Milestone marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ left: `${pct}%` }}
                    onClick={() => !isClientView && onEdit(m)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ milestone: m, x: rect.left, y: rect.bottom + 8 });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div className={`w-3 h-3 rounded-full -translate-x-1/2 ring-2 ring-white ${
                      isPastDue ? 'bg-red-500' : STATUS_COLORS[m.status]
                    }`} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Today marker overlay — spans the full height of the bar area */}
          <div
            className="absolute top-6 bottom-0 w-px border-l-2 border-dashed border-red-400 z-20 pointer-events-none"
            style={{ left: `calc(160px + (100% - 160px) * ${todayPct / 100})` }}
          >
            <span className="absolute -top-4 left-1 text-[9px] font-bold text-red-500 whitespace-nowrap">
              Today
            </span>
          </div>

          {/* Wedding date marker */}
          <div
            className="absolute top-6 bottom-0 w-0.5 bg-slate-900 z-20 pointer-events-none"
            style={{ left: `calc(160px + (100% - 160px) * ${weddingPct / 100})` }}
          >
            <span className="absolute -top-4 left-1 text-[9px] font-bold text-slate-900 whitespace-nowrap">
              Wedding
            </span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-sm font-medium text-slate-900">{tooltip.milestone.title}</p>
          {tooltip.milestone.description && (
            <p className="text-xs text-slate-500 mt-1">{tooltip.milestone.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <MilestoneStatusBadge status={tooltip.milestone.status} />
            <span className="text-xs text-slate-400">
              {formatShortDate(tooltip.milestone.target_date)}
            </span>
          </div>
          {tooltip.milestone.category_name && tooltip.milestone.category_target !== undefined && tooltip.milestone.category_spent !== undefined && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <BudgetLinkBadge
                categoryName={tooltip.milestone.category_name}
                categoryTarget={tooltip.milestone.category_target}
                categorySpent={tooltip.milestone.category_spent}
                isClientView={isClientView}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
