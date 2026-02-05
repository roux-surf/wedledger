'use client';

import { UserButton } from '@clerk/nextjs';

export default function DashboardHeader() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">WedLedger</h1>
        <UserButton />
      </div>
    </header>
  );
}
