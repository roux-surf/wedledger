import { describe, it, expect } from 'vitest';
import {
  getDefaultMilestonesForLevel,
  calculateTargetDate,
  getMonthsBetween,
  getGanttPosition,
  formatRelativeMonths,
} from '../milestoneTemplates';

describe('getDefaultMilestonesForLevel', () => {
  it('returns core milestones for diy level', () => {
    const milestones = getDefaultMilestonesForLevel('diy');
    expect(milestones.length).toBeGreaterThan(0);
    milestones.forEach((m) => {
      expect(m.minLevel).toBe('diy');
    });
  });

  it('includes more milestones at higher levels', () => {
    const diy = getDefaultMilestonesForLevel('diy');
    const lovely = getDefaultMilestonesForLevel('lovely');
    const luxury = getDefaultMilestonesForLevel('luxury');
    const superLuxury = getDefaultMilestonesForLevel('super_luxury');
    const ultraLuxury = getDefaultMilestonesForLevel('ultra_luxury');

    expect(lovely.length).toBeGreaterThanOrEqual(diy.length);
    expect(luxury.length).toBeGreaterThanOrEqual(lovely.length);
    expect(superLuxury.length).toBeGreaterThanOrEqual(luxury.length);
    expect(ultraLuxury.length).toBeGreaterThanOrEqual(superLuxury.length);
  });

  it('assigns sequential sort orders', () => {
    const milestones = getDefaultMilestonesForLevel('luxury');
    milestones.forEach((m, i) => {
      expect((m as unknown as { sortOrder: number }).sortOrder).toBe(i);
    });
  });
});

describe('calculateTargetDate', () => {
  it('subtracts whole months', () => {
    expect(calculateTargetDate('2025-12-20', 3)).toBe('2025-09-20');
  });

  it('handles fractional months (0.5 = ~2 weeks)', () => {
    const result = calculateTargetDate('2025-12-20', 0.5);
    // 0.5 months = 15 days before
    expect(result).toBe('2025-12-05');
  });

  it('subtracts 12 months (one year)', () => {
    expect(calculateTargetDate('2025-12-20', 12)).toBe('2024-12-20');
  });
});

describe('getMonthsBetween', () => {
  it('returns 0 for same date', () => {
    expect(getMonthsBetween('2025-06-15', '2025-06-15')).toBe(0);
  });

  it('returns approximately 12 for one year', () => {
    const result = getMonthsBetween('2024-06-15', '2025-06-15');
    expect(result).toBe(12);
  });

  it('handles partial months', () => {
    const result = getMonthsBetween('2025-06-01', '2025-06-16');
    expect(result).toBeCloseTo(0.5, 0);
  });
});

describe('getGanttPosition', () => {
  it('returns 0 for date at timeline start', () => {
    expect(getGanttPosition('2025-01-01', '2025-01-01', '2025-12-31')).toBe(0);
  });

  it('returns 100 for date at timeline end', () => {
    expect(getGanttPosition('2025-12-31', '2025-01-01', '2025-12-31')).toBe(100);
  });

  it('returns ~50 for midpoint', () => {
    const result = getGanttPosition('2025-07-02', '2025-01-01', '2025-12-31');
    expect(result).toBeGreaterThan(45);
    expect(result).toBeLessThan(55);
  });

  it('clamps below 0', () => {
    expect(getGanttPosition('2024-01-01', '2025-01-01', '2025-12-31')).toBe(0);
  });

  it('clamps above 100', () => {
    expect(getGanttPosition('2026-06-01', '2025-01-01', '2025-12-31')).toBe(100);
  });

  it('returns 0 when start equals end', () => {
    expect(getGanttPosition('2025-06-15', '2025-06-15', '2025-06-15')).toBe(0);
  });
});

describe('formatRelativeMonths', () => {
  it('formats 12 months as "1 year before"', () => {
    expect(formatRelativeMonths(12)).toBe('1 year before');
  });

  it('formats 1 month as "1 month before"', () => {
    expect(formatRelativeMonths(1)).toBe('1 month before');
  });

  it('formats 6 months as "6 months before"', () => {
    expect(formatRelativeMonths(6)).toBe('6 months before');
  });

  it('formats 0.5 months as "2 weeks before"', () => {
    expect(formatRelativeMonths(0.5)).toBe('2 weeks before');
  });

  it('formats 0.25 months as "1 week before"', () => {
    expect(formatRelativeMonths(0.25)).toBe('1 week before');
  });
});
