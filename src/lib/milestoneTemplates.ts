/**
 * Default milestone templates for wedding planning timelines.
 * Follows the same pattern as budgetTemplates.ts.
 *
 * Each milestone has a `minLevel` that determines the minimum wedding level
 * required for it to appear. Core milestones use 'diy' (included for all levels).
 */

export interface DefaultMilestone {
  title: string;
  description: string;
  monthsBefore: number;
  categoryName: string | null;
  minLevel: string;
}

/** Ordered level IDs from lowest to highest. */
const LEVEL_ORDER = ['diy', 'lovely', 'luxury', 'super_luxury', 'ultra_luxury'];

function levelRank(levelId: string): number {
  const index = LEVEL_ORDER.indexOf(levelId);
  return index >= 0 ? index : 0;
}

/**
 * All default milestones. Core milestones have minLevel 'diy'.
 * Higher-level extras are additive — a 'luxury' wedding includes
 * all 'diy' and 'lovely' milestones plus its own.
 */
const ALL_DEFAULT_MILESTONES: DefaultMilestone[] = [
  // 12 months — core
  { title: 'Set overall budget', description: 'Determine total wedding budget and priorities', monthsBefore: 12, categoryName: null, minLevel: 'diy' },
  { title: 'Book venue', description: 'Research and secure wedding venue', monthsBefore: 12, categoryName: 'Venue', minLevel: 'diy' },
  // 12 months — ultra luxury
  { title: 'Book destination venue scout', description: 'Hire a destination specialist to evaluate venue options', monthsBefore: 12, categoryName: 'Venue', minLevel: 'ultra_luxury' },
  // 10 months — core
  { title: 'Book photographer', description: 'Research and book wedding photographer', monthsBefore: 10, categoryName: 'Photography', minLevel: 'diy' },
  { title: 'Book planner/coordinator', description: 'Hire a wedding planner or day-of coordinator', monthsBefore: 10, categoryName: 'Planner Fee', minLevel: 'diy' },
  // 10 months — lovely+
  { title: 'Book lighting designer', description: 'Hire a lighting designer for the venue', monthsBefore: 10, categoryName: 'Rentals', minLevel: 'lovely' },
  // 10 months — super luxury+
  { title: 'Book calligrapher', description: 'Commission calligrapher for invitations and signage', monthsBefore: 10, categoryName: 'Misc', minLevel: 'super_luxury' },
  // 9 months — core
  { title: 'Book caterer', description: 'Select and book catering service', monthsBefore: 9, categoryName: 'Catering', minLevel: 'diy' },
  // 8 months — core
  { title: 'Book entertainment', description: 'Book DJ, band, or other entertainment', monthsBefore: 8, categoryName: 'Entertainment', minLevel: 'diy' },
  { title: 'Book bar service', description: 'Arrange bar and beverage service', monthsBefore: 8, categoryName: 'Bar', minLevel: 'diy' },
  // 8 months — luxury+
  { title: 'Book videographer', description: 'Hire a wedding videographer', monthsBefore: 8, categoryName: 'Photography', minLevel: 'luxury' },
  // 8 months — super luxury+
  { title: 'Book event designer', description: 'Hire an event designer for overall aesthetic direction', monthsBefore: 8, categoryName: 'Planner Fee', minLevel: 'super_luxury' },
  // 6 months — core
  { title: 'Book florist', description: 'Select florist and plan floral arrangements', monthsBefore: 6, categoryName: 'Floral', minLevel: 'diy' },
  { title: 'Order rentals', description: 'Book tables, chairs, linens, and other rentals', monthsBefore: 6, categoryName: 'Rentals', minLevel: 'diy' },
  // 6 months — luxury+
  { title: 'Commission custom decor', description: 'Order custom decor, signage, and installations', monthsBefore: 6, categoryName: 'Floral', minLevel: 'luxury' },
  // 6 months — ultra luxury+
  { title: 'Arrange guest travel logistics', description: 'Coordinate travel and accommodation for out-of-town guests', monthsBefore: 6, categoryName: 'Misc', minLevel: 'ultra_luxury' },
  // 4 months — core
  { title: 'Send invitations', description: 'Mail out wedding invitations', monthsBefore: 4, categoryName: null, minLevel: 'diy' },
  // 3 months — core
  { title: 'Final venue walkthrough', description: 'Do a detailed walkthrough of the venue with vendors', monthsBefore: 3, categoryName: 'Venue', minLevel: 'diy' },
  // 2 months — core
  { title: 'Confirm all vendor details', description: 'Confirm timelines, deliverables, and logistics with every vendor', monthsBefore: 2, categoryName: null, minLevel: 'diy' },
  // 1 month — core
  { title: 'Final guest count to caterer', description: 'Submit final guest count and meal selections', monthsBefore: 1, categoryName: 'Catering', minLevel: 'diy' },
  { title: 'Final payments due', description: 'Process remaining vendor payments', monthsBefore: 1, categoryName: null, minLevel: 'diy' },
  // 2 weeks — core
  { title: 'Wedding rehearsal', description: 'Run through ceremony logistics with wedding party', monthsBefore: 0.5, categoryName: null, minLevel: 'diy' },
];

/**
 * Returns the filtered set of default milestones for a given wedding level.
 * Includes all milestones whose minLevel rank is <= the given level's rank.
 */
export function getDefaultMilestonesForLevel(levelId: string): DefaultMilestone[] {
  const rank = levelRank(levelId);
  return ALL_DEFAULT_MILESTONES
    .filter((m) => levelRank(m.minLevel) <= rank)
    .map((m, index) => ({ ...m, sortOrder: index }));
}

/**
 * Calculate a target date by subtracting monthsBefore from the wedding date.
 * Handles partial months (0.5 = ~2 weeks).
 */
export function calculateTargetDate(weddingDate: string, monthsBefore: number): string {
  const date = new Date(weddingDate + 'T00:00:00');
  const wholeMonths = Math.floor(monthsBefore);
  const fractionalDays = Math.round((monthsBefore - wholeMonths) * 30);

  date.setMonth(date.getMonth() - wholeMonths);
  date.setDate(date.getDate() - fractionalDays);

  return date.toISOString().split('T')[0];
}

/**
 * Get the number of months between two dates (can be fractional).
 */
export function getMonthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() - start.getDate()) / 30
  );
}

/**
 * Get the percentage position of a date within a timeline range.
 * Returns 0–100, clamped.
 */
export function getGanttPosition(
  targetDate: string,
  timelineStart: string,
  timelineEnd: string,
): number {
  const start = new Date(timelineStart + 'T00:00:00').getTime();
  const end = new Date(timelineEnd + 'T00:00:00').getTime();
  const target = new Date(targetDate + 'T00:00:00').getTime();

  if (end === start) return 0;
  const pct = ((target - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Format months_before as a human-readable relative label.
 */
export function formatRelativeMonths(monthsBefore: number): string {
  if (monthsBefore >= 12) {
    const years = Math.floor(monthsBefore / 12);
    const remaining = monthsBefore % 12;
    if (remaining === 0) return years === 1 ? '1 year before' : `${years} years before`;
    return `${years}y ${remaining}mo before`;
  }
  if (monthsBefore >= 1) {
    const whole = Math.floor(monthsBefore);
    return whole === 1 ? '1 month before' : `${whole} months before`;
  }
  const weeks = Math.round(monthsBefore * 4);
  return weeks === 1 ? '1 week before' : `${weeks} weeks before`;
}
