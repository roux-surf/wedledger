import { SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/lib/types';

export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function requireUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile> {
  const profile = await getUserProfile(supabase, userId);
  if (!profile) {
    throw new Error('User profile not found');
  }
  return profile;
}

export async function requireRole(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole
): Promise<UserProfile> {
  const profile = await requireUserProfile(supabase, userId);
  if (profile.role !== role) {
    throw new Error(`Expected role "${role}" but found "${profile.role}"`);
  }
  return profile;
}
