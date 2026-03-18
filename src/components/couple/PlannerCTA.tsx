'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';

const DISMISS_KEY = 'wedledger_planner_cta_dismissed';

interface PlannerCTAProps {
  profileCreatedAt: string;
}

export default function PlannerCTA({ profileCreatedAt }: PlannerCTAProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  // Only show after 7 days on the platform
  const created = new Date(profileCreatedAt);
  const now = new Date();
  const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  if (dismissed || daysSinceCreation < 7) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-rose-light border border-stone rounded-lg p-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-warm-gray-light hover:text-warm-gray text-lg leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>
      <h3 className="text-base font-semibold text-charcoal">Feeling overwhelmed?</h3>
      <p className="text-sm text-warm-gray mt-2 max-w-lg">
        WedLedger can match you with an experienced wedding planner who can help with exactly
        what you need — from a quick consultation to ongoing support.
      </p>
      <div className="mt-4 relative group inline-block">
        <Button variant="secondary" disabled>
          Browse Planners
        </Button>
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-xs bg-charcoal text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Coming soon
        </span>
      </div>
    </div>
  );
}
