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

type InboxTab = 'pending' | 'active' | 'history';

interface EngagementWithCouple extends Engagement {
  couple_name: string;
}

const STATUS_BADGE: Record<EngagementStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Accepted', classes: 'bg-blue-100 text-blue-800' },
  active: { label: 'Active', classes: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', classes: 'bg-slate-100 text-slate-600' },
  declined: { label: 'Declined', classes: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', classes: 'bg-slate-100 text-slate-600' },
};

const TYPE_BADGE: Record<EngagementType, { label: string; classes: string }> = {
  consultation: { label: 'Consultation', classes: 'bg-purple-100 text-purple-800' },
  subscription: { label: 'Subscription', classes: 'bg-teal-100 text-teal-800' },
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

  const handleAcceptSubscription = async () => {
    if (!acceptingSubId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('engagements')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', acceptingSubId);

      if (error) throw error;
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

      const { error } = await supabase
        .from('engagements')
        .update({
          status: 'accepted',
          started_at: new Date().toISOString(),
          scheduled_at: scheduledAt,
        })
        .eq('id', acceptingId);

      if (error) throw error;
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">This page is for planners.</p>
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

  const acceptingEngagement = acceptingId ? engagements.find((e) => e.id === acceptingId) : null;
  const acceptingSubEngagement = acceptingSubId ? engagements.find((e) => e.id === acceptingSubId) : null;
  const decliningEngagement = decliningId ? engagements.find((e) => e.id === decliningId) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Inbox</h1>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending' ? 'text-slate-900 border-slate-900' : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Pending
            {pendingEngagementCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                {pendingEngagementCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'active' ? 'text-slate-900 border-slate-900' : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Active
            {activeEngagements.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                {activeEngagements.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history' ? 'text-slate-900 border-slate-900' : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            History
            {historyEngagements.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                {historyEngagements.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        {tabEngagements.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
            <p className="text-slate-400">
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
          <p className="text-sm text-slate-600">
            Confirm or adjust the consultation date and time.
          </p>

          {acceptingEngagement?.scheduled_at && (
            <p className="text-sm text-slate-500">
              Couple&apos;s preferred time:{' '}
              <span className="font-medium text-slate-700">
                {new Date(acceptingEngagement.scheduled_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmed date & time
            </label>
            <div className="flex gap-3">
              <input
                type="date"
                value={confirmDate}
                onChange={(e) => setConfirmDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
              <select
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
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
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptConsultation}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-sm text-slate-600">
            Are you sure you want to decline the {decliningEngagement?.type} request from{' '}
            <span className="font-medium">{decliningEngagement?.couple_name}</span>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDecliningId(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDecline}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  onAccept: () => void;
  onDecline: () => void;
  onMarkComplete: () => void;
  onEndSubscription: () => void;
}

function EngagementCard({
  engagement,
  tab,
  submitting,
  onAccept,
  onDecline,
  onMarkComplete,
  onEndSubscription,
}: EngagementCardProps) {
  const type = TYPE_BADGE[engagement.type];
  const status = STATUS_BADGE[engagement.status];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-medium text-slate-900">{engagement.couple_name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type.classes}`}>
              {type.label}
            </span>
            {tab === 'history' && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.classes}`}>
                {status.label}
              </span>
            )}
            <span className="text-xs text-slate-400">
              {formatRate(engagement.rate_cents)}{engagement.type === 'consultation' ? '/hr' : '/mo'}
            </span>
          </div>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{formatDate(engagement.created_at)}</span>
      </div>

      {/* Message */}
      {engagement.message && (
        <div className="mb-3">
          <p className="text-sm text-slate-600 whitespace-pre-line">{engagement.message}</p>
        </div>
      )}

      {/* Scheduled time */}
      {engagement.scheduled_at && (
        <p className="text-sm text-slate-500 mb-3">
          {tab === 'pending' ? 'Preferred time: ' : 'Scheduled: '}
          <span className="font-medium text-slate-700">
            {new Date(engagement.scheduled_at).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </p>
      )}

      {/* Start date for active */}
      {tab === 'active' && engagement.started_at && (
        <p className="text-sm text-slate-500 mb-3">
          Started: <span className="font-medium text-slate-700">{formatDate(engagement.started_at)}</span>
        </p>
      )}

      {/* History dates */}
      {tab === 'history' && engagement.ended_at && (
        <p className="text-sm text-slate-500 mb-3">
          Ended: <span className="font-medium text-slate-700">{formatDate(engagement.ended_at)}</span>
        </p>
      )}

      {/* View Wedding link (disabled for Phase 5) */}
      {tab !== 'history' && (
        <p className="text-xs text-slate-400 mb-3">
          <span className="cursor-not-allowed" title="Coming in Phase 5">View Wedding (coming soon)</span>
        </p>
      )}

      {/* Actions */}
      {tab === 'pending' && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onAccept}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decline
          </button>
        </div>
      )}

      {tab === 'active' && engagement.type === 'consultation' && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onMarkComplete}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark Complete
          </button>
        </div>
      )}

      {tab === 'active' && engagement.type === 'subscription' && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onEndSubscription}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            End Subscription
          </button>
        </div>
      )}
    </div>
  );
}
