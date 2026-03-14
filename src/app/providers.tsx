'use client';

import { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { UserProfileProvider } from '@/lib/UserProfileContext';
import AppShell from '@/components/layout/AppShell';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      <UserProfileProvider>
        <AppShell>{children}</AppShell>
      </UserProfileProvider>
    </ToastProvider>
  );
}
