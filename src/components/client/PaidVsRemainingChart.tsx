'use client';

import { PaidVsRemainingData } from '@/lib/clientDataTransformers';
import { formatCurrency } from '@/lib/types';

interface PaidVsRemainingChartProps {
  data: PaidVsRemainingData;
}

export default function PaidVsRemainingChart({ data }: PaidVsRemainingChartProps) {
  const { totalBudget, totalPaid, totalPending, uncommitted } = data;

  // Calculate percentages for progress bar segments
  const paidPct = totalBudget > 0 ? (totalPaid / totalBudget) * 100 : 0;
  const pendingPct = totalBudget > 0 ? (totalPending / totalBudget) * 100 : 0;
  const uncommittedPct = totalBudget > 0 ? (uncommitted / totalBudget) * 100 : 0;

  // Handle over-budget: cap at 100% visually
  const total = paidPct + pendingPct + uncommittedPct;
  const scale = total > 100 ? 100 / total : 1;

  return (
    <div className="bg-slate-800 rounded-lg p-5">
      <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
        Financial Position
      </h4>

      {/* Progress bar */}
      <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden flex">
        {paidPct > 0 && (
          <div
            className="bg-emerald-400 h-full transition-all duration-500"
            style={{ width: `${paidPct * scale}%` }}
          />
        )}
        {pendingPct > 0 && (
          <div
            className="bg-blue-400 h-full transition-all duration-500"
            style={{ width: `${pendingPct * scale}%` }}
          />
        )}
        {uncommittedPct > 0 && (
          <div
            className="bg-slate-600 h-full transition-all duration-500"
            style={{ width: `${uncommittedPct * scale}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          Paid
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
          Pending
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
          Uncommitted
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-emerald-400 text-lg md:text-xl font-bold">{formatCurrency(totalPaid)}</p>
          <p className="text-slate-400 text-xs mt-1">
            Paid ({totalBudget > 0 ? Math.round(paidPct) : 0}%)
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-blue-400 text-lg md:text-xl font-bold">{formatCurrency(totalPending)}</p>
          <p className="text-slate-400 text-xs mt-1">
            Pending ({totalBudget > 0 ? Math.round(pendingPct) : 0}%)
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-slate-300 text-lg md:text-xl font-bold">{formatCurrency(uncommitted)}</p>
          <p className="text-slate-400 text-xs mt-1">
            Uncommitted ({totalBudget > 0 ? Math.round(uncommittedPct) : 0}%)
          </p>
        </div>
      </div>
    </div>
  );
}
