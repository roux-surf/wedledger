'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import {
  PlannerProfile,
  SPECIALTY_CONFIG,
  EngagementType,
  Engagement,
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

interface PlannerWithName extends PlannerProfile {
  display_name: string;
}

export default function PlannerDetailPage() {
  const params = useParams();
  const plannerId = params.id as string;
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { showToast } = useToast();

  const [planner, setPlanner] = useState<PlannerWithName | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modal state
  const [modalType, setModalType] = useState<EngagementType | null>(null);
  const [message, setMessage] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Existing engagements
  const [existingEngagements, setExistingEngagements] = useState<Engagement[]>([]);

  // Wedding setup check
  const [weddingSetUp, setWeddingSetUp] = useState<boolean | null>(null);

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

  const loadExistingEngagements = useCallback(async () => {
    if (!user || !planner) return;

    const { data } = await supabase
      .from('engagements')
      .select('*')
      .eq('couple_user_id', user.id)
      .eq('planner_user_id', planner.user_id)
      .in('status', ['pending', 'accepted', 'active']);

    if (data) {
      setExistingEngagements(data as Engagement[]);
    }
  }, [supabase, user, planner]);

  const checkWeddingSetup = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('city')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    setWeddingSetUp(data ? data.city !== 'TBD' : false);
  }, [supabase, user]);

  useEffect(() => {
    loadPlanner();
  }, [loadPlanner]);

  useEffect(() => {
    checkWeddingSetup();
  }, [checkWeddingSetup]);

  useEffect(() => {
    loadExistingEngagements();
  }, [loadExistingEngagements]);

  const getExistingEngagement = (type: EngagementType): Engagement | undefined => {
    return existingEngagements.find((e) => e.type === type);
  };

  const getEngagementStatusLabel = (engagement: Engagement): string => {
    switch (engagement.status) {
      case 'pending':
        return 'Request Sent — Awaiting Response';
      case 'accepted':
        return 'Accepted — Confirmed';
      case 'active':
        return 'Active';
      default:
        return engagement.status;
    }
  };

  const getEngagementStatusClasses = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'text-champagne-dark bg-champagne-light border-champagne';
      case 'accepted':
        return 'text-sage-dark bg-sage-light border-sage';
      case 'active':
        return 'text-sage-dark bg-sage-light border-sage';
      default:
        return 'text-warm-gray bg-stone-lighter border-stone';
    }
  };

  const openModal = (type: EngagementType) => {
    setMessage('');
    setPreferredDate('');
    setPreferredTime('');
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
  };

  const handleSubmit = async () => {
    if (!user || !planner || !modalType) return;
    if (!weddingSetUp) return;
    if (message.length < 20) return;

    setSubmitting(true);
    try {
      const rateCents = modalType === 'consultation'
        ? planner.consultation_rate_cents!
        : planner.subscription_rate_cents!;

      let scheduledAt: string | null = null;
      if (modalType === 'consultation' && preferredDate) {
        const time = preferredTime || '12:00';
        scheduledAt = new Date(`${preferredDate}T${time}`).toISOString();
      }

      const { error } = await supabase.from('engagements').insert({
        planner_user_id: planner.user_id,
        couple_user_id: user.id,
        type: modalType,
        status: 'pending',
        rate_cents: rateCents,
        message,
        scheduled_at: scheduledAt,
      });

      if (error) throw error;

      showToast(`Your request has been sent to ${planner.display_name}!`);
      closeModal();
      await loadExistingEngagements();
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray-light">Loading...</p>
      </div>
    );
  }

  if (notFound || !planner) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center gap-4">
        <p className="text-warm-gray">Planner not found.</p>
        <Link
          href="/find-planner"
          className="text-sm text-warm-gray hover:text-charcoal"
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

  const existingConsultation = getExistingEngagement('consultation');
  const existingSubscription = getExistingEngagement('subscription');

  const modalTitle = modalType === 'consultation'
    ? `Book a Consultation with ${planner.display_name}`
    : `Subscribe to ${planner.display_name}'s Planning`;

  const modalRate = modalType === 'consultation'
    ? `${formatRate(planner.consultation_rate_cents!)}/hr`
    : `${formatRate(planner.subscription_rate_cents!)}/mo`;

  const messagePlaceholder = modalType === 'consultation'
    ? 'What are you struggling with? What kind of help do you need? Any specific questions?'
    : "Tell them about your wedding and what kind of ongoing support you're looking for.";

  return (
    <div className="min-h-screen bg-ivory">
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/find-planner"
          className="inline-flex items-center text-sm text-warm-gray hover:text-charcoal mb-8"
        >
          &larr; Back to Directory
        </Link>

        {/* Header */}
        <div className="bg-cream border border-stone rounded-lg p-6 md:p-8 mb-6">
          <h1 className="text-3xl font-heading font-semibold tracking-tight text-charcoal">{planner.display_name}</h1>
          {location && (
            <p className="text-warm-gray mt-1">{location}</p>
          )}

          {experience.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-4">
              {experience.map((stat) => (
                <span key={stat} className="text-sm text-warm-gray">{stat}</span>
              ))}
            </div>
          )}

          {planner.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {planner.specialties.map((specialty) => {
                const config = SPECIALTY_CONFIG[specialty];
                if (!config) return null;
                const colorClass = SPECIALTY_BADGE_COLORS[config.color] || 'bg-stone-lighter text-charcoal';
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
          <div className="bg-cream border border-stone rounded-lg p-6 md:p-8 mb-6">
            <h2 className="text-lg font-semibold text-charcoal mb-3">About</h2>
            <p className="text-warm-gray whitespace-pre-line">{planner.bio}</p>
          </div>
        )}

        {/* Rates & CTAs */}
        <div className="bg-cream border border-stone rounded-lg p-6 md:p-8">
          <h2 className="text-lg font-semibold text-charcoal mb-4">Services</h2>

          <div className="space-y-4">
            {weddingSetUp === false && (
              <div className="flex items-center gap-3 p-4 bg-stone-lighter border border-stone rounded-lg">
                <svg className="w-5 h-5 text-warm-gray shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-charcoal">Complete your wedding setup to request a planner</p>
                  <Link
                    href="/my-wedding/setup"
                    className="text-sm text-sage hover:text-sage-dark font-medium"
                  >
                    Go to Wedding Setup &rarr;
                  </Link>
                </div>
              </div>
            )}

            {planner.consultation_rate_cents != null && (
              <div className="flex items-center justify-between p-4 border border-stone rounded-lg">
                <div>
                  <p className="font-medium text-charcoal">One-Time Consultation</p>
                  <p className="text-sm text-warm-gray">{formatRate(planner.consultation_rate_cents)}/hr</p>
                </div>
                {existingConsultation ? (
                  <span className={`px-4 py-2 text-sm font-medium border rounded-md ${getEngagementStatusClasses(existingConsultation.status)}`}>
                    {getEngagementStatusLabel(existingConsultation)}
                  </span>
                ) : weddingSetUp ? (
                  <button
                    onClick={() => openModal('consultation')}
                    className="px-4 py-2 text-sm font-medium text-white bg-charcoal rounded-md hover:bg-charcoal transition-colors"
                  >
                    Book a Consultation
                  </button>
                ) : null}
              </div>
            )}

            {planner.subscription_rate_cents != null && (
              <div className="flex items-center justify-between p-4 border border-stone rounded-lg">
                <div>
                  <p className="font-medium text-charcoal">Ongoing Planning</p>
                  <p className="text-sm text-warm-gray">{formatRate(planner.subscription_rate_cents)}/mo</p>
                </div>
                {existingSubscription ? (
                  <span className={`px-4 py-2 text-sm font-medium border rounded-md ${getEngagementStatusClasses(existingSubscription.status)}`}>
                    {getEngagementStatusLabel(existingSubscription)}
                  </span>
                ) : weddingSetUp ? (
                  <button
                    onClick={() => openModal('subscription')}
                    className="px-4 py-2 text-sm font-medium text-white bg-charcoal rounded-md hover:bg-charcoal transition-colors"
                  >
                    Subscribe
                  </button>
                ) : null}
              </div>
            )}

            {planner.consultation_rate_cents == null && planner.subscription_rate_cents == null && (
              <p className="text-sm text-warm-gray-light">No rates listed yet.</p>
            )}
          </div>
        </div>
      </main>

      {/* Request Modal */}
      <Modal
        isOpen={modalType !== null}
        onClose={closeModal}
        title={modalType ? modalTitle : ''}
      >
        <div className="space-y-5">
          <p className="text-sm text-warm-gray">
            Rate: <span className="font-medium text-charcoal">{modalType ? modalRate : ''}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Tell {planner.display_name} about your wedding
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={messagePlaceholder}
              className="w-full px-3 py-2 border border-stone rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent resize-none"
            />
            {message.length > 0 && message.length < 20 && (
              <p className="text-xs text-rose mt-1">Please write at least 20 characters ({20 - message.length} more needed)</p>
            )}
          </div>

          {modalType === 'consultation' && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Preferred date & time
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 px-3 py-2 border border-stone rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
                />
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
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
          )}

          <div className="bg-champagne-light border border-champagne rounded-md p-3">
            <p className="text-sm text-champagne-dark">
              The planner will review your request and confirm the time. You&apos;ll be notified when they respond.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-charcoal bg-white border border-stone rounded-md hover:bg-stone-lighter transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || message.length < 20}
              className="px-4 py-2 text-sm font-medium text-white bg-charcoal rounded-md hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
