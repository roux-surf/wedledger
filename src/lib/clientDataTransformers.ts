import { CategoryWithSpend, LineItemWithPayments, Payment } from './types';

// --- Chart data types ---

export interface CashFlowDataPoint {
  month: string;
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

// --- Transformers ---

/**
 * Groups all payments by month into paid + upcoming totals for a stacked bar chart.
 */
export function buildCashFlowData(categories: CategoryWithSpend[]): CashFlowDataPoint[] {
  const monthMap = new Map<string, { paid: number; upcoming: number; sortKey: string }>();

  for (const cat of categories) {
    for (const li of cat.line_items || []) {
      for (const payment of li.payments) {
        const dateKey = payment.paid_date || payment.due_date;
        if (!dateKey) continue;

        const month = formatMonthKey(dateKey);
        const sortKey = dateKey.slice(0, 7); // YYYY-MM for sorting

        if (!monthMap.has(month)) {
          monthMap.set(month, { paid: 0, upcoming: 0, sortKey });
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

  return Array.from(monthMap.entries())
    .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey))
    .map(([month, data]) => ({
      month,
      paid: Math.round(data.paid * 100) / 100,
      upcoming: Math.round(data.upcoming * 100) / 100,
    }));
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
