'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/UserProfileContext';
import { US_STATES } from '@/lib/constants';
import {
  PlannerProfile,
  PlannerSpecialty,
  SPECIALTY_CONFIG,
  formatRate,
} from '@/lib/types';

const SPECIALTY_BADGE_COLORS: Record<string, string> = {
  purple: 'bg-sage-light text-sage-dark',
  blue: 'bg-champagne-light text-champagne-dark',
  green: 'bg-sage-light text-sage-dark',
  coral: 'bg-rose-light text-rose-dark',
  teal: 'bg-sage-light text-sage-dark',
  pink: 'bg-rose-light text-rose-dark',
};

const FILTER_PILL_COLORS: Record<string, { selected: string; unselected: string }> = {
  purple: { selected: 'bg-sage-light text-sage-dark border-sage', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  blue: { selected: 'bg-champagne-light text-champagne-dark border-champagne', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  green: { selected: 'bg-sage-light text-sage-dark border-sage', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  coral: { selected: 'bg-rose-light text-rose-dark border-rose', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  teal: { selected: 'bg-sage-light text-sage-dark border-sage', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  pink: { selected: 'bg-rose-light text-rose-dark border-rose', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
};

interface PlannerWithName extends PlannerProfile {
  display_name: string;
}

export default function FindPlannerPage() {
  const supabase = useSupabaseClient();
  const { profile } = useUserProfile();

  const [planners, setPlanners] = useState<PlannerWithName[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [stateFilter, setStateFilter] = useState('');
  const [specialtyFilters, setSpecialtyFilters] = useState<PlannerSpecialty[]>([]);
  const [budgetFriendly, setBudgetFriendly] = useState(false);

  const loadPlanners = useCallback(async () => {
    const { data, error } = await supabase
      .from('planner_profiles')
      .select('*, user_profiles!inner(display_name)')
      .eq('profile_published', true)
      .eq('accepting_clients', true)
      .order('weddings_completed', { ascending: false });

    if (error) {
      console.error('Failed to load planners:', error);
      setLoading(false);
      return;
    }

    const mapped: PlannerWithName[] = (data || []).map((row: Record<string, unknown>) => {
      const userProfile = row.user_profiles as { display_name: string };
      const { user_profiles: _, ...rest } = row;
      return { ...rest, display_name: userProfile.display_name } as PlannerWithName;
    });

    setPlanners(mapped);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (profile?.role === 'couple') {
      loadPlanners();
    }
  }, [profile, loadPlanners]);

  const filtered = useMemo(() => {
    let result = planners;

    if (stateFilter) {
      result = result.filter((p) => p.state === stateFilter);
    }

    if (specialtyFilters.length > 0) {
      result = result.filter((p) =>
        specialtyFilters.some((s) => p.specialties?.includes(s))
      );
    }

    if (budgetFriendly) {
      result = result.filter(
        (p) => p.consultation_rate_cents != null && p.consultation_rate_cents < 10000
      );
    }

    return result;
  }, [planners, stateFilter, specialtyFilters, budgetFriendly]);

  const hasActiveFilters = stateFilter || specialtyFilters.length > 0 || budgetFriendly;

  const clearFilters = () => {
    setStateFilter('');
    setSpecialtyFilters([]);
    setBudgetFriendly(false);
  };

  const toggleSpecialtyFilter = (specialty: PlannerSpecialty) => {
    setSpecialtyFilters((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray-light">Loading planners...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-semibold tracking-tight text-charcoal">Find a Wedding Planner</h1>
          <p className="text-warm-gray mt-1">
            WedLedger planners are experienced professionals ready to help with exactly what you need.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-cream border border-stone rounded-lg p-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            {/* State filter */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-stone rounded-md focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
            >
              <option value="">All states</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Specialty pills */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(SPECIALTY_CONFIG) as [PlannerSpecialty, { label: string; color: string }][]).map(
                ([key, config]) => {
                  const isSelected = specialtyFilters.includes(key);
                  const colors = FILTER_PILL_COLORS[config.color];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSpecialtyFilter(key)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isSelected ? colors.selected : colors.unselected
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                }
              )}
            </div>

            {/* Budget-friendly toggle */}
            <button
              type="button"
              onClick={() => setBudgetFriendly(!budgetFriendly)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                budgetFriendly
                  ? 'bg-charcoal text-white border-charcoal'
                  : 'bg-stone-lighter text-warm-gray border-stone'
              }`}
            >
              Under $100/hr
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-1 text-xs text-warm-gray hover:text-charcoal"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-warm-gray mb-4">No planners match your filters. Try broadening your search.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-charcoal bg-white border border-stone rounded-md hover:bg-stone-lighter"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((planner) => (
              <PlannerCard key={planner.id} planner={planner} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PlannerCard({ planner }: { planner: PlannerWithName }) {
  const location = [planner.city, planner.state].filter(Boolean).join(', ');
  const experience = [
    planner.experience_years > 0 ? `${planner.experience_years} years` : null,
    planner.weddings_completed > 0 ? `${planner.weddings_completed} weddings` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-cream border border-stone rounded-lg p-5 hover:shadow-sm transition-shadow">
      <div className="mb-3">
        <h3 className="text-lg font-heading font-medium tracking-tight text-charcoal">{planner.display_name}</h3>
        {location && (
          <p className="text-sm text-warm-gray mt-0.5">{location}</p>
        )}
      </div>

      {planner.bio && (
        <p className="text-sm text-warm-gray mb-3 line-clamp-2">{planner.bio}</p>
      )}

      {planner.specialties?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {planner.specialties.map((specialty) => {
            const config = SPECIALTY_CONFIG[specialty];
            if (!config) return null;
            const colorClass = SPECIALTY_BADGE_COLORS[config.color] || 'bg-stone-lighter text-charcoal';
            return (
              <span
                key={specialty}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
              >
                {config.label}
              </span>
            );
          })}
        </div>
      )}

      {experience && (
        <p className="text-xs text-warm-gray-light mb-3">{experience}</p>
      )}

      <div className="text-sm text-charcoal mb-4 space-y-0.5">
        {planner.consultation_rate_cents != null && (
          <p>Consults from {formatRate(planner.consultation_rate_cents)}/hr</p>
        )}
        {planner.subscription_rate_cents != null && (
          <p>Planning from {formatRate(planner.subscription_rate_cents)}/mo</p>
        )}
      </div>

      <Link
        href={`/find-planner/${planner.id}`}
        className="block w-full text-center px-4 py-2 text-sm font-medium text-charcoal bg-white border border-stone rounded-md hover:bg-stone-lighter transition-colors"
      >
        View Profile
      </Link>
    </div>
  );
}
