'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { UserProfile, CoupleSubscription } from '@/lib/types';

interface UserProfileContextValue {
  profile: UserProfile | null;
  subscription: CoupleSubscription | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile: null,
  subscription: null,
  loading: true,
  refetch: async () => {},
});

export function useUserProfile() {
  return useContext(UserProfileContext);
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<CoupleSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoaded: isClerkLoaded } = useUser();
  const supabase = useSupabaseClient();

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setSubscription(null);
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
    } catch {
      setProfile(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (isClerkLoaded) {
      fetchProfile();
    }
  }, [isClerkLoaded, fetchProfile]);

  return (
    <UserProfileContext.Provider value={{ profile, subscription, loading, refetch: fetchProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}
