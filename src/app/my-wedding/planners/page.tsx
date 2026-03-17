'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/UserProfileContext';
import {
  EngagementWithDetails,
  EngagementStatus,
  formatRate,
  formatDate,
} from '@/lib/types';
import UpdateFeed from '@/components/engagement/UpdateFeed';

const STATUS_BADGE: Record<EngagementStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Accepted', classes: 'bg-blue-100 text-blue-800' },
  active: { label: 'Active', classes: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', classes: 'bg-slate-100 text-slate-600' },
  declined: { label: 'Declined', classes: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', classes: 'bg-slate-100 text-slate-600' },
};

const TYPE_BADGE: Record<string, { label: string; classes: string }> = {
  consultation: { label: 'Consultation', classes: 'bg-purple-100 text-purple-800' },
  subscription: { label: 'Subscription', classes: 'bg-teal-100 text-teal-800' },
};

export default function MyPlannersPage() {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { profile } = useUserProfile();

  const [engagements, setEngagements] = useState<EngagementWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadEngagements = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('couple_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load engagements:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const plannerUserIds = [...new Set(data.map((r: Record<string, unknown>) => r.planner_user_id as string))];

      // Fetch planner display names and profiles in parallel
      const [namesRes, profilesRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', plannerUserIds),
        supabase
          .from('planner_profiles')
          .select('*')
          .in('user_id', plannerUserIds),
      ]);

      const nameMap = new Map((namesRes.data ?? []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));
      const profileMap = new Map((profilesRes.data ?? []).map((p: Record<string, unknown>) => [p.user_id as string, p]));

      const mapped = data.map((row: Record<string, unknown>) => ({
        ...row,
        planner_name: nameMap.get(row.planner_user_id as string) ?? 'Unknown',
        couple_name: profile?.display_name ?? 'You',
        planner_profile: profileMap.get(row.planner_user_id as string) ?? null,
      })) as unknown as EngagementWithDetails[];
      setEngagements(mapped);
    }

    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    loadEngagements();
  }, [loadEngagements]);

  if (!profile || profile.role !== 'couple') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">This page is for couples.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Planners</h1>

        {engagements.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
            <p className="text-slate-500 mb-4">You haven&apos;t contacted any planners yet.</p>
            <a
              href="/find-planner"
              className="text-sm font-medium text-slate-900 hover:underline"
            >
              Browse the planner directory &rarr;
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {engagements.map((engagement) => {
              const status = STATUS_BADGE[engagement.status];
              const type = TYPE_BADGE[engagement.type];
              const isExpanded = expandedId === engagement.id;

              return (
                <div
                  key={engagement.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : engagement.id)}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{engagement.planner_name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type.classes}`}>
                            {type.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.classes}`}>
                            {status.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatRate(engagement.rate_cents)}{engagement.type === 'consultation' ? '/hr' : '/mo'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">
                          {formatDate(engagement.created_at)}
                        </span>
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {engagement.scheduled_at && (
                      <p className="text-xs text-slate-500 mt-2">
                        Preferred time: {new Date(engagement.scheduled_at).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                      {engagement.message && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Your message</p>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{engagement.message}</p>
                        </div>
                      )}
                      {engagement.planner_notes && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Planner notes</p>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{engagement.planner_notes}</p>
                        </div>
                      )}
                      {!engagement.message && !engagement.planner_notes && (engagement.status !== 'accepted' && engagement.status !== 'active') && (
                        <p className="text-sm text-slate-400">No details to show.</p>
                      )}
                      {(engagement.status === 'accepted' || engagement.status === 'active') && (
                        <UpdateFeed
                          engagementId={engagement.id}
                          plannerUserId={engagement.planner_user_id}
                          coupleUserId={engagement.couple_user_id}
                          plannerName={engagement.planner_name}
                          coupleName={engagement.couple_name}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
