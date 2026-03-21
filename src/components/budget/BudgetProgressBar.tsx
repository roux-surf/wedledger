'use client';

import { BudgetStatus, formatCurrency } from '@/lib/types';

interface BudgetProgressBarProps {
  budgetStatus: BudgetStatus;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
}

const STATUS_BAR_COLORS: Record<BudgetStatus, string> = {
  green: 'bg-sage',
  yellow: 'bg-champagne',
  red: 'bg-rose',
};

export default function BudgetProgressBar({
  budgetStatus,
  totalBudget,
  totalSpent,
  remaining,
}: BudgetProgressBarProps) {
  const spentPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="mt-4">
      <div className="h-1.5 bg-stone-lighter rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${STATUS_BAR_COLORS[budgetStatus]}`}
          style={{ width: `${Math.min(spentPercent, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-warm-gray-light">
          {formatCurrency(totalSpent)} committed
        </span>
        <span className="text-xs text-warm-gray-light">
          {remaining >= 0
            ? `${formatCurrency(remaining)} remaining`
            : `${formatCurrency(Math.abs(remaining))} over budget`}
        </span>
      </div>
    </div>
  );
}
