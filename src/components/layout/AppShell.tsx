'use client';

import { useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useUserProfile } from '@/lib/UserProfileContext';
import AppNav from '@/components/layout/AppNav';

const PUBLIC_PATHS = ['/onboarding', '/sign-in', '/sign-up'];

export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, loading } = useUserProfile();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isAuthLoaded || loading) return;
    if (!isSignedIn || isPublicPath) return;

    if (!profile) {
      router.replace('/onboarding');
    }
  }, [isAuthLoaded, isSignedIn, loading, profile, isPublicPath, router]);

  // On public pages, skip the nav shell
  if (isPublicPath) {
    return <>{children}</>;
  }

  // While loading, show a minimal loading state
  if (!isAuthLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  // Not signed in — let Clerk middleware handle redirect
  if (!isSignedIn) {
    return <>{children}</>;
  }

  // No profile — redirect is happening via useEffect
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
