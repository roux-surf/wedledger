'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/UserProfileContext';
import { useToast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import { US_STATES } from '@/lib/constants';
import {
  PlannerProfile,
  PlannerSpecialty,
  SPECIALTY_CONFIG,
  parseNumericInput,
  sanitizeNumericString,
} from '@/lib/types';

const SPECIALTY_COLORS: Record<string, { selected: string; unselected: string }> = {
  purple: { selected: 'bg-sage-light text-sage-dark border-sage', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  blue: { selected: 'bg-champagne-light text-champagne-dark border-champagne', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  green: { selected: 'bg-sage-light text-sage-dark border-sage', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  coral: { selected: 'bg-rose-light text-rose-dark border-rose', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  teal: { selected: 'bg-sage-light text-sage-dark border-sage', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
  pink: { selected: 'bg-rose-light text-rose-dark border-rose', unselected: 'bg-stone-lighter text-warm-gray border-stone' },
};

export default function PlannerProfilePage() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { profile, refetch: refetchProfile } = useUserProfile();
  const { showSaved, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const profileIdRef = useRef<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [weddingsCompleted, setWeddingsCompleted] = useState('');
  const [specialties, setSpecialties] = useState<PlannerSpecialty[]>([]);
  const [consultationRate, setConsultationRate] = useState('');
  const [subscriptionRate, setSubscriptionRate] = useState('');
  const [acceptingClients, setAcceptingClients] = useState(true);
  const [profilePublished, setProfilePublished] = useState(false);
  const [publishError, setPublishError] = useState('');

  const loadProfile = useCallback(async () => {
    if (!user || !profile) return;

    setDisplayName(profile.display_name);
    setFullName(user?.fullName || '');

    const { data } = await supabase
      .from('planner_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      const p = data as PlannerProfile;
      setProfileId(p.id);
      profileIdRef.current = p.id;
      setBio(p.bio || '');
      setCity(p.city || '');
      setState(p.state || '');
      setExperienceYears(p.experience_years > 0 ? String(p.experience_years) : '');
      setWeddingsCompleted(p.weddings_completed > 0 ? String(p.weddings_completed) : '');
      setSpecialties(p.specialties || []);
      setConsultationRate(p.consultation_rate_cents ? sanitizeNumericString(p.consultation_rate_cents / 100) : '');
      setSubscriptionRate(p.subscription_rate_cents ? sanitizeNumericString(p.subscription_rate_cents / 100) : '');
      setAcceptingClients(p.accepting_clients);
      setProfilePublished(p.profile_published);
    }

    setLoading(false);
  }, [user, profile, supabase]);

  useEffect(() => {
    if (profile?.role === 'planner') {
      loadProfile();
    }
  }, [profile, loadProfile]);

  // Save helper — upsert to avoid duplicate key errors from concurrent blur events
  const saveField = useCallback(async (fields: Record<string, unknown>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('planner_profiles')
      .upsert(
        { ...fields, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single();
    if (error) throw error;
    if (data && !profileIdRef.current) {
      profileIdRef.current = data.id;
      setProfileId(data.id);
    }
  }, [user, supabase]);

  const handleSaveField = useCallback(async (fields: Record<string, unknown>) => {
    try {
      await saveField(fields);
      showSaved();
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      console.error('Profile save error:', JSON.stringify(e), e?.message, e?.code, e?.details, e?.hint);
      showToast('Failed to save', 'error');
    }
  }, [saveField, showSaved, showToast]);

  // Display name saves to user_profiles, not planner_profiles
  const handleDisplayNameBlur = async () => {
    if (!user || !displayName.trim()) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ display_name: displayName.trim() })
        .eq('user_id', user.id);
      if (error) throw error;
      refetchProfile();
      showSaved();
    } catch {
      showToast('Failed to save', 'error');
    }
  };

  const handleBioBlur = () => handleSaveField({ bio: bio.trim() || null });
  const handleCityBlur = () => handleSaveField({ city: city.trim() || null });
  const handleStateBlur = () => handleSaveField({ state: state || null });

  const handleExperienceBlur = () => {
    const val = Math.max(0, Math.round(parseNumericInput(experienceYears)));
    setExperienceYears(val > 0 ? String(val) : '');
    handleSaveField({ experience_years: val });
  };

  const handleWeddingsBlur = () => {
    const val = Math.max(0, Math.round(parseNumericInput(weddingsCompleted)));
    setWeddingsCompleted(val > 0 ? String(val) : '');
    handleSaveField({ weddings_completed: val });
  };

  const handleConsultationRateBlur = () => {
    const dollars = Math.max(0, parseNumericInput(consultationRate));
    setConsultationRate(dollars > 0 ? sanitizeNumericString(dollars) : '');
    handleSaveField({ consultation_rate_cents: dollars > 0 ? Math.round(dollars * 100) : null });
  };

  const handleSubscriptionRateBlur = () => {
    const dollars = Math.max(0, parseNumericInput(subscriptionRate));
    setSubscriptionRate(dollars > 0 ? sanitizeNumericString(dollars) : '');
    handleSaveField({ subscription_rate_cents: dollars > 0 ? Math.round(dollars * 100) : null });
  };

  const toggleSpecialty = (specialty: PlannerSpecialty) => {
    let next: PlannerSpecialty[];
    if (specialties.includes(specialty)) {
      next = specialties.filter((s) => s !== specialty);
    } else {
      if (specialties.length >= 4) return;
      next = [...specialties, specialty];
    }
    setSpecialties(next);
    handleSaveField({ specialties: next });
  };

  const toggleAcceptingClients = () => {
    const next = !acceptingClients;
    setAcceptingClients(next);
    handleSaveField({ accepting_clients: next });
  };

  const canPublish = () => {
    return bio.trim().length > 0 && city.trim().length > 0 && state.length > 0 &&
      (parseNumericInput(consultationRate) > 0 || parseNumericInput(subscriptionRate) > 0);
  };

  const togglePublish = () => {
    const next = !profilePublished;
    if (next && !canPublish()) {
      setPublishError('Please fill in your bio, location, and at least one rate before publishing.');
      return;
    }
    setPublishError('');
    setProfilePublished(next);
    handleSaveField({ profile_published: next });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray-light">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-charcoal">My Profile</h1>
          <p className="text-lg text-warm-gray mt-2">
            Set up your public profile so couples can find and hire you.
          </p>
        </div>

        <div className="space-y-8">
          {/* Basic Info */}
          <section className="bg-cream border border-stone rounded-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-charcoal mb-1">Basic info</h2>
            <p className="text-sm text-warm-gray mb-6">
              Tell couples who you are and where you&apos;re based.
            </p>

            <div className="space-y-5">
              <Input
                id="full_name"
                label="Your name"
                value={fullName}
                disabled
                className="bg-stone-lighter text-warm-gray"
              />

              <div>
                <Input
                  id="display_name"
                  label="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={handleDisplayNameBlur}
                  placeholder="e.g., Elegant Events Co."
                />
                <p className="mt-1 text-xs text-warm-gray-light">
                  Put your business name here. This is what couples will see in the directory.
                </p>
              </div>

              <div className="w-full">
                <label htmlFor="bio" className="block text-sm font-medium text-charcoal mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setBio(e.target.value);
                  }}
                  onBlur={handleBioBlur}
                  placeholder="Tell couples about yourself, your approach to wedding planning, and what makes you unique."
                  rows={4}
                  className="w-full px-3 py-2 border border-stone rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage resize-none"
                />
                <p className="mt-1 text-xs text-warm-gray-light text-right">{bio.length}/500</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="city"
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={handleCityBlur}
                  placeholder="e.g., Austin"
                />

                <div className="w-full">
                  <label htmlFor="state" className="block text-sm font-medium text-charcoal mb-1">
                    State
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      handleSaveField({ state: e.target.value || null });
                    }}
                    className="w-full px-3 py-2 border border-stone rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
                  >
                    <option value="">Select state</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="experience_years"
                  label="Years of experience"
                  type="text"
                  inputMode="numeric"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  onBlur={handleExperienceBlur}
                  placeholder="e.g., 5"
                />

                <Input
                  id="weddings_completed"
                  label="Weddings completed"
                  type="text"
                  inputMode="numeric"
                  value={weddingsCompleted}
                  onChange={(e) => setWeddingsCompleted(e.target.value)}
                  onBlur={handleWeddingsBlur}
                  placeholder="e.g., 30"
                />
              </div>
            </div>
          </section>

          {/* Specialties */}
          <section className="bg-cream border border-stone rounded-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-charcoal mb-1">Specialties</h2>
            <p className="text-sm text-warm-gray mb-6">
              Select up to 4 specialties that describe your planning style.
            </p>

            <div className="flex flex-wrap gap-2">
              {(Object.entries(SPECIALTY_CONFIG) as [PlannerSpecialty, { label: string; color: string }][]).map(
                ([key, config]) => {
                  const isSelected = specialties.includes(key);
                  const colorSet = SPECIALTY_COLORS[config.color];
                  const atLimit = specialties.length >= 4 && !isSelected;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSpecialty(key)}
                      disabled={atLimit}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        isSelected ? colorSet.selected : colorSet.unselected
                      } ${atLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                    >
                      {config.label}
                    </button>
                  );
                }
              )}
            </div>
            {specialties.length >= 4 && (
              <p className="mt-3 text-xs text-warm-gray-light">Maximum of 4 specialties selected.</p>
            )}
          </section>

          {/* Rates */}
          <section className="bg-cream border border-stone rounded-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-charcoal mb-1">Rates</h2>
            <p className="text-sm text-warm-gray mb-6">
              Set your pricing. You can offer consultations, ongoing planning, or both.
            </p>

            <div className="space-y-5">
              <div>
                <Input
                  id="consultation_rate"
                  label="Consultation rate ($/hr)"
                  type="text"
                  inputMode="decimal"
                  value={consultationRate}
                  onChange={(e) => setConsultationRate(e.target.value)}
                  onBlur={handleConsultationRateBlur}
                  placeholder="e.g., 150"
                />
                <p className="mt-1 text-xs text-warm-gray-light">
                  One-time consultations with couples. Set your hourly rate.
                </p>
              </div>

              <div>
                <Input
                  id="subscription_rate"
                  label="Monthly planning rate ($/mo)"
                  type="text"
                  inputMode="decimal"
                  value={subscriptionRate}
                  onChange={(e) => setSubscriptionRate(e.target.value)}
                  onBlur={handleSubscriptionRateBlur}
                  placeholder="e.g., 500"
                />
                <p className="mt-1 text-xs text-warm-gray-light">
                  Ongoing planning support. Couples subscribe month-to-month.
                </p>
              </div>
            </div>
          </section>

          {/* Availability */}
          <section className="bg-cream border border-stone rounded-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-charcoal mb-1">Availability</h2>

            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-sm font-medium text-charcoal">Accepting new clients</p>
                <p className="text-xs text-warm-gray-light mt-0.5">
                  When turned off, your profile won&apos;t appear in the planner directory.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAcceptingClients}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  acceptingClients ? 'bg-sage' : 'bg-stone'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    acceptingClients ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Publish */}
          <section className="bg-cream border border-stone rounded-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-charcoal mb-1">Publish</h2>

            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-sm font-medium text-charcoal">Publish profile</p>
                {profilePublished ? (
                  <p className="text-xs text-sage-dark mt-0.5">
                    Your profile is visible to all WedLedger couples.
                  </p>
                ) : (
                  <p className="text-xs text-warm-gray-light mt-0.5">
                    Your profile is currently hidden from the directory.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={togglePublish}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  profilePublished ? 'bg-sage' : 'bg-stone'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    profilePublished ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {publishError && (
              <p className="mt-3 text-sm text-red-600">{publishError}</p>
            )}
            {!profilePublished && !publishError && (
              <p className="mt-3 text-xs text-warm-gray-light">
                Your profile will be visible to all WedLedger couples once published.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
