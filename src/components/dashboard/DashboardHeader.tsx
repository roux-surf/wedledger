'use client';

import { UserButton } from '@clerk/nextjs';

export default function DashboardHeader() {
  return (
    <header className="bg-cream border-b border-stone">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-charcoal">WedLedger</h1>
        <UserButton />
      </div>
    </header>
  );
}
