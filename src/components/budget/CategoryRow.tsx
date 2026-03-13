'use client';

import { useState } from 'react';
import { CategoryWithSpend, BookingStatus, LineItemWithPayments, formatCurrency } from '@/lib/types';
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
  if (ratio > 1) return 'bg-red-500';
  if (ratio >= 0.85) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getDifferenceDisplay(target: number, actual: number) {
  if (actual === 0 && target === 0) return { text: '—', color: 'text-slate-300' };
  if (actual === 0) return { text: '—', color: 'text-slate-300' };

  const diff = target - actual;
  const ratio = target > 0 ? actual / target : (actual > 0 ? 2 : 0);

  let color: string;
  if (diff < 0) color = 'text-red-600';
  else if (ratio >= 0.85) color = 'text-amber-600';
  else color = 'text-green-600';

  const sign = diff >= 0 ? '+' : '-';
  return { text: `${sign}${formatCurrency(Math.abs(diff))}`, color };
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
  const ratio = target > 0 ? actual / target : (actual > 0 ? 2 : 0);
  const barWidth = Math.min(ratio * 100, 100);
  const diff = getDifferenceDisplay(target, actual);

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
          className="p-4 cursor-pointer hover:bg-slate-50 transition-colors active:bg-slate-100"
        >
          {/* Top: name + difference */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{category.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-sm font-medium tabular-nums ${diff.color}`}>{diff.text}</span>
              <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(ratio)}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400 tabular-nums">{formatCurrency(actual)}</span>
              <span className="text-xs text-slate-400 tabular-nums">{formatCurrency(target)}</span>
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
        className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors group"
      >
        {/* Zone 1 — Category info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900">{category.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Zone 2 — Progress bar */}
        <div className="w-36 shrink-0">
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getBarColor(ratio)}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400 tabular-nums">{formatCurrency(actual)}</span>
            <span className="text-xs text-slate-400 tabular-nums">{formatCurrency(target)}</span>
          </div>
        </div>

        {/* Zone 3 — Difference */}
        <div className="w-24 text-right shrink-0">
          <span className={`text-sm font-medium tabular-nums ${diff.color}`}>{diff.text}</span>
        </div>

        {/* Zone 4 — Delete (hover) + Chevron */}
        <div className="w-16 flex items-center justify-end gap-1 shrink-0">
          {!isClientView && (
            <button
              type="button"
              onClick={handleDelete}
              className={`p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-opacity ${
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
          <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
