'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/UserProfileContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Engagement,
  EngagementStatus,
  EngagementType,
  formatRate,
  formatDate,
} from '@/lib/types';
import UpdateFeed from '@/components/engagement/UpdateFeed';

type InboxTab = 'pending' | 'active' | 'history';

interface EngagementWithCouple extends Engagement {
  couple_name: string;
}

const STATUS_BADGE: Record<EngagementStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-champagne-light text-champagne-dark' },
  accepted: { label: 'Accepted', classes: 'bg-sage-light text-sage-dark' },
  active: { label: 'Active', classes: 'bg-sage-light text-sage-dark' },
  completed: { label: 'Completed', classes: 'bg-stone-lighter text-warm-gray' },
  declined: { label: 'Declined', classes: 'bg-rose-light text-rose-dark' },
  cancelled: { label: 'Cancelled', classes: 'bg-stone-lighter text-warm-gray' },
};

const TYPE_BADGE: Record<EngagementType, { label: string; classes: string }> = {
  consultation: { label: 'Consultation', classes: 'bg-champagne-light text-champagne-dark' },
  subscription: { label: 'Subscription', classes: 'bg-sage-light text-sage-dark' },
};

export default function PlannerInboxPage() {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { profile, pendingEngagementCount, refetchPendingCount } = useUserProfile();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<InboxTab>('pending');
  const [engagements, setEngagements] = useState<EngagementWithCouple[]>([]);
  const [loading, setLoading] = useState(true);

  // Accept modal state
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmTime, setConfirmTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Subscription accept confirmation
  const [acceptingSubId, setAcceptingSubId] = useState<string | null>(null);

  // Expand/collapse for update feed
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Decline confirmation
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const loadEngagements = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('planner_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load engagements:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const coupleUserIds = [...new Set(data.map((r: Record<string, unknown>) => r.couple_user_id as string))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', coupleUserIds);

      const nameMap = new Map((profiles ?? []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));

      const mapped = data.map((row: Record<string, unknown>) => ({
        ...row,
        couple_name: nameMap.get(row.couple_user_id as string) ?? 'Unknown',
      })) as unknown as EngagementWithCouple[];
      setEngagements(mapped);
    }

    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    loadEngagements();
  }, [loadEngagements]);

  const pendingEngagements = engagements.filter((e) => e.status === 'pending');
  const activeEngagements = engagements.filter((e) => e.status === 'accepted' || e.status === 'active');
  const historyEngagements = engagements.filter((e) =>
    e.status === 'completed' || e.status === 'declined' || e.status === 'cancelled'
  );

  const tabEngagements = activeTab === 'pending'
    ? pendingEngagements
    : activeTab === 'active'
      ? activeEngagements
      : historyEngagements;

  const handleAcceptClick = (engagement: EngagementWithCouple) => {
    if (engagement.type === 'subscription') {
      setAcceptingSubId(engagement.id);
    } else {
      // Consultations need date/time confirmation
      if (engagement.scheduled_at) {
        const d = new Date(engagement.scheduled_at);
        setConfirmDate(d.toISOString().split('T')[0]);
        const hours = d.getHours().toString().padStart(2, '0');
        const mins = d.getMinutes() >= 30 ? '30' : '00';
        setConfirmTime(`${hours}:${mins}`);
      } else {
        setConfirmDate('');
        setConfirmTime('');
      }
      setAcceptingId(engagement.id);
    }
  };

  const linkEngagementClient = async (engagementId: string, coupleUserId: string) => {
    const { data: coupleClient, error: lookupError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', coupleUserId)
      .limit(1)
      .single();

    if (lookupError || !coupleClient) {
      console.error('Could not find client record for couple:', coupleUserId, lookupError);
      return;
    }

    const { error: linkError } = await supabase
      .from('engagements')
      .update({ client_id: coupleClient.id })
      .eq('id', engagementId);

    if (linkError) {
      console.error('Failed to link client_id on engagement:', linkError);
    }
  };

  const handleAcceptSubscription = async () => {
    if (!acceptingSubId) return;
    setSubmitting(true);
    try {
      const engagement = engagements.find((e) => e.id === acceptingSubId);
      if (!engagement) throw new Error('Engagement not found');

      // Step 1: Update status
      const { error } = await supabase
        .from('engagements')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', acceptingSubId);

      if (error) throw error;

      // Step 2: Link client_id (now that status is 'active', RLS allows the lookup)
      await linkEngagementClient(acceptingSubId, engagement.couple_user_id);

      showToast('Subscription accepted!');
      setAcceptingSubId(null);
      await loadEngagements();
      refetchPendingCount();
    } catch {
      showToast('Something went wrong.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptConsultation = async () => {
    if (!acceptingId) return;
    setSubmitting(true);
    try {
      let scheduledAt: string | null = null;
      if (confirmDate) {
        const time = confirmTime || '12:00';
        scheduledAt = new Date(`${confirmDate}T${time}`).toISOString();
      }

      const engagement = engagements.find((e) => e.id === acceptingId);
      if (!engagement) throw new Error('Engagement not found');

      // Step 1: Update status
      const { error } = await supabase
        .from('engagements')
        .update({
          status: 'accepted',
          started_at: new Date().toISOString(),
          scheduled_at: scheduledAt,
        })
        .eq('id', acceptingId);

      if (error) throw error;

      // Step 2: Link client_id (now that status is 'accepted', RLS allows the lookup)
      await linkEngagementClient(acceptingId, engagement.couple_user_id);

      showToast('Consultation accepted!');
      setAcceptingId(null);
      await loadEngagements();
      refetchPendingCount();
    } catch {
      showToast('Something went wrong.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!decliningId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('engagements')
        .update({ status: 'declined' })
        .eq('id', decliningId);

      if (error) throw error;
      showToast('Request declined.');
      setDecliningId(null);
      await loadEngagements();
      refetchPendingCount();
    } catch {
      showToast('Something went wrong.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('engagements')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      showToast('Marked as complete.');
      await loadEngagements();
    } catch {
      showToast('Something went wrong.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndSubscription = async (id: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('engagements')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      showToast('Subscription ended.');
      await loadEngagements();
    } catch {
      showToast('Something went wrong.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile || profile.role !== 'planner') {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray-light">This page is for planners.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray-light">Loading...</p>
      </div>
    );
  }

  const acceptingEngagement = acceptingId ? engagements.find((e) => e.id === acceptingId) : null;
  const acceptingSubEngagement = acceptingSubId ? engagements.find((e) => e.id === acceptingSubId) : null;
  const decliningEngagement = decliningId ? engagements.find((e) => e.id === decliningId) : null;

  return (
    <div className="min-h-screen bg-ivory">
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-charcoal mb-6">Inbox</h1>

        {/* Tab bar */}
        <div className="flex border-b border-stone mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending' ? 'text-charcoal border-charcoal' : 'text-warm-gray border-transparent hover:text-charcoal'
            }`}
          >
            Pending
            {pendingEngagementCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-champagne-light text-champagne-dark rounded-full">
                {pendingEngagementCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'active' ? 'text-charcoal border-charcoal' : 'text-warm-gray border-transparent hover:text-charcoal'
            }`}
          >
            Active
            {activeEngagements.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-sage-light text-sage-dark rounded-full">
                {activeEngagements.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history' ? 'text-charcoal border-charcoal' : 'text-warm-gray border-transparent hover:text-charcoal'
            }`}
          >
            History
            {historyEngagements.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-stone-lighter text-warm-gray rounded-full">
                {historyEngagements.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        {tabEngagements.length === 0 ? (
          <div className="bg-cream border border-stone rounded-lg p-8 text-center">
            <p className="text-warm-gray-light">
              {activeTab === 'pending' && 'No pending requests.'}
              {activeTab === 'active' && 'No active engagements.'}
              {activeTab === 'history' && 'No past engagements yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tabEngagements.map((engagement) => (
              <EngagementCard
                key={engagement.id}
                engagement={engagement}
                tab={activeTab}
                submitting={submitting}
                expanded={expandedId === engagement.id}
                onToggleExpand={() => setExpandedId(expandedId === engagement.id ? null : engagement.id)}
                plannerName={profile?.display_name ?? 'Planner'}
                onAccept={() => handleAcceptClick(engagement)}
                onDecline={() => setDecliningId(engagement.id)}
                onMarkComplete={() => handleMarkComplete(engagement.id)}
                onEndSubscription={() => handleEndSubscription(engagement.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Accept Consultation Modal */}
      <Modal
        isOpen={acceptingId !== null}
        onClose={() => setAcceptingId(null)}
        title={`Accept consultation with ${acceptingEngagement?.couple_name ?? ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-warm-gray">
            Confirm or adjust the consultation date and time.
          </p>

          {acceptingEngagement?.scheduled_at && (
            <p className="text-sm text-warm-gray">
              Couple&apos;s preferred time:{' '}
              <span className="font-medium text-charcoal">
                {new Date(acceptingEngagement.scheduled_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Confirmed date & time
            </label>
            <div className="flex gap-3">
              <input
                type="date"
                value={confirmDate}
                onChange={(e) => setConfirmDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 px-3 py-2 border border-stone rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
              />
              <select
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
                className="px-3 py-2 border border-stone rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
              >
                <option value="">Time</option>
                <option value="09:00">9:00 AM</option>
                <option value="09:30">9:30 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="10:30">10:30 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="11:30">11:30 AM</option>
                <option value="12:00">12:00 PM</option>
                <option value="12:30">12:30 PM</option>
                <option value="13:00">1:00 PM</option>
                <option value="13:30">1:30 PM</option>
                <option value="14:00">2:00 PM</option>
                <option value="14:30">2:30 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="15:30">3:30 PM</option>
                <option value="16:00">4:00 PM</option>
                <option value="16:30">4:30 PM</option>
                <option value="17:00">5:00 PM</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setAcceptingId(null)}
              className="px-4 py-2 text-sm font-medium text-charcoal bg-white border border-stone rounded-md hover:bg-stone-lighter transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptConsultation}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-sage rounded-md hover:bg-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Accepting...' : 'Accept Consultation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Accept Subscription Confirmation */}
      <ConfirmDialog
        isOpen={acceptingSubId !== null}
        onClose={() => setAcceptingSubId(null)}
        onConfirm={handleAcceptSubscription}
        title="Accept Ongoing Planning"
        message={`You'll be providing ongoing planning support to ${acceptingSubEngagement?.couple_name ?? ''} at ${acceptingSubEngagement ? formatRate(acceptingSubEngagement.rate_cents) : ''}/mo. You can end this subscription at any time.`}
        confirmLabel="Accept Subscription"
        confirmVariant="primary"
        loading={submitting}
        loadingLabel="Accepting..."
      />

      {/* Decline Confirmation Modal */}
      <Modal
        isOpen={decliningId !== null}
        onClose={() => setDecliningId(null)}
        title="Decline request"
      >
        <div className="space-y-4">
          <p className="text-sm text-warm-gray">
            Are you sure you want to decline the {decliningEngagement?.type} request from{' '}
            <span className="font-medium">{decliningEngagement?.couple_name}</span>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDecliningId(null)}
              className="px-4 py-2 text-sm font-medium text-charcoal bg-white border border-stone rounded-md hover:bg-stone-lighter transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDecline}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-rose-dark bg-white border border-rose-light rounded-md hover:bg-rose-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Declining...' : 'Decline'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------- Engagement Card ----------

interface EngagementCardProps {
  engagement: EngagementWithCouple;
  tab: InboxTab;
  submitting: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  plannerName: string;
  onAccept: () => void;
  onDecline: () => void;
  onMarkComplete: () => void;
  onEndSubscription: () => void;
}

function EngagementCard({
  engagement,
  tab,
  submitting,
  expanded,
  onToggleExpand,
  plannerName,
  onAccept,
  onDecline,
  onMarkComplete,
  onEndSubscription,
}: EngagementCardProps) {
  const type = TYPE_BADGE[engagement.type];
  const status = STATUS_BADGE[engagement.status];
  const isActive = tab === 'active';

  return (
    <div className="bg-cream border border-stone rounded-lg overflow-hidden">
      <div
        className={`p-5 ${isActive ? 'cursor-pointer hover:bg-stone-lighter transition-colors' : ''}`}
        onClick={isActive ? onToggleExpand : undefined}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-medium text-charcoal">{engagement.couple_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type.classes}`}>
                {type.label}
              </span>
              {tab === 'history' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.classes}`}>
                  {status.label}
                </span>
              )}
              <span className="text-xs text-warm-gray-light">
                {formatRate(engagement.rate_cents)}{engagement.type === 'consultation' ? '/hr' : '/mo'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-warm-gray-light">{formatDate(engagement.created_at)}</span>
            {isActive && (
              <svg
                className={`w-4 h-4 text-warm-gray-light transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>

        {/* Message */}
        {engagement.message && (
          <div className="mb-3">
            <p className="text-sm text-warm-gray whitespace-pre-line">{engagement.message}</p>
          </div>
        )}

        {/* Scheduled time */}
        {engagement.scheduled_at && (
          <p className="text-sm text-warm-gray mb-3">
            {tab === 'pending' ? 'Preferred time: ' : 'Scheduled: '}
            <span className="font-medium text-charcoal">
              {new Date(engagement.scheduled_at).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </p>
        )}

        {/* Start date for active */}
        {isActive && engagement.started_at && (
          <p className="text-sm text-warm-gray mb-3">
            Started: <span className="font-medium text-charcoal">{formatDate(engagement.started_at)}</span>
          </p>
        )}

        {/* History dates */}
        {tab === 'history' && engagement.ended_at && (
          <p className="text-sm text-warm-gray mb-3">
            Ended: <span className="font-medium text-charcoal">{formatDate(engagement.ended_at)}</span>
          </p>
        )}

        {/* View Wedding link */}
        {tab !== 'history' && engagement.client_id && (
          <p className="text-xs mb-3">
            <a
              href={`/clients/${engagement.client_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sage hover:text-sage-dark underline"
            >
              View Wedding
            </a>
          </p>
        )}

        {/* Actions */}
        {tab === 'pending' && (
          <div className="flex items-center gap-2 pt-2 border-t border-stone-lighter">
            <button
              onClick={onAccept}
              disabled={submitting}
              className="px-3 py-1.5 text-sm font-medium text-white bg-sage rounded-md hover:bg-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              disabled={submitting}
              className="px-3 py-1.5 text-sm font-medium text-rose-dark bg-white border border-rose-light rounded-md hover:bg-rose-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Decline
            </button>
          </div>
        )}

        {isActive && engagement.type === 'consultation' && (
          <div className="flex items-center gap-2 pt-2 border-t border-stone-lighter" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onMarkComplete}
              disabled={submitting}
              className="px-3 py-1.5 text-sm font-medium text-charcoal bg-white border border-stone rounded-md hover:bg-stone-lighter transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark Complete
            </button>
          </div>
        )}

        {isActive && engagement.type === 'subscription' && (
          <div className="flex items-center gap-2 pt-2 border-t border-stone-lighter" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEndSubscription}
              disabled={submitting}
              className="px-3 py-1.5 text-sm font-medium text-rose-dark bg-white border border-rose-light rounded-md hover:bg-rose-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              End Subscription
            </button>
          </div>
        )}
      </div>

      {/* Update feed (expanded for active engagements) */}
      {isActive && expanded && (
        <div className="px-5 pb-5 border-t border-stone-lighter pt-4">
          <UpdateFeed
            engagementId={engagement.id}
            plannerUserId={engagement.planner_user_id}
            coupleUserId={engagement.couple_user_id}
            plannerName={plannerName}
            coupleName={engagement.couple_name}
          />
        </div>
      )}
    </div>
  );
}
