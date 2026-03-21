'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/UserProfileContext';
import { useClientBudget } from '@/lib/hooks/useClientBudget';
import { useBudgetEditing } from '@/lib/hooks/useBudgetEditing';
import { formatCurrency, formatDate, getBudgetStatus, getAllocationStatus } from '@/lib/types';
import BudgetTabs from '@/components/budget/BudgetTabs';
import BudgetSummary from '@/components/budget/BudgetSummary';
import BudgetMetrics from '@/components/budget/BudgetMetrics';
import BudgetProgressBar from '@/components/budget/BudgetProgressBar';
import StickyBudgetHeader from '@/components/budget/StickyBudgetHeader';
import TimelineSection from '@/components/timeline/TimelineSection';
import WeddingCountdown from '@/components/couple/WeddingCountdown';
import PlannerCTA from '@/components/couple/PlannerCTA';
import Button from '@/components/ui/Button';

export default function MyWeddingPage() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { profile, loading: profileLoading } = useUserProfile();

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

  // Budget editing via shared hook
  const editing = useBudgetEditing({
    clientId: client?.id ?? null,
    currentBudget: client?.total_budget ?? 0,
    onSaved: fetchData,
  });

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
  const allocationStatus = getAllocationStatus(totalAllocationPercent);

  return (
    <div className="min-h-screen bg-ivory">
      <StickyBudgetHeader
        visible={showStickyHeader}
        name={client.name}
        totalBudget={totalBudget}
        totalSpent={totalSpent}
        remaining={remaining}
      />

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
          <BudgetMetrics
            totalBudget={totalBudget}
            totalTarget={totalTarget}
            totalSpent={totalSpent}
            remaining={remaining}
            totalAllocationPercent={totalAllocationPercent}
            allocationStatus={allocationStatus}
            spentLabel="Committed"
            isEditingBudget={editing.isEditing}
            budgetValue={editing.budgetValue}
            setBudgetValue={editing.setBudgetValue}
            budgetUpdateError={editing.budgetUpdateError}
            budgetInputRef={editing.budgetInputRef}
            onBudgetEdit={editing.startEditing}
            onBudgetKeyDown={editing.handleKeyDown}
            onBudgetBlur={editing.handleBlur}
          />

          {/* Progress bar */}
          <BudgetProgressBar
            budgetStatus={budgetStatus}
            totalBudget={totalBudget}
            totalSpent={totalSpent}
            remaining={remaining}
          />
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
