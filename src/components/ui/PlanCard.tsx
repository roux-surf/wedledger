'use client';

import Button from '@/components/ui/Button';
import { CoupleSubscriptionPlan, PLAN_CONFIG } from '@/lib/types';

interface PlanCardProps {
  plan: CoupleSubscriptionPlan;
  description: string;
  onSelect: (plan: CoupleSubscriptionPlan) => void;
  disabled?: boolean;
  selected?: boolean;
}

export default function PlanCard({ plan, description, onSelect, disabled, selected }: PlanCardProps) {
  const config = PLAN_CONFIG[plan];

  return (
    <div
      className={`border rounded-lg p-6 transition-colors ${
        selected
          ? 'border-slate-900 bg-slate-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <h3 className="text-lg font-semibold text-slate-900">{config.label}</h3>
      <p className="text-2xl font-bold text-slate-900 mt-2">${config.price}</p>
      <p className="text-sm text-slate-500 mt-1">{config.months} months of access</p>
      <p className="text-sm text-slate-600 mt-3">{description}</p>
      <Button
        className="w-full mt-4"
        variant={selected ? 'primary' : 'secondary'}
        onClick={() => onSelect(plan)}
        disabled={disabled}
      >
        Select Plan
      </Button>
    </div>
  );
}
