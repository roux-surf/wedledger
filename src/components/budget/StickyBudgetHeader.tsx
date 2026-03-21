'use client';

import { formatCurrency, formatPercent } from '@/lib/types';

interface StickyBudgetHeaderProps {
  visible: boolean;
  name: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  spentLabel?: string;
  allocation?: {
    percent: number;
    label: string;
    colorClass: string;
  };
}

export default function StickyBudgetHeader({
  visible,
  name,
  totalBudget,
  totalSpent,
  remaining,
  spentLabel = 'Spent:',
  allocation,
}: StickyBudgetHeaderProps) {
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-200 print:hidden ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } bg-cream border-b border-stone shadow-sm`}
    >
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          <span className="font-semibold truncate text-charcoal">{name}</span>
          {/* Desktop sticky metrics */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-warm-gray">Budget:</span>
              <span className="font-medium text-charcoal">{formatCurrency(totalBudget)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-warm-gray">{spentLabel}</span>
              <span className="font-medium text-charcoal">{formatCurrency(totalSpent)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-warm-gray">{remaining >= 0 ? 'Remaining:' : 'Over budget:'}</span>
              <span className={`font-medium ${remaining >= 0 ? 'text-sage' : 'text-rose'}`}>
                {formatCurrency(Math.abs(remaining))}
              </span>
            </div>
            {allocation && (
              <div className="flex items-center gap-1.5">
                <span className="text-warm-gray">Allocated:</span>
                <span className="font-medium text-charcoal">{formatPercent(allocation.percent)}</span>
                <span className={`text-xs ${allocation.colorClass}`}>({allocation.label})</span>
              </div>
            )}
          </div>
          {/* Mobile sticky metrics */}
          <div className="flex md:hidden items-center gap-2 text-sm">
            <span className="font-medium text-charcoal">{formatCurrency(totalSpent)}</span>
            <span className="text-warm-gray">/</span>
            <span className="text-warm-gray">{formatCurrency(totalBudget)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
