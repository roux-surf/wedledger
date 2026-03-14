import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/userProfile';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = await createClient();
  const profile = await getUserProfile(supabase, userId);

  if (!profile) {
    redirect('/onboarding');
  }

  redirect('/dashboard');
}
