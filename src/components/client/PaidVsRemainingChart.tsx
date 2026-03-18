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
    <div className="bg-cream border border-stone rounded-lg p-5">
      <h4 className="text-sm font-medium text-warm-gray uppercase tracking-wider mb-4">
        Financial Position
      </h4>

      {/* Progress bar */}
      <div className="w-full h-4 bg-stone-lighter rounded-full overflow-hidden flex">
        {paidPct > 0 && (
          <div
            className="bg-sage h-full transition-all duration-500"
            style={{ width: `${paidPct * scale}%` }}
          />
        )}
        {pendingPct > 0 && (
          <div
            className="bg-champagne h-full transition-all duration-500"
            style={{ width: `${pendingPct * scale}%` }}
          />
        )}
        {uncommittedPct > 0 && (
          <div
            className="bg-stone h-full transition-all duration-500"
            style={{ width: `${uncommittedPct * scale}%` }}
          />
        )}
        {overCommittedPct > 0 && (
          <div
            className="bg-rose h-full transition-all duration-500"
            style={{ width: `${overCommittedPct * scale}%` }}
          />
        )}
        {overPaidPct > 0 && (
          <div
            className="bg-champagne h-full transition-all duration-500"
            style={{ width: `${overPaidPct * scale}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-warm-gray">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sage inline-block" />
          Paid
        </div>
        {!isOverPaid && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-champagne inline-block" />
            Pending
          </div>
        )}
        {!isOverCommitted && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-stone inline-block" />
            Uncommitted
          </div>
        )}
        {isOverCommitted && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose inline-block" />
            Over-committed
          </div>
        )}
        {isOverPaid && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-champagne inline-block" />
            Over-paid
          </div>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="bg-stone-lighter rounded-lg p-3 text-center">
          <p className="text-sage text-lg md:text-xl font-bold">{formatCurrency(totalPaid)}</p>
          <p className="text-warm-gray text-xs mt-1">
            Paid ({totalBudget > 0 ? Math.round(paidPct) : 0}%)
          </p>
        </div>
        {isOverPaid ? (
          <div className="bg-champagne-light rounded-lg p-3 text-center">
            <p className="text-champagne text-lg md:text-xl font-bold">{formatCurrency(overPaid)}</p>
            <p className="text-warm-gray text-xs mt-1">Over-paid</p>
          </div>
        ) : (
          <div className="bg-stone-lighter rounded-lg p-3 text-center">
            <p className="text-sage text-lg md:text-xl font-bold">{formatCurrency(displayPending)}</p>
            <p className="text-warm-gray text-xs mt-1">
              Pending ({totalBudget > 0 ? Math.round(pendingPct) : 0}%)
            </p>
          </div>
        )}
        {isOverCommitted ? (
          <div className="bg-rose-light rounded-lg p-3 text-center">
            <p className="text-rose text-lg md:text-xl font-bold">{formatCurrency(overBudget)}</p>
            <p className="text-warm-gray text-xs mt-1">Over-committed</p>
          </div>
        ) : (
          <div className="bg-stone-lighter rounded-lg p-3 text-center">
            <p className="text-charcoal text-lg md:text-xl font-bold">{formatCurrency(displayUncommitted)}</p>
            <p className="text-warm-gray text-xs mt-1">
              Uncommitted ({totalBudget > 0 ? Math.round(uncommittedPct) : 0}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
