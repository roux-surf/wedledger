import { DEFAULT_CATEGORIES } from './constants';

export interface WeddingLevel {
  id: string;
  displayName: string;
  budgetRangeLabel: string;
  categoryAllocations: Record<string, number>;
}

/**
 * Single source of truth for wedding-level budget allocation templates.
 * Each level defines what percentage of the total budget should be
 * allocated to each default category. Percentages sum to 100.
 */
export const WEDDING_LEVELS: WeddingLevel[] = [
  {
    id: 'diy',
    displayName: 'DIY',
    budgetRangeLabel: 'Up to $50k',
    categoryAllocations: {
      'Venue': 30,
      'Catering': 25,
      'Bar': 8,
      'Floral': 5,
      'Rentals': 5,
      'Planner Fee': 2,
      'Entertainment': 8,
      'Photography': 12,
      'Misc': 5,
    },
  },
  {
    id: 'lovely',
    displayName: 'Lovely',
    budgetRangeLabel: '$50k – $100k',
    categoryAllocations: {
      'Venue': 28,
      'Catering': 23,
      'Bar': 8,
      'Floral': 8,
      'Rentals': 5,
      'Planner Fee': 5,
      'Entertainment': 8,
      'Photography': 10,
      'Misc': 5,
    },
  },
  {
    id: 'luxury',
    displayName: 'Luxury',
    budgetRangeLabel: '$100k – $500k',
    categoryAllocations: {
      'Venue': 25,
      'Catering': 20,
      'Bar': 7,
      'Floral': 12,
      'Rentals': 6,
      'Planner Fee': 8,
      'Entertainment': 8,
      'Photography': 9,
      'Misc': 5,
    },
  },
  {
    id: 'super_luxury',
    displayName: 'Super Luxury',
    budgetRangeLabel: '$500k – $1M',
    categoryAllocations: {
      'Venue': 22,
      'Catering': 18,
      'Bar': 7,
      'Floral': 15,
      'Rentals': 7,
      'Planner Fee': 10,
      'Entertainment': 8,
      'Photography': 8,
      'Misc': 5,
    },
  },
  {
    id: 'ultra_luxury',
    displayName: 'Ultra Luxury',
    budgetRangeLabel: '$1M+',
    categoryAllocations: {
      'Venue': 20,
      'Catering': 15,
      'Bar': 6,
      'Floral': 18,
      'Rentals': 8,
      'Planner Fee': 12,
      'Entertainment': 8,
      'Photography': 8,
      'Misc': 5,
    },
  },
];

/** Look up a wedding level by its id. */
export function getWeddingLevelById(id: string): WeddingLevel | undefined {
  return WEDDING_LEVELS.find((level) => level.id === id);
}

/** Return the suggested wedding level for a given total budget. */
export function getWeddingLevelForBudget(totalBudget: number): WeddingLevel {
  if (totalBudget >= 1_000_000) return WEDDING_LEVELS[4]; // Ultra Luxury
  if (totalBudget >= 500_000) return WEDDING_LEVELS[3];   // Super Luxury
  if (totalBudget >= 100_000) return WEDDING_LEVELS[2];   // Luxury
  if (totalBudget >= 50_000) return WEDDING_LEVELS[1];    // Lovely
  return WEDDING_LEVELS[0];                                // DIY
}

/**
 * Given a wedding level and a total budget, return a map of
 * category name -> dollar amount for each default category.
 */
export function calculateAllocations(
  level: WeddingLevel,
  totalBudget: number,
): Record<string, number> {
  const allocations: Record<string, number> = {};
  for (const category of DEFAULT_CATEGORIES) {
    const pct = level.categoryAllocations[category] ?? 0;
    allocations[category] = Math.round((pct / 100) * totalBudget);
  }
  return allocations;
}
