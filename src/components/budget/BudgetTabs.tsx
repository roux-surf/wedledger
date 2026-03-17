'use client';

import { useState, useEffect, useMemo } from 'react';
import { CategoryWithSpend, getPaymentUrgency } from '@/lib/types';
import CategoryTable from './CategoryTable';
import VendorTable from './VendorTable';

interface BudgetTabsProps {
  categories: CategoryWithSpend[];
  budgetId: string;
  totalBudget: number;
  onUpdate: () => void;
  isClientView: boolean;
}

type Tab = 'categories' | 'vendors';

export default function BudgetTabs({
  categories,
  budgetId,
  totalBudget,
  onUpdate,
  isClientView,
}: BudgetTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('categories');

  // Reset to categories tab when switching between coordinator/client view
  useEffect(() => {
    setActiveTab('categories');
  }, [isClientView]);

  const overdueCount = useMemo(() => {
    let count = 0;
    for (const cat of categories) {
      for (const item of cat.line_items || []) {
        for (const payment of item.payments || []) {
          if (payment.status === 'paid' || !payment.due_date) continue;
          if (getPaymentUrgency(payment.due_date) === 'overdue') count++;
        }
      }
    }
    return count;
  }, [categories]);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-slate-200 mb-0 print:hidden">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'categories' ? 'text-slate-900 border-slate-900' : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          Categories<span className="text-slate-400 font-normal ml-1">({categories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`relative px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'vendors' ? 'text-slate-900 border-slate-900' : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          Vendors & Payments<span className="text-slate-400 font-normal ml-1">({categories.reduce((sum, cat) => sum + (cat.line_items?.length || 0), 0)})</span>
          {overdueCount > 0 && (
            <span className="absolute top-2 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'categories' ? (
        <CategoryTable
          categories={categories}
          budgetId={budgetId}
          totalBudget={totalBudget}
          onUpdate={onUpdate}
          isClientView={isClientView}
        />
      ) : (
        <VendorTable
          categories={categories}
          onUpdate={onUpdate}
          isClientView={isClientView}
        />
      )}
    </div>
  );
}
