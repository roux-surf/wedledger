'use client';

import { PaidVsRemainingData } from '@/lib/clientDataTransformers';
import { formatCurrency } from '@/lib/types';

interface PaidVsRemainingChartProps {
  data: PaidVsRemainingData;
}

export default function PaidVsRemainingChart({ data }: PaidVsRemainingChartProps) {
  const { totalBudget, totalPaid, totalPending, uncommitted, overBudget, overPaid } = data;

  const isOverCommitted = uncommitted < 0;
  const isOverPaid = totalPending < 0;

  // Visual amounts for the bar segments
  const displayPaid = totalPaid;
  const displayPending = isOverPaid ? 0 : totalPending;
  const displayUncommitted = isOverCommitted ? 0 : uncommitted;
  const displayOverCommitted = isOverCommitted ? overBudget : 0;
  const displayOverPaid = isOverPaid ? overPaid : 0;

  // Calculate percentages based on the largest reference point
  const reference = Math.max(totalBudget, totalPaid + Math.max(0, totalPending));

  const paidPct = reference > 0 ? (displayPaid / reference) * 100 : 0;
  const pendingPct = reference > 0 ? (displayPending / reference) * 100 : 0;
  const uncommittedPct = reference > 0 ? (displayUncommitted / reference) * 100 : 0;
  const overCommittedPct = reference > 0 ? (displayOverCommitted / reference) * 100 : 0;
  const overPaidPct = reference > 0 ? (displayOverPaid / reference) * 100 : 0;

  // Handle over-budget: cap at 100% visually
  const total = paidPct + pendingPct + uncommittedPct + overCommittedPct + overPaidPct;
  const scale = total > 100 ? 100 / total : 1;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
        Financial Position
      </h4>

      {/* Progress bar */}
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
        {paidPct > 0 && (
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
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
            className="bg-slate-200 h-full transition-all duration-500"
            style={{ width: `${uncommittedPct * scale}%` }}
          />
        )}
        {overCommittedPct > 0 && (
          <div
            className="bg-red-400 h-full transition-all duration-500"
            style={{ width: `${overCommittedPct * scale}%` }}
          />
        )}
        {overPaidPct > 0 && (
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${overPaidPct * scale}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Paid
        </div>
        {!isOverPaid && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
            Pending
          </div>
        )}
        {!isOverCommitted && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />
            Uncommitted
          </div>
        )}
        {isOverCommitted && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            Over-committed
          </div>
        )}
        {isOverPaid && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Over-paid
          </div>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-emerald-600 text-lg md:text-xl font-bold">{formatCurrency(totalPaid)}</p>
          <p className="text-slate-500 text-xs mt-1">
            Paid ({totalBudget > 0 ? Math.round(paidPct) : 0}%)
          </p>
        </div>
        {isOverPaid ? (
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-amber-600 text-lg md:text-xl font-bold">{formatCurrency(overPaid)}</p>
            <p className="text-slate-500 text-xs mt-1">Over-paid</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-blue-600 text-lg md:text-xl font-bold">{formatCurrency(displayPending)}</p>
            <p className="text-slate-500 text-xs mt-1">
              Pending ({totalBudget > 0 ? Math.round(pendingPct) : 0}%)
            </p>
          </div>
        )}
        {isOverCommitted ? (
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-red-600 text-lg md:text-xl font-bold">{formatCurrency(overBudget)}</p>
            <p className="text-slate-500 text-xs mt-1">Over-committed</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-slate-700 text-lg md:text-xl font-bold">{formatCurrency(displayUncommitted)}</p>
            <p className="text-slate-500 text-xs mt-1">
              Uncommitted ({totalBudget > 0 ? Math.round(uncommittedPct) : 0}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
