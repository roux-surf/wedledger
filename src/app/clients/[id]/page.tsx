'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Client, Budget, CategoryWithSpend, LineItem, formatCurrency, formatDate, formatPercent, getBudgetStatus, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import CategoryTable from '@/components/budget/CategoryTable';
import BudgetSummary from '@/components/budget/BudgetSummary';

export default function ClientBudgetPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<CategoryWithSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClientView, setIsClientView] = useState(false);

  // Budget editing state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');
  const [, setBudgetUpdateLoading] = useState(false);
  const [budgetUpdateError, setBudgetUpdateError] = useState<string | null>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);

  // Sticky header state
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const clientInfoRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (budgetError) throw budgetError;
      setBudget(budgetData);

      // Fetch categories with line items
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('budget_id', budgetData.id)
        .order('sort_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch line items for each category
      const categoriesWithSpend: CategoryWithSpend[] = await Promise.all(
        categoriesData.map(async (category) => {
          const { data: lineItems } = await supabase
            .from('line_items')
            .select('*')
            .eq('category_id', category.id)
            .order('created_at', { ascending: true });

          const actualSpend = (lineItems || []).reduce(
            (sum: number, item: LineItem) => sum + (Number(item.actual_cost) || 0),
            0
          );

          return {
            ...category,
            actual_spend: actualSpend,
            line_items: lineItems || [],
          };
        })
      );

      setCategories(categoriesWithSpend);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [clientId, router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Track scroll to show/hide sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (clientInfoRef.current) {
        const rect = clientInfoRef.current.getBoundingClientRect();
        // Show sticky header when the client info section is scrolled out of view
        setShowStickyHeader(rect.bottom < 60);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle budget update
  const handleBudgetEdit = () => {
    setBudgetValue(sanitizeNumericString(client?.total_budget || 0));
    setBudgetUpdateError(null);
    setIsEditingBudget(true);
    // Focus the input after state update
    setTimeout(() => {
      budgetInputRef.current?.focus();
      budgetInputRef.current?.select();
    }, 0);
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBudgetSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleBudgetCancel();
    }
  };

  const handleBudgetBlur = () => {
    handleBudgetSave();
  };

  const handleBudgetCancel = () => {
    setIsEditingBudget(false);
    setBudgetUpdateError(null);
  };

  const handleBudgetSave = async () => {
    if (!client) return;

    setBudgetUpdateLoading(true);
    setBudgetUpdateError(null);

    try {
      const newBudget = parseNumericInput(budgetValue);
      if (newBudget < 0) {
        setBudgetUpdateError('Budget cannot be negative');
        return;
      }

      const { error } = await supabase
        .from('clients')
        .update({ total_budget: newBudget })
        .eq('id', client.id);

      if (error) {
        console.error('Failed to update budget:', error);
        setBudgetUpdateError(error.message || 'Failed to update budget');
        return;
      }

      setIsEditingBudget(false);
      fetchData();
    } catch (err) {
      console.error('Failed to update budget:', err);
      setBudgetUpdateError('An unexpected error occurred');
    } finally {
      setBudgetUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!client || !budget) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Client not found.</p>
      </div>
    );
  }

  const totalSpent = categories.reduce((sum, cat) => sum + cat.actual_spend, 0);
  const totalTarget = categories.reduce((sum, cat) => sum + Number(cat.target_amount), 0);
  const budgetStatus = getBudgetStatus(Number(client.total_budget), totalSpent);
  const remaining = Number(client.total_budget) - totalSpent;

  // Calculate allocation percentage and status
  const totalBudget = Number(client.total_budget);
  const totalAllocationPercent = totalBudget > 0 ? (totalTarget / totalBudget) * 100 : 0;

  const getAllocationStatus = () => {
    if (totalAllocationPercent < 99) {
      return { label: 'Under-allocated', color: 'text-yellow-600' };
    } else if (totalAllocationPercent <= 101) {
      return { label: 'Fully allocated', color: 'text-green-600' };
    } else {
      return { label: 'Over-allocated', color: 'text-red-600' };
    }
  };

  const allocationStatus = getAllocationStatus();

  const statusColors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    green: 'Under Budget',
    yellow: 'Near Budget',
    red: 'Over Budget',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              &larr; Back
            </Link>
            <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setIsClientView(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  !isClientView ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                Coordinator View
              </button>
              <button
                onClick={() => setIsClientView(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isClientView ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                Client View
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Budget Summary Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-sm transition-transform duration-200 ${
          showStickyHeader ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-6">
            <span className="font-semibold text-slate-900 truncate">{client.name}</span>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Budget:</span>
                <span className="font-medium text-slate-900">{formatCurrency(totalBudget)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Spent:</span>
                <span className="font-medium text-slate-900">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Remaining:</span>
                <span className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remaining >= 0 ? '+' : '-'}{formatCurrency(Math.abs(remaining))}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Allocated:</span>
                <span className="font-medium text-slate-900">{formatPercent(totalAllocationPercent)}</span>
                <span className={`text-xs ${allocationStatus.color}`}>({allocationStatus.label})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Client Info */}
        <div ref={clientInfoRef} className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{client.name}</h2>
              <p className="text-slate-600 mt-1">
                {client.city}, {client.state} &bull; {formatDate(client.wedding_date)} &bull; {client.guest_count} guests
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[budgetStatus]}`}>
              {statusLabels[budgetStatus]}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Budget</p>
              {isEditingBudget && !isClientView ? (
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-2xl font-bold">$</span>
                    <input
                      ref={budgetInputRef}
                      type="text"
                      inputMode="decimal"
                      value={budgetValue}
                      onChange={(e) => setBudgetValue(e.target.value)}
                      onKeyDown={handleBudgetKeyDown}
                      onBlur={(e) => {
                        const value = parseNumericInput(e.target.value);
                        setBudgetValue(sanitizeNumericString(Math.max(0, value)));
                        handleBudgetBlur();
                      }}
                      className="w-32 px-2 py-1 border border-slate-300 rounded text-2xl font-bold"
                    />
                  </div>
                  {budgetUpdateError && (
                    <p className="text-red-600 text-xs mt-1">{budgetUpdateError}</p>
                  )}
                </div>
              ) : (
                <p
                  onClick={() => !isClientView && handleBudgetEdit()}
                  className={`text-2xl font-bold text-slate-900 mt-1 ${!isClientView ? 'cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded' : ''}`}
                >
                  {formatCurrency(Number(client.total_budget))}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Allocated to Categories</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalTarget)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Spent</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Remaining</p>
              <p className={`text-2xl font-bold mt-1 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {remaining >= 0 ? '+' : '-'}{formatCurrency(Math.abs(remaining))}
              </p>
            </div>
          </div>
        </div>

        {/* Categories Table */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Budget Categories</h3>
          <CategoryTable
            categories={categories}
            budgetId={budget.id}
            totalBudget={Number(client.total_budget)}
            onUpdate={fetchData}
            isClientView={isClientView}
          />
        </div>

        {/* AI Summary - Only in Coordinator View */}
        {!isClientView && (
          <div className="mb-6">
            <BudgetSummary clientId={clientId} />
          </div>
        )}
      </main>
    </div>
  );
}
