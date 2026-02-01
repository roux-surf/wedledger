'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Client, Budget, CategoryWithSpend, LineItem, LineItemWithPayments, Payment, MilestoneWithBudget, formatCurrency, formatDate, formatPercent, getBudgetStatus, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { getWeddingLevelById } from '@/lib/budgetTemplates';
import CategoryTable from '@/components/budget/CategoryTable';
import BudgetSummary from '@/components/budget/BudgetSummary';
import TimelineSection from '@/components/timeline/TimelineSection';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import ClientDashboard from '@/components/client/ClientDashboard';

export default function ClientBudgetPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<CategoryWithSpend[]>([]);
  const [milestones, setMilestones] = useState<MilestoneWithBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClientView, setIsClientView] = useState(false);

  // Budget editing state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');
  const [, setBudgetUpdateLoading] = useState(false);
  const [budgetUpdateError, setBudgetUpdateError] = useState<string | null>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sticky header state
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const clientInfoRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();
  const { showSaved } = useToast();

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

      // Fetch line items for each category with payments
      const categoriesWithSpend: CategoryWithSpend[] = await Promise.all(
        categoriesData.map(async (category) => {
          const { data: lineItems } = await supabase
            .from('line_items')
            .select('*')
            .eq('category_id', category.id)
            .order('created_at', { ascending: true });

          const items = lineItems || [];
          const lineItemIds = items.map((li: LineItem) => li.id);

          // Batch-fetch payments for all line items in this category
          let paymentsData: Payment[] = [];
          if (lineItemIds.length > 0) {
            const { data } = await supabase
              .from('payments')
              .select('*')
              .in('line_item_id', lineItemIds)
              .order('created_at', { ascending: true });
            paymentsData = (data || []) as Payment[];
          }

          // Group payments by line_item_id
          const paymentsByLineItem: Record<string, Payment[]> = {};
          for (const payment of paymentsData) {
            if (!paymentsByLineItem[payment.line_item_id]) {
              paymentsByLineItem[payment.line_item_id] = [];
            }
            paymentsByLineItem[payment.line_item_id].push(payment);
          }

          // Attach payments to each line item
          const lineItemsWithPayments: LineItemWithPayments[] = items.map((item: LineItem) => {
            const itemPayments = paymentsByLineItem[item.id] || [];
            const totalPaid = itemPayments
              .filter((p) => p.status === 'paid')
              .reduce((sum, p) => sum + Number(p.amount), 0);
            const totalScheduled = itemPayments.reduce((sum, p) => sum + Number(p.amount), 0);

            return {
              ...item,
              payments: itemPayments,
              total_paid: totalPaid,
              total_scheduled: totalScheduled,
            };
          });

          const actualSpend = lineItemsWithPayments.reduce(
            (sum: number, item: LineItemWithPayments) => sum + (Number(item.actual_cost) || 0),
            0
          );

          return {
            ...category,
            actual_spend: actualSpend,
            line_items: lineItemsWithPayments,
          };
        })
      );

      setCategories(categoriesWithSpend);

      // Fetch milestones and enrich with budget data
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('client_id', clientId)
        .order('target_date', { ascending: true });

      const enrichedMilestones: MilestoneWithBudget[] = (milestonesData || []).map((m) => {
        const linked = m.category_id
          ? categoriesWithSpend.find((c) => c.id === m.category_id)
          : null;
        return {
          ...m,
          category_name: linked?.name,
          category_target: linked ? Number(linked.target_amount) : undefined,
          category_spent: linked?.actual_spend,
        };
      });

      setMilestones(enrichedMilestones);
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

  // Reset budget editing state when switching to client view
  useEffect(() => {
    if (isClientView && isEditingBudget) {
      setIsEditingBudget(false);
      setBudgetUpdateError(null);
    }
  }, [isClientView]);

  // Handle budget update
  const handleBudgetEdit = () => {
    if (isClientView) return;
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
      showSaved();
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

  // Client-friendly status messaging
  const getClientStatusMessage = () => {
    const overCategories = categories.filter(
      (cat) => cat.actual_spend > Number(cat.target_amount) && Number(cat.target_amount) > 0
    );

    if (budgetStatus === 'green') {
      return 'You are currently on track with your budget.';
    } else if (budgetStatus === 'yellow') {
      if (overCategories.length > 0) {
        return `A few categories are slightly over the initial plan. Overall, your budget is in good shape.`;
      }
      return 'Your spending is approaching the planned budget. Everything is looking good.';
    } else {
      if (overCategories.length > 0) {
        return `Some categories have exceeded the initial plan. Your coordinator can walk you through the details.`;
      }
      return 'Your spending has gone a bit beyond the original plan. Your coordinator can help review options.';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white print:min-h-0">
      <header className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
            {!isClientView && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                Delete Wedding
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Budget Summary Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-200 print:hidden ${
          showStickyHeader ? 'translate-y-0' : '-translate-y-full'
        } ${isClientView ? 'bg-slate-900 text-white border-b border-slate-700' : 'bg-white border-b border-slate-200 shadow-sm'}`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-6">
            <span className={`font-semibold truncate ${isClientView ? 'text-white' : 'text-slate-900'}`}>{client.name}</span>
            {/* Desktop sticky metrics */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className={isClientView ? 'text-slate-400' : 'text-slate-500'}>Budget:</span>
                <span className={`font-medium ${isClientView ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(totalBudget)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={isClientView ? 'text-slate-400' : 'text-slate-500'}>{isClientView ? 'Committed:' : 'Spent:'}</span>
                <span className={`font-medium ${isClientView ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(totalSpent)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={isClientView ? 'text-slate-400' : 'text-slate-500'}>Remaining:</span>
                <span className={`font-medium ${remaining >= 0 ? (isClientView ? 'text-emerald-400' : 'text-green-600') : (isClientView ? 'text-amber-400' : 'text-red-600')}`}>
                  {remaining < 0 && isClientView ? '-' : ''}{formatCurrency(Math.abs(remaining))}
                </span>
              </div>
              {!isClientView && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Allocated:</span>
                  <span className="font-medium text-slate-900">{formatPercent(totalAllocationPercent)}</span>
                  <span className={`text-xs ${allocationStatus.color}`}>({allocationStatus.label})</span>
                </div>
              )}
            </div>
            {/* Mobile sticky metrics */}
            <div className="flex md:hidden items-center gap-2 text-sm">
              <span className={`font-medium ${isClientView ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(totalSpent)}</span>
              <span className={isClientView ? 'text-slate-400' : 'text-slate-500'}>/</span>
              <span className={isClientView ? 'text-slate-400' : 'text-slate-500'}>{formatCurrency(totalBudget)}</span>
            </div>
          </div>
        </div>
      </div>

      <main className={`max-w-6xl mx-auto px-4 print:px-0 print:max-w-none ${isClientView ? 'py-10 print:py-6' : 'py-8 print:py-6'}`}>
        {isClientView ? (
          <ClientDashboard
            categories={categories}
            totalBudget={totalBudget}
            totalSpent={totalSpent}
            remaining={remaining}
            clientName={client.name}
            weddingDate={client.wedding_date}
            city={client.city}
            state={client.state}
            guestCount={client.guest_count}
            statusMessage={getClientStatusMessage()}
            budgetId={budget.id}
            onUpdate={fetchData}
            clientInfoRef={clientInfoRef}
          />
        ) : (
          /* Coordinator View: Detailed Info */
          <div ref={clientInfoRef} className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-2">
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

            <div className="mt-6 pt-6 border-t border-slate-100">
              {/* Mobile: stacked key metrics first */}
              <div className="flex flex-col gap-4 md:hidden">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Total Budget</p>
                    {isEditingBudget ? (
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
                        onClick={() => handleBudgetEdit()}
                        className="text-3xl font-bold text-slate-900 mt-1 cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded"
                      >
                        {formatCurrency(Number(client.total_budget))}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Remaining</p>
                    <p className={`text-2xl font-bold mt-1 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {remaining >= 0 ? '+' : '-'}{formatCurrency(Math.abs(remaining))}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Allocated</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(totalTarget)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Total Spent</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(totalSpent)}</p>
                  </div>
                </div>
              </div>
              {/* Desktop: 4-column grid */}
              <div className="hidden md:grid grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total Budget</p>
                  {isEditingBudget ? (
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
                      onClick={() => handleBudgetEdit()}
                      className="text-2xl font-bold text-slate-900 mt-1 cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded"
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
            {budget.template_id && (() => {
              const level = getWeddingLevelById(budget.template_id);
              return level ? (
                <p className="text-xs text-slate-400 mt-4">Started from: {level.displayName} template</p>
              ) : null;
            })()}
          </div>
        )}

        {/* Categories Table - Coordinator View only (Client view handled by ClientDashboard) */}
        {!isClientView && (
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 text-lg mb-4">Budget Categories</h3>
            <CategoryTable
              categories={categories}
              budgetId={budget.id}
              totalBudget={Number(client.total_budget)}
              onUpdate={fetchData}
              isClientView={false}
            />
          </div>
        )}

        {/* Planning Timeline */}
        <TimelineSection
          milestones={milestones}
          categories={categories}
          clientId={clientId}
          weddingDate={client.wedding_date}
          isClientView={isClientView}
          onUpdate={fetchData}
        />

        {/* AI Summary - Only in Coordinator View */}
        {!isClientView && (
          <div className="mb-6">
            <BudgetSummary clientId={clientId} />
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { error } = await supabase.from('clients').delete().eq('id', clientId);
            if (error) throw error;
            router.push('/dashboard');
          } catch (err) {
            console.error('Failed to delete client:', err);
            setDeleting(false);
            setShowDeleteConfirm(false);
          }
        }}
        title="Delete Wedding"
        message={`Are you sure you want to delete ${client.name}? This will permanently delete all budget data, categories, line items, and payments. This cannot be undone.`}
        confirmLabel="Delete Wedding"
        loading={deleting}
      />
    </div>
  );
}
