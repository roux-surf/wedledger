import { describe, it, expect } from 'vitest';
import {
  WEDDING_LEVELS,
  getWeddingLevelById,
  getWeddingLevelForBudget,
  calculateAllocations,
} from '../budgetTemplates';
import { DEFAULT_CATEGORIES } from '../constants';

describe('getWeddingLevelById', () => {
  it('returns the correct level for diy', () => {
    const level = getWeddingLevelById('diy');
    expect(level).toBeDefined();
    expect(level!.displayName).toBe('DIY');
  });

  it('returns undefined for unknown id', () => {
    expect(getWeddingLevelById('nonexistent')).toBeUndefined();
  });

  it('finds all five levels', () => {
    const ids = ['diy', 'lovely', 'luxury', 'super_luxury', 'ultra_luxury'];
    ids.forEach((id) => {
      expect(getWeddingLevelById(id)).toBeDefined();
    });
  });
});

describe('getWeddingLevelForBudget', () => {
  it('returns DIY for budget under $50k', () => {
    expect(getWeddingLevelForBudget(49999).id).toBe('diy');
  });

  it('returns Lovely at exactly $50k', () => {
    expect(getWeddingLevelForBudget(50000).id).toBe('lovely');
  });

  it('returns Luxury at $100k', () => {
    expect(getWeddingLevelForBudget(100000).id).toBe('luxury');
  });

  it('returns Super Luxury at $500k', () => {
    expect(getWeddingLevelForBudget(500000).id).toBe('super_luxury');
  });

  it('returns Ultra Luxury at $1M', () => {
    expect(getWeddingLevelForBudget(1000000).id).toBe('ultra_luxury');
  });

  it('returns DIY for zero budget', () => {
    expect(getWeddingLevelForBudget(0).id).toBe('diy');
  });
});

describe('calculateAllocations', () => {
  it('produces allocations for all default categories', () => {
    const level = WEDDING_LEVELS[0]; // DIY
    const allocations = calculateAllocations(level, 100000);
    DEFAULT_CATEGORIES.forEach((cat) => {
      expect(allocations[cat]).toBeDefined();
      expect(allocations[cat]).toBeGreaterThanOrEqual(0);
    });
  });

  it('sums to total budget (within rounding tolerance)', () => {
    WEDDING_LEVELS.forEach((level) => {
      const allocations = calculateAllocations(level, 100000);
      const total = Object.values(allocations).reduce((sum, v) => sum + v, 0);
      expect(total).toBe(100000);
    });
  });

  it('returns zero allocations for zero budget', () => {
    const level = WEDDING_LEVELS[0];
    const allocations = calculateAllocations(level, 0);
    Object.values(allocations).forEach((v) => expect(v).toBe(0));
  });

  it('computes correct dollar amounts', () => {
    const level = WEDDING_LEVELS[0]; // DIY: Venue = 30%
    const allocations = calculateAllocations(level, 50000);
    expect(allocations['Venue']).toBe(15000); // 30% of 50k
  });
});

describe('WEDDING_LEVELS allocations sum to 100%', () => {
  WEDDING_LEVELS.forEach((level) => {
    it(`${level.displayName} allocations sum to 100`, () => {
      const total = Object.values(level.categoryAllocations).reduce((sum, v) => sum + v, 0);
      expect(total).toBe(100);
    });
  });
});
