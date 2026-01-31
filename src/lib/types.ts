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
  template_id?: string | null;
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

export type PaymentStatus = 'pending' | 'paid';

export interface Payment {
  id: string;
  line_item_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  status: PaymentStatus;
  paid_date: string | null;
  created_at: string;
}

export interface LineItemWithPayments extends LineItem {
  payments: Payment[];
  total_paid: number;
  total_scheduled: number;
}

export interface PaymentAlert {
  payment_id: string;
  vendor_name: string;
  client_id: string;
  client_name: string;
  category_name: string;
  label: string;
  amount: number;
  due_date: string;
  urgency: 'overdue' | 'this_week' | 'upcoming';
}

export function getPaymentUrgency(dueDate: string): 'overdue' | 'this_week' | 'upcoming' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'this_week';
  return 'upcoming';
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface CategoryWithSpend extends Category {
  actual_spend: number;
  line_items?: LineItemWithPayments[];
}

export interface ClientWithBudgetStatus extends Client {
  total_spent: number;
  budget_status: 'green' | 'yellow' | 'red';
  milestones_total: number;
  milestones_completed: number;
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

// =============================================
// MILESTONES
// =============================================

export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed';

export interface Milestone {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  months_before: number;
  target_date: string;
  status: MilestoneStatus;
  category_id: string | null;
  sort_order: number;
  is_custom: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface MilestoneWithBudget extends Milestone {
  category_name?: string;
  category_target?: number;
  category_spent?: number;
}

export interface MilestoneAlert {
  milestone_id: string;
  title: string;
  client_id: string;
  client_name: string;
  target_date: string;
  status: MilestoneStatus;
  urgency: 'overdue' | 'this_week' | 'upcoming';
}

export function getMilestoneUrgency(targetDate: string): 'overdue' | 'this_week' | 'upcoming' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'this_week';
  return 'upcoming';
}

export interface MilestoneTemplateItem {
  title: string;
  description: string | null;
  months_before: number;
  category_name: string | null;
  sort_order: number;
}

export interface MilestoneTemplate {
  id: string;
  user_id: string;
  name: string;
  base_level_id: string | null;
  milestones: MilestoneTemplateItem[];
  created_at: string;
}
