'use client';

import { useState, useEffect } from 'react';
import { CategoryWithSpend } from '@/lib/types';
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

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 w-fit mb-4 print:hidden">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'categories' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'vendors' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Vendors & Payments
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
