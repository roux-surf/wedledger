'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { UserProfile, CoupleSubscription } from '@/lib/types';

interface UserProfileContextValue {
  profile: UserProfile | null;
  subscription: CoupleSubscription | null;
  loading: boolean;
  pendingEngagementCount: number;
  refetch: () => Promise<void>;
  refetchPendingCount: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile: null,
  subscription: null,
  loading: true,
  pendingEngagementCount: 0,
  refetch: async () => {},
  refetchPendingCount: () => {},
});

export function useUserProfile() {
  return useContext(UserProfileContext);
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<CoupleSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEngagementCount, setPendingEngagementCount] = useState(0);
  const { user, isLoaded: isClerkLoaded } = useUser();
  const supabase = useSupabaseClient();

  const fetchPendingCount = useCallback(async (userId: string, role: string) => {
    if (role !== 'planner') {
      setPendingEngagementCount(0);
      return;
    }

    const { count } = await supabase
      .from('engagements')
      .select('*', { count: 'exact', head: true })
      .eq('planner_user_id', userId)
      .eq('status', 'pending');

    setPendingEngagementCount(count ?? 0);
  }, [supabase]);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setSubscription(null);
      setPendingEngagementCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData as UserProfile | null);

      if (profileData?.role === 'couple') {
        const { data: subData } = await supabase
          .from('couple_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        setSubscription(subData as CoupleSubscription | null);
      }

      if (profileData?.role === 'planner') {
        await fetchPendingCount(user.id, 'planner');
      }
    } catch {
      setProfile(null);
      setSubscription(null);
      setPendingEngagementCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, fetchPendingCount]);

  const refetchPendingCount = useCallback(() => {
    if (user && profile?.role === 'planner') {
      fetchPendingCount(user.id, 'planner');
    }
  }, [user, profile, fetchPendingCount]);

  useEffect(() => {
    if (isClerkLoaded) {
      fetchProfile();
    }
  }, [isClerkLoaded, fetchProfile]);

  return (
    <UserProfileContext.Provider value={{
      profile,
      subscription,
      loading,
      pendingEngagementCount,
      refetch: fetchProfile,
      refetchPendingCount,
    }}>
      {children}
    </UserProfileContext.Provider>
  );
}
