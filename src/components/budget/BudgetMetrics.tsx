'use client';

import { AllocationStatus, formatCurrency, formatPercent, parseNumericInput, sanitizeNumericString } from '@/lib/types';

interface BudgetMetricsProps {
  totalBudget: number;
  totalTarget: number;
  totalSpent: number;
  remaining: number;
  totalAllocationPercent: number;
  allocationStatus: AllocationStatus;
  spentLabel?: string;
  // Budget editing props (from useBudgetEditing hook)
  isEditingBudget: boolean;
  budgetValue: string;
  setBudgetValue: (v: string) => void;
  budgetUpdateError: string | null;
  budgetInputRef: React.RefObject<HTMLInputElement | null>;
  onBudgetEdit: () => void;
  onBudgetKeyDown: (e: React.KeyboardEvent) => void;
  onBudgetBlur: (rawValue: string) => void;
  readOnly?: boolean;
}

function BudgetEditInput({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onBlur,
  error,
  widthClass,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: (rawValue: string) => void;
  error: string | null;
  widthClass: string;
}) {
  return (
    <div className="mt-1">
      <div className="flex items-center gap-1">
        <span className="text-warm-gray text-xl font-bold">$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            const parsed = parseNumericInput(e.target.value);
            onChange(sanitizeNumericString(Math.max(0, parsed)));
            onBlur(e.target.value);
          }}
          className={`${widthClass} px-2 py-1 border border-stone rounded text-xl font-bold`}
        />
      </div>
      {error && <p className="text-rose text-xs mt-1">{error}</p>}
    </div>
  );
}

function BudgetDisplay({
  totalBudget,
  readOnly,
  onClick,
}: {
  totalBudget: number;
  readOnly: boolean;
  onClick: () => void;
}) {
  return (
    <p
      onClick={readOnly ? undefined : onClick}
      className={`text-xl font-bold text-charcoal mt-1 ${readOnly ? '' : 'cursor-pointer hover:bg-ivory'} px-1 -mx-1 rounded`}
    >
      {formatCurrency(totalBudget)}
    </p>
  );
}

function AllocationTile({
  totalTarget,
  totalAllocationPercent,
  allocationStatus,
}: {
  totalTarget: number;
  totalAllocationPercent: number;
  allocationStatus: AllocationStatus;
}) {
  return (
    <div className="bg-cream p-4">
      <p className="text-xs text-warm-gray uppercase tracking-wider">Allocated</p>
      <p className="text-xl font-bold text-charcoal mt-1">
        {formatCurrency(totalTarget)}
        <span className="text-sm font-normal text-warm-gray-light ml-1.5">{formatPercent(totalAllocationPercent)}</span>
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className={`w-1.5 h-1.5 rounded-full ${allocationStatus.dot}`} />
        <span className={`text-xs ${allocationStatus.color}`}>{allocationStatus.label}</span>
      </div>
    </div>
  );
}

export default function BudgetMetrics({
  totalBudget,
  totalTarget,
  totalSpent,
  remaining,
  totalAllocationPercent,
  allocationStatus,
  spentLabel = 'Total Spent',
  isEditingBudget,
  budgetValue,
  setBudgetValue,
  budgetUpdateError,
  budgetInputRef,
  onBudgetEdit,
  onBudgetKeyDown,
  onBudgetBlur,
  readOnly = false,
}: BudgetMetricsProps) {
  const budgetTile = (widthClass: string) => (
    <div className="bg-cream p-4">
      <p className="text-xs text-warm-gray uppercase tracking-wider">Total Budget</p>
      {isEditingBudget && !readOnly ? (
        <BudgetEditInput
          inputRef={budgetInputRef}
          value={budgetValue}
          onChange={setBudgetValue}
          onKeyDown={onBudgetKeyDown}
          onBlur={onBudgetBlur}
          error={budgetUpdateError}
          widthClass={widthClass}
        />
      ) : (
        <BudgetDisplay totalBudget={totalBudget} readOnly={readOnly} onClick={onBudgetEdit} />
      )}
    </div>
  );

  const spentTile = (
    <div className="bg-cream p-4">
      <p className="text-xs text-warm-gray uppercase tracking-wider">{spentLabel}</p>
      <p className="text-xl font-bold text-charcoal mt-1">{formatCurrency(totalSpent)}</p>
    </div>
  );

  const remainingTile = (
    <div className="bg-cream p-4">
      <p className="text-xs text-warm-gray uppercase tracking-wider">Remaining</p>
      <p className={`text-xl font-bold mt-1 ${remaining >= 0 ? 'text-sage' : 'text-rose'}`}>
        {remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(remaining))}
      </p>
    </div>
  );

  return (
    <div className="mt-6">
      {/* Mobile: 2x2 grid */}
      <div className="md:hidden bg-stone-lighter rounded-lg overflow-hidden grid grid-cols-2 gap-px">
        {budgetTile('w-28')}
        <AllocationTile
          totalTarget={totalTarget}
          totalAllocationPercent={totalAllocationPercent}
          allocationStatus={allocationStatus}
        />
        {spentTile}
        {remainingTile}
      </div>
      {/* Desktop: 4-column row */}
      <div className="hidden md:grid grid-cols-4 gap-px bg-stone-lighter rounded-lg overflow-hidden">
        {budgetTile('w-32')}
        <AllocationTile
          totalTarget={totalTarget}
          totalAllocationPercent={totalAllocationPercent}
          allocationStatus={allocationStatus}
        />
        {spentTile}
        {remainingTile}
      </div>
    </div>
  );
}
