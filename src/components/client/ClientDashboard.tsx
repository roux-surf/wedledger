'use client';

import { useMemo, RefObject } from 'react';
import { CategoryWithSpend, formatCurrency, formatDate } from '@/lib/types';
import {
  buildCashFlowData,
  buildCategoryAllocationData,
  buildPaidVsRemainingData,
  buildPaymentScheduleData,
} from '@/lib/clientDataTransformers';
import CashFlowChart from './CashFlowChart';
import BudgetByCategoryChart from './BudgetByCategoryChart';
import PaidVsRemainingChart from './PaidVsRemainingChart';
import ClientPaymentSchedule from './ClientPaymentSchedule';
import CategoryTable from '@/components/budget/CategoryTable';

interface ClientDashboardProps {
  categories: CategoryWithSpend[];
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  clientName: string;
  weddingDate: string;
  city: string;
  state: string;
  guestCount: number;
  statusMessage: string;
  budgetId: string;
  clientCreatedAt: string;
  onUpdate: () => void;
  clientInfoRef: RefObject<HTMLDivElement | null>;
}

export default function ClientDashboard({
  categories,
  totalBudget,
  totalSpent,
  remaining,
  clientName,
  weddingDate,
  city,
  state,
  guestCount,
  statusMessage,
  budgetId,
  clientCreatedAt,
  onUpdate,
  clientInfoRef,
}: ClientDashboardProps) {
  const cashFlowData = useMemo(() => buildCashFlowData(categories, clientCreatedAt), [categories, clientCreatedAt]);
  const categoryAllocationData = useMemo(() => buildCategoryAllocationData(categories), [categories]);
  const paidVsRemainingData = useMemo(() => buildPaidVsRemainingData(categories, totalBudget), [categories, totalBudget]);
  const paymentScheduleData = useMemo(() => buildPaymentScheduleData(categories), [categories]);

  return (
    <>
      {/* Hero Section */}
      <div ref={clientInfoRef} className="bg-white border border-slate-200 rounded-lg print:rounded-none p-5 md:p-8 mb-8 break-inside-avoid">
        {/* Mobile: stacked hero layout */}
        <div className="flex flex-col gap-5 md:hidden">
          <div className="text-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Budget</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="border-t border-slate-100 pt-4 flex justify-between items-end">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Committed</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Remaining</p>
              <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(remaining))}
              </p>
            </div>
          </div>
        </div>
        {/* Desktop: 3-column grid */}
        <div className="hidden md:grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Total Budget</p>
            <p className="text-4xl font-bold text-slate-900 whitespace-nowrap">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="border-x border-slate-200">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Total Committed</p>
            <p className="text-4xl font-bold text-slate-900 whitespace-nowrap">{formatCurrency(totalSpent)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Remaining</p>
            <p className={`text-4xl font-bold whitespace-nowrap ${remaining >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(remaining))}
            </p>
          </div>
        </div>
        <div className="mt-5 md:mt-6 pt-5 md:pt-6 border-t border-slate-100">
          <p className="text-slate-600 text-sm">{statusMessage}</p>
          <p className="text-slate-400 text-xs mt-2">
            {city}, {state} &bull; {formatDate(weddingDate)} &bull; {guestCount} guests
          </p>
        </div>
      </div>

      {/* Charts Grid: 2x2 on desktop, single column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CashFlowChart data={cashFlowData} />
        <BudgetByCategoryChart data={categoryAllocationData} totalBudget={totalBudget} />
        <PaidVsRemainingChart data={paidVsRemainingData} />
        <ClientPaymentSchedule payments={paymentScheduleData} />
      </div>

      {/* Budget Categories Table (read-only) */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-slate-900 mb-6">Budget Categories</h3>
        <CategoryTable
          categories={categories}
          budgetId={budgetId}
          totalBudget={totalBudget}
          onUpdate={onUpdate}
          isClientView={true}
        />
      </div>
    </>
  );
}
