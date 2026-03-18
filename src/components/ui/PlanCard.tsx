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
          ? 'border-sage bg-stone-lighter'
          : 'border-stone bg-white hover:border-warm-gray-light'
      }`}
    >
      <h3 className="text-lg font-semibold text-charcoal">{config.label}</h3>
      <p className="text-2xl font-bold text-charcoal mt-2">${config.price}</p>
      <p className="text-sm text-warm-gray mt-1">{config.months} months of access</p>
      <p className="text-sm text-warm-gray mt-3">{description}</p>
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
