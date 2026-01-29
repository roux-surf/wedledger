'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Client, Budget, CategoryWithSpend, LineItem, formatCurrency, formatDate, getBudgetStatus } from '@/lib/types';
import Button from '@/components/ui/Button';
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
  const [budgetUpdateLoading, setBudgetUpdateLoading] = useState(false);
  const [budgetUpdateError, setBudgetUpdateError] = useState<string | null>(null);

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

  // Handle budget update
  const handleBudgetEdit = () => {
    setBudgetValue(client?.total_budget?.toString() || '0');
    setBudgetUpdateError(null);
    setIsEditingBudget(true);
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
      const newBudget = parseFloat(budgetValue) || 0;
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Client Info */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
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
                    <span className="text-slate-500 text-lg">$</span>
                    <input
                      type="number"
                      value={budgetValue}
                      onChange={(e) => setBudgetValue(e.target.value)}
                      className="w-32 px-2 py-1 border border-slate-300 rounded text-lg font-bold"
                      min="0"
                      step="0.01"
                      autoFocus
                    />
                  </div>
                  {budgetUpdateError && (
                    <p className="text-red-600 text-xs mt-1">{budgetUpdateError}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleBudgetSave}
                      disabled={budgetUpdateLoading}
                      className="px-3 py-1 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
                    >
                      {budgetUpdateLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleBudgetCancel}
                      className="px-3 py-1 text-sm font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(Number(client.total_budget))}</p>
                  {!isClientView && (
                    <button
                      onClick={handleBudgetEdit}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title="Edit budget"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}
                </div>
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
