'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { CoupleSubscriptionPlan, PLAN_CONFIG, UserRole } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PlanCard from '@/components/ui/PlanCard';

type Step = 'role' | 'couple-plan' | 'planner-name';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<CoupleSubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'couple') {
      setStep('couple-plan');
    } else {
      setStep('planner-name');
    }
  };

  const handlePlanSelect = async (plan: CoupleSubscriptionPlan) => {
    setSelectedPlan(plan);
    await completeOnboarding('couple', user?.firstName || 'My', plan);
  };

  const handlePlannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    await completeOnboarding('planner', displayName.trim(), null);
  };

  const completeOnboarding = async (
    role: UserRole,
    name: string,
    plan: CoupleSubscriptionPlan | null
  ) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Check if profile already exists (e.g. from a previous failed attempt)
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile?.onboarding_completed) {
        // Already completed — just redirect
        router.push('/dashboard');
        return;
      }

      // Upsert profile (handles both new and incomplete profiles, plus race conditions)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            role,
            display_name: name,
            email: user.primaryEmailAddress?.emailAddress || null,
            onboarding_completed: true,
          },
          { onConflict: 'user_id' }
        );

      if (profileError) throw profileError;

      if (role === 'couple' && plan) {
        // Check if subscription already exists
        const { data: existingSub } = await supabase
          .from('couple_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingSub) {
          const config = PLAN_CONFIG[plan];
          const startsAt = new Date();
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + config.months);

          const { error: subError } = await supabase
            .from('couple_subscriptions')
            .insert({
              user_id: user.id,
              plan_type: plan,
              price_cents: config.priceCents,
              status: 'active',
              starts_at: startsAt.toISOString(),
              expires_at: expiresAt.toISOString(),
            });

          if (subError) throw subError;
        }

        // Check if client record already exists
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingClient) {
          // Client already exists — ensure budget exists too
          const { data: existingBudget } = await supabase
            .from('budgets')
            .select('id')
            .eq('client_id', existingClient.id)
            .maybeSingle();

          if (!existingBudget) {
            const { error: budgetError } = await supabase
              .from('budgets')
              .insert({ client_id: existingClient.id });

            if (budgetError) throw budgetError;
          }
        } else {
          // Create a placeholder client record for the couple's wedding
          const config = PLAN_CONFIG[plan];
          const weddingDate = new Date();
          weddingDate.setMonth(weddingDate.getMonth() + config.months);
          const weddingDateStr = weddingDate.toISOString().split('T')[0];

          const { data: client, error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: user.id,
              name: `${name}'s Wedding`,
              wedding_date: weddingDateStr,
              city: 'TBD',
              state: 'TBD',
              guest_count: 0,
              total_budget: 0,
            })
            .select()
            .single();

          if (clientError) throw clientError;

          // Create budget for the client
          const { error: budgetError } = await supabase
            .from('budgets')
            .insert({ client_id: client.id });

          if (budgetError) throw budgetError;
        }
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {step === 'role' && <RoleSelection onSelect={handleRoleSelect} />}

        {step === 'couple-plan' && (
          <PlanSelection
            selectedPlan={selectedPlan}
            onSelect={handlePlanSelect}
            onBack={() => setStep('role')}
            loading={loading}
          />
        )}

        {step === 'planner-name' && (
          <PlannerNameStep
            displayName={displayName}
            onChange={setDisplayName}
            onSubmit={handlePlannerSubmit}
            onBack={() => setStep('role')}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

function RoleSelection({ onSelect }: { onSelect: (role: UserRole) => void }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold text-slate-900">Welcome to WedLedger</h1>
      <p className="text-slate-600 mt-2 mb-8">How will you be using WedLedger?</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Couple card */}
        <div className="border border-slate-200 bg-white rounded-lg p-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">
            I&apos;m planning my wedding
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Plan your own wedding with professional-grade budget and timeline tools.
            Get expert help when you need it.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">&#10003;</span>
              Full budget management
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">&#10003;</span>
              Timeline &amp; milestones
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">&#10003;</span>
              Access to planner network
            </li>
          </ul>
          <p className="text-xs text-slate-500 mt-4">Starting at $100 for 12 months</p>
          <Button className="w-full mt-4" onClick={() => onSelect('couple')}>
            Get Started
          </Button>
        </div>

        {/* Planner card */}
        <div className="border border-slate-200 bg-white rounded-lg p-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">
            I&apos;m a wedding planner
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Manage multiple weddings, track every vendor and payment, and share
            polished updates with your couples.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">&#10003;</span>
              Multi-client dashboard
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">&#10003;</span>
              Client-facing views
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">&#10003;</span>
              Grow with the marketplace
            </li>
          </ul>
          <Button
            className="w-full mt-4"
            variant="secondary"
            onClick={() => onSelect('planner')}
          >
            Set Up My Practice
          </Button>
          <p className="text-xs text-slate-400 text-center mt-2">
            Free during early access
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanSelection({
  selectedPlan,
  onSelect,
  onBack,
  loading,
}: {
  selectedPlan: CoupleSubscriptionPlan | null;
  onSelect: (plan: CoupleSubscriptionPlan) => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold text-slate-900">Choose Your Plan</h1>
      <p className="text-slate-600 mt-2 mb-8">
        Select the timeline that fits your wedding.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <PlanCard
          plan="12_month"
          description="Perfect for weddings 6-12 months away."
          onSelect={onSelect}
          disabled={loading}
          selected={selectedPlan === '12_month'}
        />
        <PlanCard
          plan="18_month"
          description="For weddings 12-18 months out. Best value."
          onSelect={onSelect}
          disabled={loading}
          selected={selectedPlan === '18_month'}
        />
      </div>

      <p className="text-xs text-slate-400 mt-6">
        Payment will be set up in a future update. Your account is free during early access.
      </p>

      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="mt-4 text-sm text-slate-500 hover:text-slate-700"
      >
        &larr; Back
      </button>
    </div>
  );
}

function PlannerNameStep({
  displayName,
  onChange,
  onSubmit,
  onBack,
  loading,
}: {
  displayName: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 text-center">
        Set Up Your Practice
      </h1>
      <p className="text-slate-600 mt-2 mb-8 text-center">
        What&apos;s your name?
      </p>

      <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-lg p-6">
        <Input
          id="display_name"
          label="Display Name"
          value={displayName}
          onChange={(e) => onChange(e.target.value)}
          required
          placeholder="e.g., Sarah Chen"
        />
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={loading || !displayName.trim()}>
            {loading ? 'Setting up...' : 'Continue'}
          </Button>
          <Button type="button" variant="secondary" onClick={onBack} disabled={loading}>
            Back
          </Button>
        </div>
      </form>
    </div>
  );
}
