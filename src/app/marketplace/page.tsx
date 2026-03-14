'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketplacePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/planner/profile');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">Redirecting...</p>
    </div>
  );
}
