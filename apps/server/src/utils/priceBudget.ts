/**
 * Deterministic budget enforcement helpers (issue #76).
 *
 * The LLM pipeline describes budgets and car prices as free-form strings.
 * These helpers extract the numeric values and exclude suggestions that
 * exceed the user's budget, so the pipeline can enforce the constraint
 * instead of relying on prompt instructions alone.
 */

/** Currency-agnostic: parses the largest monetary value in a price/budget string. */
export function parsePriceMax(priceString: string | null | undefined): number | null {
  if (typeof priceString !== 'string' || !priceString.trim()) return null;
  const cleaned = priceString.toLowerCase().replace(/[^\dkm.,0-9]/g, ' ');
  let max: number | null = null;
  const consider = (n: number) => {
    if (Number.isFinite(n) && n > 500) max = Math.max(max ?? 0, n);
  };

  // "35k" / "1.2m" style suffixes first
  for (const m of cleaned.matchAll(/(\d+(?:[.,]\d+)?)\s*(km?)\b/gi)) {
    const n = parseFloat(m[1].replace(',', '.'));
    if (Number.isFinite(n)) consider(m[2] === 'm' ? n * 1_000_000 : n * 1_000);
  }

  const withoutSuffixes = cleaned.replace(/(\d+(?:[.,]\d+)?)\s*(km?)\b/gi, ' ');
  for (const m of withoutSuffixes.matchAll(/\d[\d.,]*\d|\d/g)) {
    let s = m[0];
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
      // unambiguous thousands grouping: "25.000" or "25,000"
      s = s.replace(/[.,]/g, '');
    } else {
      s = s.replace(/,/g, '.');
    }
    consider(parseFloat(s));
  }

  return max;
}

/**
 * Extract the maximum acceptable price from the free-form budget string the
 * intent step produces (e.g. "10000 - 20000 EUR", "up to 50k", "50000 euro").
 * Returns null when the user expressed no budget (or it is unparseable).
 */
export function parseBudgetMax(budgetString: string | null | undefined): number | null {
  if (typeof budgetString !== 'string') return null;
  const s = budgetString.trim().toLowerCase();
  if (!s || s === 'none' || s === 'no budget' || s === 'unlimited') return null;
  return parsePriceMax(s);
}

/** Tolerance applied to suggested prices, matching the prompt's "plus or minus 10%" rule for used cars. */
export const BUDGET_TOLERANCE = 1.1;

export interface BudgetFilterResult<T> {
  /** Cars within budget, or without a parseable price (kept, flagged for transparency). */
  kept: Array<T & { budgetCheck: 'within' | 'unknown' }>;
  /** Cars whose parsed price exceeds the budget beyond the tolerance. */
  excluded: Array<{ car: T; parsedPrice: number }>;
}

/**
 * Filter cars whose price exceeds `budgetMax` (with tolerance). Cars without a
 * parseable price are kept and flagged `budgetCheck: 'unknown'` so the UI/judge
 * can surface them instead of silently dropping data.
 */
export function filterCarsWithinBudget<T extends { price?: string }>(
  cars: T[],
  budgetMax: number | null | undefined
): BudgetFilterResult<T> {
  if (!budgetMax || !Number.isFinite(budgetMax) || budgetMax <= 0) {
    return {
      kept: cars.map((c) => ({ ...c, budgetCheck: 'unknown' as const })),
      excluded: []
    };
  }

  const kept: BudgetFilterResult<T>['kept'] = [];
  const excluded: BudgetFilterResult<T>['excluded'] = [];

  for (const car of cars) {
    const parsed = parsePriceMax(car.price);
    if (parsed == null) {
      kept.push({ ...car, budgetCheck: 'unknown' });
    } else if (parsed > budgetMax * BUDGET_TOLERANCE) {
      excluded.push({ car, parsedPrice: parsed });
    } else {
      kept.push({ ...car, budgetCheck: 'within' });
    }
  }

  return { kept, excluded };
}