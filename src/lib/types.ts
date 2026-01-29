export interface Client {
  id: string;
  user_id: string;
  name: string;
  wedding_date: string;
  city: string;
  state: string;
  guest_count: number;
  total_budget: number;
  created_at: string;
}

export interface Budget {
  id: string;
  client_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  budget_id: string;
  name: string;
  target_amount: number;
  sort_order: number;
  created_at: string;
}

export interface LineItem {
  id: string;
  category_id: string;
  vendor_name: string;
  estimated_cost: number;
  actual_cost: number;
  paid_to_date: number;
  notes: string | null;
  created_at: string;
}

export interface CategoryWithSpend extends Category {
  actual_spend: number;
  line_items?: LineItem[];
}

export interface ClientWithBudgetStatus extends Client {
  total_spent: number;
  budget_status: 'green' | 'yellow' | 'red';
}

export type BudgetStatus = 'green' | 'yellow' | 'red';

export function getBudgetStatus(totalBudget: number, totalSpent: number): BudgetStatus {
  if (totalBudget <= 0) return 'green';
  const ratio = totalSpent / totalBudget;
  if (ratio > 1) return 'red';
  if (ratio >= 0.9) return 'yellow';
  return 'green';
}

export function formatCurrency(amount: number): string {
  // Round to avoid floating-point artifacts
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}

export function formatPercent(value: number): string {
  // Round to max 1 decimal place, remove trailing zero
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function parseNumericInput(value: string): number {
  // Remove any non-numeric characters except decimal point and minus
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  // Round to 2 decimal places to prevent floating-point artifacts
  return Math.round(parsed * 100) / 100;
}

export function sanitizeNumericString(value: number): string {
  // Convert number to string without scientific notation or floating-point artifacts
  const rounded = Math.round(value * 100) / 100;
  return rounded.toString();
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
