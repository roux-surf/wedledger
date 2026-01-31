'use client';

import { formatCurrency, formatPercent } from '@/lib/types';

interface BudgetLinkBadgeProps {
  categoryName: string;
  categoryTarget: number;
  categorySpent: number;
  isClientView?: boolean;
}

export default function BudgetLinkBadge({
  categoryName,
  categoryTarget,
  categorySpent,
  isClientView = false,
}: BudgetLinkBadgeProps) {
  const pct = categoryTarget > 0 ? (categorySpent / categoryTarget) * 100 : 0;
  const isOver = categorySpent > categoryTarget && categoryTarget > 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 font-medium">{categoryName}</span>
      {categoryTarget > 0 && (
        <>
          {isClientView ? (
            <span className={isOver ? 'text-red-600' : 'text-slate-500'}>
              {formatPercent(Math.min(pct, 999))} committed
            </span>
          ) : (
            <span className={isOver ? 'text-red-600' : 'text-slate-500'}>
              {formatCurrency(categorySpent)} of {formatCurrency(categoryTarget)}
            </span>
          )}
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
