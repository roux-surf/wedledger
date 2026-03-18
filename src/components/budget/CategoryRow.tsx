'use client';

import { useState } from 'react';
import { CategoryWithSpend, BookingStatus, LineItemWithPayments, formatCurrency, formatPercent } from '@/lib/types';
import LineItemsModal from './LineItemsModal';

const BOOKING_STATUS_RANK: Record<BookingStatus, number> = {
  none: 0,
  inquired: 1,
  booked: 2,
  contracted: 3,
  completed: 4,
};

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  none: 'none',
  inquired: 'inquired',
  booked: 'booked',
  contracted: 'contracted',
  completed: 'completed',
};

function getSubtitle(lineItems: LineItemWithPayments[]): string {
  if (lineItems.length === 0) return 'No vendors yet';

  let bestStatus: BookingStatus = 'none';
  let bestCount = 0;
  for (const item of lineItems) {
    const status = item.booking_status || 'none';
    if (BOOKING_STATUS_RANK[status] > BOOKING_STATUS_RANK[bestStatus]) {
      bestStatus = status;
      bestCount = 1;
    } else if (status === bestStatus) {
      bestCount++;
    }
  }

  const vendorLabel = lineItems.length === 1 ? '1 vendor' : `${lineItems.length} vendors`;
  if (bestStatus === 'none') return vendorLabel;
  return `${vendorLabel} · ${bestCount} ${BOOKING_STATUS_LABELS[bestStatus]}`;
}

function getBarColor(ratio: number): string {
  if (ratio > 1) return 'bg-rose';
  if (ratio >= 0.85) return 'bg-champagne';
  return 'bg-sage';
}

function getRemainingDisplay(target: number, actual: number) {
  const remaining = target - actual;
  if (actual === 0 && target === 0) return { text: '—', color: 'text-stone' };

  if (remaining < 0) return { text: `-${formatCurrency(Math.abs(remaining))}`, color: 'text-rose-dark' };
  if (remaining === 0) return { text: formatCurrency(0), color: 'text-sage-dark' };

  const ratio = target > 0 ? actual / target : 0;
  let color: string;
  if (ratio >= 0.85) color = 'text-champagne-dark';
  else color = 'text-sage-dark';

  return { text: formatCurrency(remaining), color };
}

interface CategoryRowProps {
  category: CategoryWithSpend;
  totalBudget: number;
  onUpdate: () => void;
  onDelete: () => void;
  isClientView: boolean;
  renderMode?: 'row' | 'card';
}

export default function CategoryRow({
  category,
  totalBudget,
  onUpdate,
  onDelete,
  isClientView,
  renderMode = 'row',
}: CategoryRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const lineItems = (category.line_items || []) as LineItemWithPayments[];
  const subtitle = getSubtitle(lineItems);
  const target = Number(category.target_amount);
  const actual = category.actual_spend;
  const paid = category.total_paid;
  const ratio = target > 0 ? actual / target : (actual > 0 ? 2 : 0);
  const barWidth = Math.min(ratio * 100, 100);
  const remaining = getRemainingDisplay(target, actual);

  const handleRowClick = () => setModalOpen(true);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  if (renderMode === 'card') {
    return (
      <>
        <div
          onClick={handleRowClick}
          className="p-4 cursor-pointer hover:bg-stone-lighter transition-colors duration-100 active:bg-stone-lighter"
        >
          {/* Top: name + chevron */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal">{category.name}</p>
              <p className="text-xs text-warm-gray mt-0.5">{subtitle}</p>
            </div>
            <svg className="w-4 h-4 text-stone shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* 2x2 number grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div>
              <p className="text-[10px] text-warm-gray-light uppercase tracking-wider">Target</p>
              <p className="text-sm text-warm-gray tabular-nums">{formatCurrency(target)}</p>
            </div>
            <div>
              <p className="text-[10px] text-warm-gray-light uppercase tracking-wider">Spent</p>
              <p className="text-sm font-medium text-charcoal tabular-nums">{formatCurrency(actual)}</p>
            </div>
            <div>
              <p className="text-[10px] text-warm-gray-light uppercase tracking-wider">Paid</p>
              <p className="text-sm text-warm-gray tabular-nums">{formatCurrency(paid)}</p>
            </div>
            <div>
              <p className="text-[10px] text-warm-gray-light uppercase tracking-wider">Remaining</p>
              <p className={`text-sm font-medium tabular-nums ${remaining.color}`}>{remaining.text}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-1 bg-stone-lighter rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(ratio)}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-warm-gray-light tabular-nums">{formatPercent(ratio * 100)} spent</span>
              <span className="text-xs text-warm-gray-light tabular-nums">{formatCurrency(target)}</span>
            </div>
          </div>
        </div>

        <LineItemsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          category={category}
          totalBudget={totalBudget}
          onUpdate={onUpdate}
          isClientView={isClientView}
        />
      </>
    );
  }

  // Desktop row
  return (
    <>
      <div
        onClick={handleRowClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex items-center gap-4 px-4 py-3 border-b border-stone-lighter cursor-pointer hover:bg-stone-lighter transition-colors duration-100 group"
      >
        {/* Zone 1 — Category name */}
        <div className="w-48 min-w-0 shrink-0">
          <p className="text-sm font-medium text-charcoal truncate">{category.name}</p>
          <p className="text-xs text-warm-gray mt-0.5 truncate">{subtitle}</p>
        </div>

        {/* Zone 2 — Target */}
        <div className="w-24 text-right shrink-0">
          <span className="text-sm text-warm-gray tabular-nums">{formatCurrency(target)}</span>
        </div>

        {/* Zone 3 — Spent */}
        <div className="w-24 text-right shrink-0">
          <span className="text-sm font-medium text-charcoal tabular-nums">{formatCurrency(actual)}</span>
        </div>

        {/* Zone 4 — Progress bar */}
        <div className="flex-1 min-w-[10rem]">
          <div className="print:hidden">
            <div className="h-1.5 bg-stone-lighter rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(ratio)}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <p className="text-xs text-warm-gray-light tabular-nums mt-0.5">{formatPercent(ratio * 100)}</p>
          </div>
          <span className="hidden print:inline text-xs text-warm-gray tabular-nums">{formatCurrency(actual)} / {formatCurrency(target)}</span>
        </div>

        {/* Zone 5 — Remaining */}
        <div className="w-28 text-right shrink-0">
          <span className={`text-sm font-medium tabular-nums ${remaining.color}`}>{remaining.text}</span>
        </div>

        {/* Zone 6 — Actions */}
        <div className="w-8 flex items-center justify-end shrink-0 relative">
          {!isClientView && (
            <button
              type="button"
              onClick={handleDelete}
              className={`absolute right-6 p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light transition-opacity ${
                hovered ? 'opacity-100' : 'opacity-0'
              }`}
              aria-label="Delete category"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <svg className="w-4 h-4 text-stone shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <LineItemsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        category={category}
        totalBudget={totalBudget}
        onUpdate={onUpdate}
        isClientView={isClientView}
      />
    </>
  );
}
