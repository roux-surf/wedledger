import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildCashFlowData,
  buildPaidVsRemainingData,
  buildPaymentScheduleData,
} from '../clientDataTransformers';
import type { CategoryWithSpend, LineItemWithPayments, Payment } from '../types';

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    line_item_id: 'li-1',
    label: 'Deposit',
    amount: 1000,
    due_date: '2025-06-01',
    status: 'pending',
    paid_date: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeLineItem(overrides: Partial<LineItemWithPayments> = {}): LineItemWithPayments {
  return {
    id: 'li-1',
    category_id: 'cat-1',
    vendor_name: 'Test Vendor',
    estimated_cost: 5000,
    actual_cost: 5000,
    paid_to_date: 0,
    notes: null,
    booking_status: 'booked',
    vendor_phone: null,
    vendor_email: null,
    sort_order: 0,
    created_at: '2025-01-01T00:00:00Z',
    payments: [],
    total_paid: 0,
    total_scheduled: 0,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<CategoryWithSpend> = {}): CategoryWithSpend {
  return {
    id: 'cat-1',
    budget_id: 'budget-1',
    name: 'Venue',
    target_amount: 10000,
    sort_order: 0,
    created_at: '2025-01-01T00:00:00Z',
    actual_spend: 5000,
    line_items: [],
    ...overrides,
  };
}

describe('buildCashFlowData', () => {
  it('returns gap-filled data for empty categories', () => {
    const result = buildCashFlowData([], '2025-01-15T00:00:00Z');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((dp) => {
      expect(dp.paid).toBe(0);
      expect(dp.upcoming).toBe(0);
    });
  });

  it('separates paid and pending payments', () => {
    const categories: CategoryWithSpend[] = [
      makeCategory({
        line_items: [
          makeLineItem({
            payments: [
              makePayment({ id: 'p1', amount: 1000, due_date: '2025-03-15', status: 'paid', paid_date: '2025-03-15' }),
              makePayment({ id: 'p2', amount: 2000, due_date: '2025-03-20', status: 'pending' }),
            ],
          }),
        ],
      }),
    ];

    const result = buildCashFlowData(categories, '2025-01-01T00:00:00Z');
    const marchEntry = result.find((dp) => dp.month.includes('Mar'));
    expect(marchEntry).toBeDefined();
    expect(marchEntry!.paid).toBe(1000);
    expect(marchEntry!.upcoming).toBe(2000);
  });

  it('fills gaps between start and end months', () => {
    const categories: CategoryWithSpend[] = [
      makeCategory({
        line_items: [
          makeLineItem({
            payments: [
              makePayment({ id: 'p1', amount: 500, due_date: '2025-06-01', status: 'pending' }),
            ],
          }),
        ],
      }),
    ];

    const result = buildCashFlowData(categories, '2025-01-01T00:00:00Z');
    // Should span from Jan 2025 to at least Jun 2025
    expect(result.length).toBeGreaterThanOrEqual(6);
  });
});

describe('buildPaidVsRemainingData', () => {
  it('computes financial position correctly', () => {
    const categories: CategoryWithSpend[] = [
      makeCategory({
        line_items: [
          makeLineItem({ actual_cost: 5000, total_paid: 2000 }),
          makeLineItem({ id: 'li-2', actual_cost: 3000, total_paid: 1000 }),
        ],
      }),
    ];

    const result = buildPaidVsRemainingData(categories, 20000);
    expect(result.totalBudget).toBe(20000);
    expect(result.totalCommitted).toBe(8000);
    expect(result.totalPaid).toBe(3000);
    expect(result.totalPending).toBe(5000);
    expect(result.uncommitted).toBe(12000);
  });

  it('floors uncommitted at 0 when over budget', () => {
    const categories: CategoryWithSpend[] = [
      makeCategory({
        line_items: [
          makeLineItem({ actual_cost: 15000, total_paid: 10000 }),
        ],
      }),
    ];

    const result = buildPaidVsRemainingData(categories, 10000);
    expect(result.uncommitted).toBe(0);
  });

  it('handles empty categories', () => {
    const result = buildPaidVsRemainingData([], 50000);
    expect(result.totalCommitted).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.totalPending).toBe(0);
    expect(result.uncommitted).toBe(50000);
  });
});

describe('buildPaymentScheduleData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('excludes paid payments', () => {
    const categories: CategoryWithSpend[] = [
      makeCategory({
        line_items: [
          makeLineItem({
            payments: [
              makePayment({ id: 'p1', status: 'paid', paid_date: '2025-05-01' }),
              makePayment({ id: 'p2', status: 'pending', due_date: '2025-07-01' }),
            ],
          }),
        ],
      }),
    ];

    const result = buildPaymentScheduleData(categories);
    expect(result).toHaveLength(1);
    expect(result[0].paymentId).toBe('p2');
  });

  it('sorts by urgency: overdue > this_week > upcoming > no_date', () => {
    const categories: CategoryWithSpend[] = [
      makeCategory({
        line_items: [
          makeLineItem({
            payments: [
              makePayment({ id: 'p-upcoming', due_date: '2025-07-01', status: 'pending' }),
              makePayment({ id: 'p-overdue', due_date: '2025-06-10', status: 'pending' }),
              makePayment({ id: 'p-no-date', due_date: null, status: 'pending' }),
              makePayment({ id: 'p-this-week', due_date: '2025-06-18', status: 'pending' }),
            ],
          }),
        ],
      }),
    ];

    const result = buildPaymentScheduleData(categories);
    expect(result.map((p) => p.paymentId)).toEqual([
      'p-overdue',
      'p-this-week',
      'p-upcoming',
      'p-no-date',
    ]);
  });

  it('returns empty array when no pending payments', () => {
    const categories: CategoryWithSpend[] = [
      makeCategory({
        line_items: [
          makeLineItem({
            payments: [
              makePayment({ status: 'paid', paid_date: '2025-05-01' }),
            ],
          }),
        ],
      }),
    ];

    const result = buildPaymentScheduleData(categories);
    expect(result).toHaveLength(0);
  });
});
