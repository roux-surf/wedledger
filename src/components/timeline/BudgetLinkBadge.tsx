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
      <span className="text-warm-gray font-medium">{categoryName}</span>
      {categoryTarget > 0 && (
        <>
          {isClientView ? (
            <span className={isOver ? 'text-rose-dark' : 'text-warm-gray'}>
              {formatPercent(Math.min(pct, 999))} committed
            </span>
          ) : (
            <span className={isOver ? 'text-rose-dark' : 'text-warm-gray'}>
              {formatCurrency(categorySpent)} of {formatCurrency(categoryTarget)}
            </span>
          )}
          <div className="w-16 h-1.5 bg-stone rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOver ? 'bg-rose' : 'bg-sage'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
