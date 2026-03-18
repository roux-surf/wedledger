import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/userProfile';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (userId) {
    const supabase = await createClient();
    const profile = await getUserProfile(supabase, userId);

    if (profile?.onboarding_completed) {
      if (profile.role === 'couple') {
        redirect('/my-wedding');
      } else {
        redirect('/dashboard');
      }
    }
  }

  return <>{children}</>;
}
