'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatPercent, getBudgetStatus, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { US_STATES } from '@/lib/constants';
import { getWeddingLevelById } from '@/lib/budgetTemplates';
import { useClientBudget } from '@/lib/hooks/useClientBudget';
import BudgetTabs from '@/components/budget/BudgetTabs';
import BudgetSummary from '@/components/budget/BudgetSummary';
import TimelineSection from '@/components/timeline/TimelineSection';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import ClientDashboard from '@/components/client/ClientDashboard';

export default function ClientBudgetPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const { user } = useUser();
  const { client, budget, categories, milestones, loading, fetchData } = useClientBudget(clientId);

  const [isClientView, setIsClientView] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Budget editing state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');
  const [, setBudgetUpdateLoading] = useState(false);
  const [budgetUpdateError, setBudgetUpdateError] = useState<string | null>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Wedding details editing state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    name: '',
    wedding_date: '',
    city: '',
    state: '',
    guest_count: '',
  });
  const [detailsSaving, setDetailsSaving] = useState(false);

  // Sticky header state
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const clientInfoRef = useRef<HTMLDivElement>(null);

  const supabase = useSupabaseClient();
  const { showSaved, showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Determine read-only access for marketplace clients
  const checkAccess = useCallback(async () => {
    if (!user || !client) return;

    // Owner (planner who created the client) has full access
    if (client.user_id === user.id) {
      setIsReadOnly(false);
      return;
    }

    // Not the owner — this is a marketplace client. Check engagement type.
    const { data } = await supabase
      .from('engagements')
      .select('type')
      .eq('planner_user_id', user.id)
      .eq('couple_user_id', client.user_id)
      .in('status', ['accepted', 'active'])
      .limit(1)
      .single();

    setIsReadOnly(!data || data.type === 'consultation');
  }, [user, client, supabase]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

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

  // Reset budget editing state when switching to client view or read-only
  useEffect(() => {
    if ((isClientView || isReadOnly) && isEditingBudget) {
      setIsEditingBudget(false);
      setBudgetUpdateError(null);
    }
  }, [isClientView, isReadOnly]);

  // Handle budget update
  const handleBudgetEdit = () => {
    if (isClientView || isReadOnly) return;
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

  // Determine if the current user is the owner (planner who created the wedding)
  const isOwner = !!(user && client && client.user_id === user.id);

  const handleEditDetails = () => {
    if (!client) return;
    setDetailsForm({
      name: client.name || '',
      wedding_date: client.wedding_date || '',
      city: client.city || '',
      state: client.state || '',
      guest_count: client.guest_count ? String(client.guest_count) : '',
    });
    setIsEditingDetails(true);
  };

  const handleDetailsSave = async () => {
    if (!client) return;
    setDetailsSaving(true);
    try {
      const guestCount = Math.round(parseNumericInput(detailsForm.guest_count));
      const { error } = await supabase
        .from('clients')
        .update({
          name: detailsForm.name,
          wedding_date: detailsForm.wedding_date,
          city: detailsForm.city,
          state: detailsForm.state,
          guest_count: guestCount,
        })
        .eq('id', client.id);
      if (error) {
        showToast('Failed to update wedding details', 'error');
        return;
      }
      setIsEditingDetails(false);
      showSaved();
      fetchData();
    } catch {
      showToast('Failed to update wedding details', 'error');
    } finally {
      setDetailsSaving(false);
    }
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDetailsForm((prev) => ({ ...prev, [name]: value }));
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
        console.warn('Failed to update budget:', error);
        showToast('Failed to update budget', 'error');
        setBudgetUpdateError(error.message || 'Failed to update budget');
        return;
      }

      setIsEditingBudget(false);
      showSaved();
      fetchData();
    } catch (err) {
      console.warn('Failed to update budget:', err);
      showToast('Failed to update budget', 'error');
      setBudgetUpdateError('An unexpected error occurred');
    } finally {
      setBudgetUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (!client || !budget) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray">Client not found.</p>
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
      return { label: 'Under-allocated', color: 'text-champagne-dark', dot: 'bg-champagne' };
    } else if (totalAllocationPercent <= 101) {
      return { label: 'Fully allocated', color: 'text-sage', dot: 'bg-sage' };
    } else {
      return { label: 'Over-allocated', color: 'text-rose', dot: 'bg-rose' };
    }
  };

  const allocationStatus = getAllocationStatus();

  const statusColors = {
    green: 'bg-sage-light text-sage-dark',
    yellow: 'bg-champagne-light text-champagne-dark',
    red: 'bg-rose-light text-rose-dark',
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
    <div className="min-h-screen bg-ivory print:bg-white print:min-h-0">
      <header className="bg-cream border-b border-stone print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-warm-gray hover:text-charcoal">
              &larr; Back
            </Link>
            <h1 className="text-2xl font-heading font-semibold tracking-tight text-charcoal">{client.name}</h1>
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-stone-lighter rounded-lg p-1">
                <button
                  onClick={() => setIsClientView(false)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    !isClientView ? 'bg-white shadow text-charcoal' : 'text-warm-gray'
                  }`}
                >
                  Coordinator View
                </button>
                <button
                  onClick={() => setIsClientView(true)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isClientView ? 'bg-white shadow text-charcoal' : 'text-warm-gray'
                  }`}
                >
                  Client View
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Sticky Budget Summary Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-200 print:hidden ${
          showStickyHeader ? 'translate-y-0' : '-translate-y-full'
        } bg-cream border-b border-stone shadow-sm`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-6">
            <span className="font-semibold truncate text-charcoal">{client.name}</span>
            {/* Desktop sticky metrics */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-warm-gray">Budget:</span>
                <span className="font-medium text-charcoal">{formatCurrency(totalBudget)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-warm-gray">{isClientView ? 'Committed:' : 'Spent:'}</span>
                <span className="font-medium text-charcoal">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-warm-gray">{remaining >= 0 ? 'Remaining:' : 'Over budget:'}</span>
                <span className={`font-medium ${remaining >= 0 ? 'text-sage' : 'text-rose'}`}>
                  {formatCurrency(Math.abs(remaining))}
                </span>
              </div>
              {!isClientView && (
                <div className="flex items-center gap-1.5">
                  <span className="text-warm-gray">Allocated:</span>
                  <span className="font-medium text-charcoal">{formatPercent(totalAllocationPercent)}</span>
                  <span className={`text-xs ${allocationStatus.color}`}>({allocationStatus.label})</span>
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

      <main className={`max-w-6xl mx-auto px-4 print:px-0 print:max-w-none ${isClientView ? 'py-10 print:py-6' : 'py-8 print:py-6'}`}>
        {isReadOnly && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-sage-light border border-sage rounded-lg print:hidden">
            <svg className="w-4 h-4 text-sage shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-sm text-sage-dark">You have view-only access to this wedding (consultation)</p>
          </div>
        )}
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
            clientCreatedAt={client.created_at}
            onUpdate={fetchData}
            clientInfoRef={clientInfoRef}
            clientSummary={client.client_summary}
          />
        ) : (
          /* Coordinator View: Detailed Info */
          <div ref={clientInfoRef} className="bg-cream border border-stone rounded-lg p-6 mb-6">
            {/* Layer 1 — Client info + status badge */}
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex-1 min-w-0">
                {isEditingDetails ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-charcoal mb-1">Wedding Name</label>
                      <input
                        id="edit-name"
                        name="name"
                        type="text"
                        value={detailsForm.name}
                        onChange={handleDetailChange}
                        required
                        className="w-full px-3 py-2 border border-stone rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit-wedding_date" className="block text-sm font-medium text-charcoal mb-1">Wedding Date</label>
                        <input
                          id="edit-wedding_date"
                          name="wedding_date"
                          type="date"
                          value={detailsForm.wedding_date}
                          onChange={handleDetailChange}
                          required
                          className="w-full px-3 py-2 border border-stone rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-guest_count" className="block text-sm font-medium text-charcoal mb-1">Guest Count</label>
                        <input
                          id="edit-guest_count"
                          name="guest_count"
                          type="text"
                          inputMode="numeric"
                          value={detailsForm.guest_count}
                          onChange={handleDetailChange}
                          required
                          placeholder="e.g., 150"
                          className="w-full px-3 py-2 border border-stone rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit-city" className="block text-sm font-medium text-charcoal mb-1">City</label>
                        <input
                          id="edit-city"
                          name="city"
                          type="text"
                          value={detailsForm.city}
                          onChange={handleDetailChange}
                          required
                          placeholder="e.g., Austin"
                          className="w-full px-3 py-2 border border-stone rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-state" className="block text-sm font-medium text-charcoal mb-1">State</label>
                        <select
                          id="edit-state"
                          name="state"
                          value={detailsForm.state}
                          onChange={handleDetailChange}
                          required
                          className="w-full px-3 py-2 border border-stone rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
                        >
                          <option value="">Select state</option>
                          {US_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDetailsSave}
                          disabled={detailsSaving}
                          className="px-4 py-1.5 text-sm font-medium bg-charcoal text-white rounded-md hover:bg-charcoal/90 disabled:opacity-50 transition-colors"
                        >
                          {detailsSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setIsEditingDetails(false)}
                          disabled={detailsSaving}
                          className="px-4 py-1.5 text-sm font-medium text-warm-gray hover:text-charcoal rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-1.5 text-sm font-medium text-rose hover:text-rose-dark hover:bg-rose-light rounded-md transition-colors"
                      >
                        Delete Wedding
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-heading font-semibold tracking-tight text-charcoal">{client.name}</h2>
                      {isOwner && !isReadOnly && (
                        <button
                          onClick={handleEditDetails}
                          className="text-warm-gray hover:text-charcoal transition-colors p-1"
                          title="Edit wedding details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-warm-gray mt-1">
                      {client.city}, {client.state} &bull; {formatDate(client.wedding_date)} &bull; {client.guest_count} guests
                      {budget.template_id && (() => {
                        const level = getWeddingLevelById(budget.template_id);
                        return level ? (
                          <>
                            {' '}&bull;{' '}
                            <span className="bg-stone-lighter text-warm-gray text-xs px-2 py-0.5 rounded-full inline-flex items-center">
                              {level.displayName} template
                            </span>
                          </>
                        ) : null;
                      })()}
                    </p>
                  </>
                )}
              </div>
              {!isEditingDetails && (
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[budgetStatus]}`}>
                  {statusLabels[budgetStatus]}
                </span>
              )}
            </div>

            {/* Layer 2 — Metrics tiles */}
            <div className="mt-6">
              {/* Mobile: 2x2 grid */}
              <div className="md:hidden bg-stone-lighter rounded-lg overflow-hidden grid grid-cols-2 gap-px">
                <div className="bg-cream p-4">
                  <p className="text-xs text-warm-gray uppercase tracking-wider">Total Budget</p>
                  {isEditingBudget && !isReadOnly ? (
                    <div className="mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-warm-gray text-xl font-bold">$</span>
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
                          className="w-28 px-2 py-1 border border-stone rounded text-xl font-bold"
                        />
                      </div>
                      {budgetUpdateError && (
                        <p className="text-rose text-xs mt-1">{budgetUpdateError}</p>
                      )}
                    </div>
                  ) : (
                    <p
                      onClick={isReadOnly ? undefined : () => handleBudgetEdit()}
                      className={`text-xl font-bold text-charcoal mt-1 ${isReadOnly ? '' : 'cursor-pointer hover:bg-ivory'} px-1 -mx-1 rounded`}
                    >
                      {formatCurrency(totalBudget)}
                    </p>
                  )}
                </div>
                <div className="bg-cream p-4">
                  <p className="text-xs text-warm-gray uppercase tracking-wider">Allocated</p>
                  <p className="text-xl font-bold text-charcoal mt-1">
                    {formatCurrency(totalTarget)}
                    <span className="text-sm font-normal text-warm-gray-light ml-1.5">{formatPercent(totalAllocationPercent)}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${allocationStatus.dot}`} />
                    <span className={`text-xs ${allocationStatus.color}`}>{allocationStatus.label}</span>
                  </div>
                </div>
                <div className="bg-cream p-4">
                  <p className="text-xs text-warm-gray uppercase tracking-wider">Total Spent</p>
                  <p className="text-xl font-bold text-charcoal mt-1">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="bg-cream p-4">
                  <p className="text-xs text-warm-gray uppercase tracking-wider">Remaining</p>
                  <p className={`text-xl font-bold mt-1 ${remaining >= 0 ? 'text-sage' : 'text-rose'}`}>
                    {remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(remaining))}
                  </p>
                </div>
              </div>
              {/* Desktop: segmented row */}
              <div className="hidden md:grid grid-cols-4 gap-px bg-stone-lighter rounded-lg overflow-hidden">
                <div className="bg-cream p-4">
                  <p className="text-xs text-warm-gray uppercase tracking-wider">Total Budget</p>
                  {isEditingBudget && !isReadOnly ? (
                    <div className="mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-warm-gray text-xl font-bold">$</span>
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
                          className="w-32 px-2 py-1 border border-stone rounded text-xl font-bold"
                        />
                      </div>
                      {budgetUpdateError && (
                        <p className="text-rose text-xs mt-1">{budgetUpdateError}</p>
                      )}
                    </div>
                  ) : (
                    <p
                      onClick={isReadOnly ? undefined : () => handleBudgetEdit()}
                      className={`text-xl font-bold text-charcoal mt-1 ${isReadOnly ? '' : 'cursor-pointer hover:bg-ivory'} px-1 -mx-1 rounded`}
                    >
                      {formatCurrency(totalBudget)}
                    </p>
                  )}
                </div>
                <div className="bg-cream p-4">
                  <p className="text-xs text-warm-gray uppercase tracking-wider">Allocated</p>
                  <p className="text-xl font-bold text-charcoal mt-1">
                    {formatCurrency(totalTarget)}
                    <span className="text-sm font-normal text-warm-gray-light ml-1.5">{formatPercent(totalAllocationPercent)}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${allocationStatus.dot}`} />
                    <span className={`text-xs ${allocationStatus.color}`}>{allocationStatus.label}</span>
                  </div>
                </div>
                <div className="bg-cream p-4">
                  <p className="text-xs text-warm-gray uppercase tracking-wider">Total Spent</p>
                  <p className="text-xl font-bold text-charcoal mt-1">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="bg-cream p-4">
                  <p className="text-xs text-warm-gray uppercase tracking-wider">Remaining</p>
                  <p className={`text-xl font-bold mt-1 ${remaining >= 0 ? 'text-sage' : 'text-rose'}`}>
                    {remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(remaining))}
                  </p>
                </div>
              </div>
            </div>

            {/* Layer 3 — Progress bar */}
            <div className="mt-4">
              <div className="h-1.5 bg-stone-lighter rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetStatus === 'green' ? 'bg-sage' : budgetStatus === 'yellow' ? 'bg-champagne' : 'bg-rose'
                  }`}
                  style={{ width: `${Math.min((totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0), 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-warm-gray-light">{formatCurrency(totalSpent)} committed</span>
                <span className="text-xs text-warm-gray-light">{remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over budget`}</span>
              </div>
            </div>

          </div>
        )}

        {/* Categories Table - Coordinator View only (Client view handled by ClientDashboard) */}
        {!isClientView && (
          <div className="mb-6">
            <h3 className="font-semibold text-charcoal text-lg mb-4">Budget</h3>
            <BudgetTabs
              categories={categories}
              budgetId={budget.id}
              totalBudget={Number(client.total_budget)}
              onUpdate={fetchData}
              isClientView={isReadOnly}
            />
          </div>
        )}

        {/* Planning Timeline */}
        <TimelineSection
          milestones={milestones}
          categories={categories}
          clientId={clientId}
          weddingDate={client.wedding_date}
          isClientView={isClientView || isReadOnly}
          onUpdate={fetchData}
        />

        {/* AI Summary - Only in Coordinator View, hidden for read-only */}
        {!isClientView && !isReadOnly && (
          <div className="mb-6">
            <BudgetSummary
              clientId={clientId}
              currentPublishedSummary={client.client_summary}
              onPushToClient={async (summary: string) => {
                const { error } = await supabase
                  .from('clients')
                  .update({
                    client_summary: summary || null,
                    client_summary_updated_at: summary ? new Date().toISOString() : null,
                  })
                  .eq('id', clientId);
                if (error) throw error;
                fetchData();
              }}
            />
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
            router.refresh();
            router.push('/dashboard');
          } catch (err) {
            console.warn('Failed to delete client:', err);
            showToast('Failed to delete client', 'error');
            setDeleting(false);
            setShowDeleteConfirm(false);
          }
        }}
        title="Are you sure?"
        message={`Deleting "${client.name}" will permanently remove all budget data, categories, line items, and payments associated with this wedding. This action cannot be undone.`}
        confirmLabel="Yes, Delete Wedding"
        loading={deleting}
      />
    </div>
  );
}
