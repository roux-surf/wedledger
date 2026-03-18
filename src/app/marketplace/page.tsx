'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketplacePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/planner/profile');
  }, [router]);

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center">
      <p className="text-warm-gray-light">Redirecting...</p>
    </div>
  );
}
