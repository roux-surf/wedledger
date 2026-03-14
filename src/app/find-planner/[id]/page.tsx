'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSupabaseClient } from '@/lib/supabase/client';
import {
  PlannerProfile,
  SPECIALTY_CONFIG,
  formatRate,
} from '@/lib/types';

const SPECIALTY_BADGE_COLORS: Record<string, string> = {
  purple: 'bg-purple-100 text-purple-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  coral: 'bg-orange-100 text-orange-800',
  teal: 'bg-teal-100 text-teal-800',
  pink: 'bg-pink-100 text-pink-800',
};

interface PlannerWithName extends PlannerProfile {
  display_name: string;
}

export default function PlannerDetailPage() {
  const params = useParams();
  const plannerId = params.id as string;
  const supabase = useSupabaseClient();

  const [planner, setPlanner] = useState<PlannerWithName | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadPlanner = useCallback(async () => {
    const { data, error } = await supabase
      .from('planner_profiles')
      .select('*, user_profiles!inner(display_name)')
      .eq('id', plannerId)
      .eq('profile_published', true)
      .single();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const userProfile = (data as Record<string, unknown>).user_profiles as { display_name: string };
    const { user_profiles: _, ...rest } = data as Record<string, unknown>;
    setPlanner({ ...rest, display_name: userProfile.display_name } as PlannerWithName);
    setLoading(false);
  }, [supabase, plannerId]);

  useEffect(() => {
    loadPlanner();
  }, [loadPlanner]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (notFound || !planner) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Planner not found.</p>
        <Link
          href="/find-planner"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          &larr; Back to Directory
        </Link>
      </div>
    );
  }

  const location = [planner.city, planner.state].filter(Boolean).join(', ');
  const experience = [
    planner.experience_years > 0 ? `${planner.experience_years} years experience` : null,
    planner.weddings_completed > 0 ? `${planner.weddings_completed} weddings completed` : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/find-planner"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-8"
        >
          &larr; Back to Directory
        </Link>

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{planner.display_name}</h1>
          {location && (
            <p className="text-slate-500 mt-1">{location}</p>
          )}

          {experience.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-4">
              {experience.map((stat) => (
                <span key={stat} className="text-sm text-slate-600">{stat}</span>
              ))}
            </div>
          )}

          {planner.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {planner.specialties.map((specialty) => {
                const config = SPECIALTY_CONFIG[specialty];
                if (!config) return null;
                const colorClass = SPECIALTY_BADGE_COLORS[config.color] || 'bg-slate-100 text-slate-700';
                return (
                  <span
                    key={specialty}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}
                  >
                    {config.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Bio */}
        {planner.bio && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">About</h2>
            <p className="text-slate-600 whitespace-pre-line">{planner.bio}</p>
          </div>
        )}

        {/* Rates & CTAs */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Services</h2>

          <div className="space-y-4">
            {planner.consultation_rate_cents != null && (
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">One-Time Consultation</p>
                  <p className="text-sm text-slate-500">{formatRate(planner.consultation_rate_cents)}/hr</p>
                </div>
                <button
                  disabled
                  className="relative group px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md opacity-50 cursor-not-allowed"
                >
                  Book a Consultation
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Coming soon
                  </span>
                </button>
              </div>
            )}

            {planner.subscription_rate_cents != null && (
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Ongoing Planning</p>
                  <p className="text-sm text-slate-500">{formatRate(planner.subscription_rate_cents)}/mo</p>
                </div>
                <button
                  disabled
                  className="relative group px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md opacity-50 cursor-not-allowed"
                >
                  Subscribe
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Coming soon
                  </span>
                </button>
              </div>
            )}

            {planner.consultation_rate_cents == null && planner.subscription_rate_cents == null && (
              <p className="text-sm text-slate-400">No rates listed yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
