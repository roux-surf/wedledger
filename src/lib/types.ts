export interface Client {
  id: string;
  user_id: string;
  name: string;
  wedding_date: string;
  city: string;
  state: string;
  guest_count: number;
  total_budget: number;
  client_summary: string | null;
  client_summary_updated_at: string | null;
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

export type BookingStatus = 'none' | 'inquired' | 'booked' | 'contracted' | 'completed';

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  none: { label: 'None', color: 'text-slate-500', bg: 'bg-slate-100' },
  inquired: { label: 'Inquired', color: 'text-blue-700', bg: 'bg-blue-100' },
  booked: { label: 'Booked', color: 'text-amber-700', bg: 'bg-amber-100' },
  contracted: { label: 'Contracted', color: 'text-purple-700', bg: 'bg-purple-100' },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
};

export interface LineItem {
  id: string;
  category_id: string;
  vendor_name: string;
  estimated_cost: number;
  actual_cost: number;
  paid_to_date: number;
  notes: string | null;
  booking_status: BookingStatus;
  vendor_phone: string | null;
  vendor_email: string | null;
  sort_order: number;
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface CategoryWithSpend extends Category {
  actual_spend: number;
  estimated_total: number;
  total_paid: number;
  line_items?: LineItemWithPayments[];
}

export interface ClientWithBudgetStatus extends Client {
  total_spent: number;
  budget_status: 'green' | 'yellow' | 'red';
  milestones_total: number;
  milestones_completed: number;
}

export interface MarketplaceClient extends ClientWithBudgetStatus {
  engagement_type: EngagementType;
  couple_name: string;
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

// ============= USER PROFILES & SUBSCRIPTIONS =============

export type UserRole = 'planner' | 'couple';

export interface UserProfile {
  id: string;
  user_id: string;
  role: UserRole;
  display_name: string;
  email: string | null;
  created_at: string;
  onboarding_completed: boolean;
}

export type CoupleSubscriptionPlan = '12_month' | '18_month';

export type CoupleSubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface CoupleSubscription {
  id: string;
  user_id: string;
  plan_type: CoupleSubscriptionPlan;
  price_cents: number;
  status: CoupleSubscriptionStatus;
  starts_at: string;
  expires_at: string;
  stripe_subscription_id: string | null;
  created_at: string;
}

export const PLAN_CONFIG: Record<CoupleSubscriptionPlan, { label: string; price: number; priceCents: number; months: number }> = {
  '12_month': { label: '12 Months', price: 100, priceCents: 10000, months: 12 },
  '18_month': { label: '18 Months', price: 150, priceCents: 15000, months: 18 },
};

export function isSubscriptionActive(subscription: CoupleSubscription): boolean {
  return subscription.status === 'active' && new Date(subscription.expires_at) > new Date();
}

// ============= PLANNER PROFILES =============

export type PlannerSpecialty = 'luxury' | 'destination' | 'budget-friendly' | 'cultural' | 'outdoor' | 'intimate';

export interface PlannerProfile {
  id: string;
  user_id: string;
  bio: string | null;
  experience_years: number;
  specialties: PlannerSpecialty[];
  city: string | null;
  state: string | null;
  consultation_rate_cents: number | null;
  subscription_rate_cents: number | null;
  accepting_clients: boolean;
  weddings_completed: number;
  profile_published: boolean;
  created_at: string;
  updated_at: string;
}

export const SPECIALTY_CONFIG: Record<PlannerSpecialty, { label: string; color: string }> = {
  luxury: { label: 'Luxury', color: 'purple' },
  destination: { label: 'Destination', color: 'blue' },
  'budget-friendly': { label: 'Budget-Friendly', color: 'green' },
  cultural: { label: 'Cultural', color: 'coral' },
  outdoor: { label: 'Outdoor', color: 'teal' },
  intimate: { label: 'Intimate', color: 'pink' },
};

export function formatRate(cents: number): string {
  return `$${Math.floor(cents / 100)}`;
}

// ============= ENGAGEMENTS =============

export type EngagementType = 'consultation' | 'subscription';

export type EngagementStatus = 'pending' | 'accepted' | 'declined' | 'active' | 'completed' | 'cancelled';

export interface Engagement {
  id: string;
  planner_user_id: string;
  couple_user_id: string;
  client_id: string | null;
  type: EngagementType;
  status: EngagementStatus;
  rate_cents: number;
  message: string | null;
  planner_notes: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementWithDetails extends Engagement {
  planner_name: string;
  couple_name: string;
  planner_profile: PlannerProfile;
}

export interface EngagementUpdate {
  id: string;
  engagement_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
}
