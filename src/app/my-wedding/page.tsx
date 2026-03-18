'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/UserProfileContext';
import { useClientBudget } from '@/lib/hooks/useClientBudget';
import { formatCurrency, formatDate, formatPercent, getBudgetStatus, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import BudgetTabs from '@/components/budget/BudgetTabs';
import BudgetSummary from '@/components/budget/BudgetSummary';
import TimelineSection from '@/components/timeline/TimelineSection';
import WeddingCountdown from '@/components/couple/WeddingCountdown';
import PlannerCTA from '@/components/couple/PlannerCTA';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function MyWeddingPage() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { profile, loading: profileLoading } = useUserProfile();
  const { showSaved, showToast } = useToast();

  const [clientId, setClientId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  // Resolve the couple's single client ID
  const resolveClient = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('clients')
      .select('id, city, state, guest_count')
      .eq('user_id', user.id)
      .single();

    if (!data) {
      setResolving(false);
      return;
    }

    // If still has placeholder values, redirect to setup
    const isPlaceholder = data.city === 'TBD' && data.state === 'TBD' && data.guest_count === 0;
    if (isPlaceholder) {
      router.replace('/my-wedding/setup');
      return;
    }

    setClientId(data.id);
    setResolving(false);
  }, [user, supabase, router]);

  useEffect(() => {
    if (profileLoading) return;

    if (profile?.role !== 'couple') {
      router.replace('/dashboard');
      return;
    }

    resolveClient();
  }, [profile, profileLoading, resolveClient, router]);

  // Use shared hook once we have the clientId
  const { client, budget, categories, milestones, loading: budgetLoading, fetchData } = useClientBudget(clientId);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId, fetchData]);

  // Budget editing state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');
  const [, setBudgetUpdateLoading] = useState(false);
  const [budgetUpdateError, setBudgetUpdateError] = useState<string | null>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);

  // Sticky header
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        setShowStickyHeader(rect.bottom < 60);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBudgetEdit = () => {
    setBudgetValue(sanitizeNumericString(client?.total_budget || 0));
    setBudgetUpdateError(null);
    setIsEditingBudget(true);
    setTimeout(() => {
      budgetInputRef.current?.focus();
      budgetInputRef.current?.select();
    }, 0);
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleBudgetSave(); }
    else if (e.key === 'Escape') { e.preventDefault(); setIsEditingBudget(false); setBudgetUpdateError(null); }
  };

  const handleBudgetSave = async () => {
    if (!client) return;
    setBudgetUpdateLoading(true);
    setBudgetUpdateError(null);

    try {
      const newBudget = parseNumericInput(budgetValue);
      if (newBudget < 0) { setBudgetUpdateError('Budget cannot be negative'); return; }

      const { error } = await supabase
        .from('clients')
        .update({ total_budget: newBudget })
        .eq('id', client.id);

      if (error) {
        showToast('Failed to update budget', 'error');
        setBudgetUpdateError(error.message || 'Failed to update budget');
        return;
      }

      setIsEditingBudget(false);
      showSaved();
      fetchData();
    } catch {
      showToast('Failed to update budget', 'error');
      setBudgetUpdateError('An unexpected error occurred');
    } finally {
      setBudgetUpdateLoading(false);
    }
  };

  // Loading states
  if (profileLoading || resolving || budgetLoading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray-light">Loading...</p>
      </div>
    );
  }

  if (!client || !budget || !clientId) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray">No wedding found. Please contact support.</p>
      </div>
    );
  }

  const totalSpent = categories.reduce((sum, cat) => sum + cat.actual_spend, 0);
  const totalTarget = categories.reduce((sum, cat) => sum + Number(cat.target_amount), 0);
  const totalBudget = Number(client.total_budget);
  const budgetStatus = getBudgetStatus(totalBudget, totalSpent);
  const remaining = totalBudget - totalSpent;
  const totalAllocationPercent = totalBudget > 0 ? (totalTarget / totalBudget) * 100 : 0;
  const spentPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getAllocationStatus = () => {
    if (totalAllocationPercent < 99) return { label: 'Under-allocated', color: 'text-champagne-dark', dot: 'bg-champagne' };
    if (totalAllocationPercent <= 101) return { label: 'Fully allocated', color: 'text-sage', dot: 'bg-sage' };
    return { label: 'Over-allocated', color: 'text-rose', dot: 'bg-rose' };
  };
  const allocationStatus = getAllocationStatus();

  return (
    <div className="min-h-screen bg-ivory">
      {/* Sticky Budget Summary Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-200 ${
          showStickyHeader ? 'translate-y-0' : '-translate-y-full'
        } bg-cream border-b border-stone shadow-sm`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-6">
            <span className="font-semibold truncate text-charcoal">{client.name}</span>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-warm-gray">Budget:</span>
                <span className="font-medium text-charcoal">{formatCurrency(totalBudget)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-warm-gray">Spent:</span>
                <span className="font-medium text-charcoal">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-warm-gray">{remaining >= 0 ? 'Remaining:' : 'Over budget:'}</span>
                <span className={`font-medium ${remaining >= 0 ? 'text-sage' : 'text-rose'}`}>
                  {formatCurrency(Math.abs(remaining))}
                </span>
              </div>
            </div>
            <div className="flex md:hidden items-center gap-2 text-sm">
              <span className="font-medium text-charcoal">{formatCurrency(totalSpent)}</span>
              <span className="text-warm-gray">/</span>
              <span className="text-warm-gray">{formatCurrency(totalBudget)}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Wedding Header Card */}
        <div ref={headerRef} className="bg-cream border border-stone rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-heading font-semibold tracking-tight text-charcoal">{client.name}</h1>
                <Link
                  href="/my-wedding/setup"
                  className="text-sm text-warm-gray-light hover:text-warm-gray transition-colors"
                >
                  Edit
                </Link>
              </div>
              <p className="text-warm-gray mt-1">
                {formatDate(client.wedding_date)} &bull; {client.city}, {client.state} &bull; {client.guest_count} guests
              </p>
            </div>
            <div className="bg-stone-lighter border border-stone-lighter rounded-lg px-5 py-3">
              <WeddingCountdown weddingDate={client.wedding_date} />
            </div>
          </div>

          {/* Budget Metrics */}
          <div className="mt-6">
            <div className="md:hidden bg-stone rounded-lg overflow-hidden grid grid-cols-2 gap-px">
              <div className="bg-cream p-4">
                <p className="text-xs text-warm-gray uppercase tracking-wider">Total Budget</p>
                {isEditingBudget ? (
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
                          handleBudgetSave();
                        }}
                        className="w-28 px-2 py-1 border border-stone rounded text-xl font-bold"
                      />
                    </div>
                    {budgetUpdateError && <p className="text-red-600 text-xs mt-1">{budgetUpdateError}</p>}
                  </div>
                ) : (
                  <p onClick={handleBudgetEdit} className="text-xl font-bold text-charcoal mt-1 cursor-pointer hover:bg-stone-lighter px-1 -mx-1 rounded">
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
                <p className="text-xs text-warm-gray uppercase tracking-wider">Committed</p>
                <p className="text-xl font-bold text-charcoal mt-1">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="bg-cream p-4">
                <p className="text-xs text-warm-gray uppercase tracking-wider">Remaining</p>
                <p className={`text-xl font-bold mt-1 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </div>
            <div className="hidden md:grid grid-cols-4 gap-px bg-stone rounded-lg overflow-hidden">
              <div className="bg-cream p-4">
                <p className="text-xs text-warm-gray uppercase tracking-wider">Total Budget</p>
                {isEditingBudget ? (
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
                          handleBudgetSave();
                        }}
                        className="w-32 px-2 py-1 border border-stone rounded text-xl font-bold"
                      />
                    </div>
                    {budgetUpdateError && <p className="text-red-600 text-xs mt-1">{budgetUpdateError}</p>}
                  </div>
                ) : (
                  <p onClick={handleBudgetEdit} className="text-xl font-bold text-charcoal mt-1 cursor-pointer hover:bg-stone-lighter px-1 -mx-1 rounded">
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
                <p className="text-xs text-warm-gray uppercase tracking-wider">Committed</p>
                <p className="text-xl font-bold text-charcoal mt-1">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="bg-cream p-4">
                <p className="text-xs text-warm-gray uppercase tracking-wider">Remaining</p>
                <p className={`text-xl font-bold mt-1 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-1.5 bg-stone-lighter rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetStatus === 'green' ? 'bg-green-500' : budgetStatus === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(spentPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-warm-gray-light">{formatCurrency(totalSpent)} committed</span>
              <span className="text-xs text-warm-gray-light">
                {remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over budget`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <Button variant="secondary" onClick={() => document.getElementById('budget-section')?.scrollIntoView({ behavior: 'smooth' })}>
            Add a Vendor
          </Button>
          <Button variant="secondary" onClick={() => document.getElementById('timeline-section')?.scrollIntoView({ behavior: 'smooth' })}>
            View Timeline
          </Button>
          <span className="relative group">
            <Button variant="secondary" disabled>
              Need Expert Help?
            </Button>
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-xs bg-charcoal text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Coming soon
            </span>
          </span>
        </div>

        {/* Budget Section */}
        <div id="budget-section" className="mb-6">
          <h2 className="font-semibold text-charcoal text-lg mb-4">Budget</h2>
          {categories.length === 0 ? (
            <div className="bg-cream border border-stone rounded-lg p-8 text-center">
              <p className="text-warm-gray mb-2">
                Let&apos;s start building your budget! Add your first category below, or pick a template to get going fast.
              </p>
              <Button
                variant="primary"
                onClick={() => router.push('/my-wedding/setup')}
                className="mt-3"
              >
                Use a Template
              </Button>
            </div>
          ) : (
            <BudgetTabs
              categories={categories}
              budgetId={budget.id}
              totalBudget={totalBudget}
              onUpdate={fetchData}
              isClientView={false}
            />
          )}
        </div>

        {/* Timeline Section */}
        <div id="timeline-section">
          {milestones.length === 0 ? (
            <div className="bg-cream border border-stone rounded-lg p-8 text-center mb-6">
              <h2 className="font-semibold text-charcoal text-lg mb-2">Planning Timeline</h2>
              <p className="text-warm-gray">
                Set up your planning timeline to keep everything on track. Start with a template or add milestones manually.
              </p>
            </div>
          ) : (
            <TimelineSection
              milestones={milestones}
              categories={categories}
              clientId={clientId}
              weddingDate={client.wedding_date}
              isClientView={false}
              onUpdate={fetchData}
            />
          )}
        </div>

        {/* Planner CTA */}
        {profile && (
          <div className="mb-6">
            <PlannerCTA profileCreatedAt={profile.created_at} />
          </div>
        )}

        {/* AI Summary */}
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
      </main>
    </div>
  );
}
