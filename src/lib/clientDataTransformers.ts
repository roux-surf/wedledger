import { CategoryWithSpend, LineItemWithPayments } from './types';

// --- Chart data types ---

export interface CashFlowDataPoint {
  month: string;  // full label for tooltip (e.g. "Jan 2025")
  label: string;  // short label for axis (e.g. "Jan" or "Jan '25")
  paid: number;
  upcoming: number;
}

export interface CategoryAllocationDataPoint {
  name: string;
  value: number; // target_amount (allocation)
  spent: number;
}

export interface PaidVsRemainingData {
  totalBudget: number;
  totalCommitted: number;
  totalPaid: number;
  totalPending: number;
  uncommitted: number;
}

export interface ScheduledPayment {
  paymentId: string;
  vendorName: string;
  categoryName: string;
  label: string;
  amount: number;
  dueDate: string | null;
  status: 'pending' | 'paid';
  urgency: 'overdue' | 'this_week' | 'upcoming' | 'no_date';
}

// --- Helper ---

function getPaymentUrgencyLocal(dueDate: string | null): 'overdue' | 'this_week' | 'upcoming' | 'no_date' {
  if (!dueDate) return 'no_date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'this_week';
  return 'upcoming';
}

function formatMonthKey(dateString: string): string {
  const d = new Date(dateString + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/** Short label for chart axis: "Jan", "Feb", etc. Shows "'25" suffix on Jan or first entry. */
function formatMonthLabel(year: number, month: number, isFirst: boolean): string {
  const d = new Date(year, month - 1, 1);
  const short = d.toLocaleDateString('en-US', { month: 'short' });
  if (isFirst || month === 1) {
    return `${short} '${String(year).slice(2)}`;
  }
  return short;
}

// --- Transformers ---

/**
 * Groups all payments by month into paid + upcoming totals for a stacked bar chart.
 * Spans from the client creation month through the latest payment month, filling gaps.
 */
export function buildCashFlowData(categories: CategoryWithSpend[], clientCreatedAt: string): CashFlowDataPoint[] {
  const monthMap = new Map<string, { paid: number; upcoming: number }>();
  let maxSort: string | null = null;

  for (const cat of categories) {
    for (const li of cat.line_items || []) {
      for (const payment of li.payments) {
        const dateKey = payment.paid_date || payment.due_date;
        if (!dateKey) continue;

        const sortKey = dateKey.slice(0, 7); // YYYY-MM
        if (!maxSort || sortKey > maxSort) maxSort = sortKey;

        const month = formatMonthKey(dateKey);

        if (!monthMap.has(month)) {
          monthMap.set(month, { paid: 0, upcoming: 0 });
        }

        const entry = monthMap.get(month)!;
        if (payment.status === 'paid') {
          entry.paid += Number(payment.amount);
        } else {
          entry.upcoming += Number(payment.amount);
        }
      }
    }
  }

  // Start from client creation month; if no payments exist, show at least the current month
  const createdDate = new Date(clientCreatedAt);
  const minSort = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

  if (!maxSort) {
    // No payments at all — show from creation month through current month
    const now = new Date();
    maxSort = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  if (minSort > maxSort) maxSort = minSort;

  const result: CashFlowDataPoint[] = [];
  const [startYear, startMonth] = minSort.split('-').map(Number);
  const [endYear, endMonth] = maxSort.split('-').map(Number);

  let y = startYear;
  let m = startMonth;
  let isFirst = true;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const d = new Date(y, m - 1, 1);
    const fullLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const shortLabel = formatMonthLabel(y, m, isFirst);
    const existing = monthMap.get(fullLabel);
    result.push({
      month: fullLabel,
      label: shortLabel,
      paid: existing ? Math.round(existing.paid * 100) / 100 : 0,
      upcoming: existing ? Math.round(existing.upcoming * 100) / 100 : 0,
    });
    isFirst = false;
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return result;
}

/**
 * Maps categories to pie chart data showing allocation (target) and spent amounts.
 * Only includes categories with a non-zero target.
 */
export function buildCategoryAllocationData(categories: CategoryWithSpend[]): CategoryAllocationDataPoint[] {
  return categories
    .filter((cat) => Number(cat.target_amount) > 0)
    .map((cat) => ({
      name: cat.name,
      value: Number(cat.target_amount),
      spent: cat.actual_spend,
    }));
}

/**
 * Computes overall financial position: paid, pending, uncommitted.
 * - totalCommitted = sum of all actual_cost across all line items
 * - totalPaid = sum of all paid payments
 * - totalPending = totalCommitted - totalPaid
 * - uncommitted = totalBudget - totalCommitted
 */
export function buildPaidVsRemainingData(
  categories: CategoryWithSpend[],
  totalBudget: number
): PaidVsRemainingData {
  let totalCommitted = 0;
  let totalPaid = 0;

  for (const cat of categories) {
    for (const li of (cat.line_items || []) as LineItemWithPayments[]) {
      totalCommitted += Number(li.actual_cost) || 0;
      totalPaid += li.total_paid || 0;
    }
  }

  const totalPending = Math.max(0, totalCommitted - totalPaid);
  const uncommitted = Math.max(0, totalBudget - totalCommitted);

  return {
    totalBudget,
    totalCommitted: Math.round(totalCommitted * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    uncommitted: Math.round(uncommitted * 100) / 100,
  };
}

/**
 * Flattens all pending payments into a sorted list with vendor/category context.
 * Sorted by: overdue first, then by due_date ascending, then no-date last.
 */
export function buildPaymentScheduleData(categories: CategoryWithSpend[]): ScheduledPayment[] {
  const payments: ScheduledPayment[] = [];

  for (const cat of categories) {
    for (const li of (cat.line_items || []) as LineItemWithPayments[]) {
      for (const payment of li.payments) {
        if (payment.status === 'paid') continue;

        payments.push({
          paymentId: payment.id,
          vendorName: li.vendor_name,
          categoryName: cat.name,
          label: payment.label,
          amount: Number(payment.amount),
          dueDate: payment.due_date,
          status: payment.status,
          urgency: getPaymentUrgencyLocal(payment.due_date),
        });
      }
    }
  }

  const urgencyOrder: Record<string, number> = {
    overdue: 0,
    this_week: 1,
    upcoming: 2,
    no_date: 3,
  };

  return payments.sort((a, b) => {
    const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgDiff !== 0) return urgDiff;

    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

// Color palette for category pie chart
export const CATEGORY_COLORS = [
  '#34d399', // emerald-400
  '#60a5fa', // blue-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#facc15', // yellow-400
  '#2dd4bf', // teal-400
  '#c084fc', // purple-400
  '#f87171', // red-400
  '#38bdf8', // sky-400
  '#4ade80', // green-400
  '#818cf8', // indigo-400
];
