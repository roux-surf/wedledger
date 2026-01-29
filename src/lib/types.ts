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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
