import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  parseNumericInput,
  sanitizeNumericString,
  getBudgetStatus,
  getPaymentUrgency,
  getMilestoneUrgency,
  formatShortDate,
  formatDate,
} from '../types';

describe('formatCurrency', () => {
  it('formats a positive whole number', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats a large number with commas', () => {
    expect(formatCurrency(1500000)).toBe('$1,500,000');
  });

  it('formats a negative number', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('rounds decimals to nearest dollar', () => {
    expect(formatCurrency(99.99)).toBe('$100');
    expect(formatCurrency(99.49)).toBe('$99');
  });

  it('handles floating-point artifacts', () => {
    // 0.1 + 0.2 === 0.30000000000000004
    expect(formatCurrency(0.1 + 0.2)).toBe('$0');
  });
});

describe('formatPercent', () => {
  it('formats a whole number without decimal', () => {
    expect(formatPercent(50)).toBe('50%');
  });

  it('formats a decimal value with one decimal place', () => {
    expect(formatPercent(33.33)).toBe('33.3%');
  });

  it('removes trailing zero from .0', () => {
    expect(formatPercent(100.0)).toBe('100%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('rounds to 1 decimal place', () => {
    expect(formatPercent(66.67)).toBe('66.7%');
  });
});

describe('parseNumericInput', () => {
  it('parses a clean number', () => {
    expect(parseNumericInput('1234')).toBe(1234);
  });

  it('strips currency symbols', () => {
    expect(parseNumericInput('$1,234.56')).toBe(1234.56);
  });

  it('returns 0 for empty string', () => {
    expect(parseNumericInput('')).toBe(0);
  });

  it('returns 0 for garbage input', () => {
    expect(parseNumericInput('abc')).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(parseNumericInput('-500')).toBe(-500);
  });

  it('rounds to 2 decimal places', () => {
    expect(parseNumericInput('10.999')).toBe(11);
  });

  it('handles decimal only', () => {
    expect(parseNumericInput('.50')).toBe(0.5);
  });
});

describe('sanitizeNumericString', () => {
  it('converts a round number to string', () => {
    expect(sanitizeNumericString(100)).toBe('100');
  });

  it('rounds floating-point artifacts', () => {
    expect(sanitizeNumericString(0.1 + 0.2)).toBe('0.3');
  });

  it('handles zero', () => {
    expect(sanitizeNumericString(0)).toBe('0');
  });

  it('rounds to 2 decimal places', () => {
    expect(sanitizeNumericString(10.999)).toBe('11');
  });
});

describe('getBudgetStatus', () => {
  it('returns green when budget is zero', () => {
    expect(getBudgetStatus(0, 0)).toBe('green');
  });

  it('returns green when spending is below 90%', () => {
    expect(getBudgetStatus(10000, 8999)).toBe('green');
  });

  it('returns yellow at exactly 90%', () => {
    expect(getBudgetStatus(10000, 9000)).toBe('yellow');
  });

  it('returns yellow at 99%', () => {
    expect(getBudgetStatus(10000, 9999)).toBe('yellow');
  });

  it('returns yellow at exactly 100%', () => {
    expect(getBudgetStatus(10000, 10000)).toBe('yellow');
  });

  it('returns red when over 100%', () => {
    expect(getBudgetStatus(10000, 10001)).toBe('red');
  });
});

describe('getPaymentUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns overdue for past dates', () => {
    expect(getPaymentUrgency('2025-06-14')).toBe('overdue');
  });

  it('returns this_week for today', () => {
    expect(getPaymentUrgency('2025-06-15')).toBe('this_week');
  });

  it('returns this_week for 7 days from now', () => {
    expect(getPaymentUrgency('2025-06-22')).toBe('this_week');
  });

  it('returns upcoming for 8 days from now', () => {
    expect(getPaymentUrgency('2025-06-23')).toBe('upcoming');
  });
});

describe('getMilestoneUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns overdue for past dates', () => {
    expect(getMilestoneUrgency('2025-06-14')).toBe('overdue');
  });

  it('returns this_week for today', () => {
    expect(getMilestoneUrgency('2025-06-15')).toBe('this_week');
  });

  it('returns this_week for 7 days from now', () => {
    expect(getMilestoneUrgency('2025-06-22')).toBe('this_week');
  });

  it('returns upcoming for dates beyond 7 days', () => {
    expect(getMilestoneUrgency('2025-06-23')).toBe('upcoming');
  });
});

describe('formatShortDate', () => {
  it('formats a date string to short format', () => {
    const result = formatShortDate('2025-06-15');
    expect(result).toBe('Jun 15');
  });

  it('formats a January date', () => {
    const result = formatShortDate('2025-01-01');
    expect(result).toBe('Jan 1');
  });
});

describe('formatDate', () => {
  it('formats a date string to long format', () => {
    const result = formatDate('2025-06-15');
    // formatDate uses new Date(dateString) without T00:00:00 so behavior
    // may vary by timezone. Just check it contains expected parts.
    expect(result).toContain('June');
    expect(result).toContain('2025');
  });
});
