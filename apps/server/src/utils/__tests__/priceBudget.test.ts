import { describe, it, expect } from 'vitest';
import { parsePriceMax, parseBudgetMax, filterCarsWithinBudget, BUDGET_TOLERANCE } from '../priceBudget.js';

describe('parsePriceMax', () => {
  it('parses common price formats', () => {
    expect(parsePriceMax('€25.000')).toBe(25000);
    expect(parsePriceMax('$25,000')).toBe(25000);
    expect(parsePriceMax('25.000 €')).toBe(25000);
    expect(parsePriceMax('50.000 euro')).toBe(50000);
    expect(parsePriceMax('28,990 USD')).toBe(28990);
    expect(parsePriceMax('circa 30000 euro')).toBe(30000);
  });

  it('takes the max of a price range', () => {
    expect(parsePriceMax('25000-35000')).toBe(35000);
    expect(parsePriceMax('€25,000-35,000')).toBe(35000);
    expect(parsePriceMax('15,000–20,000 EUR (used market)')).toBe(20000);
  });

  it('handles k/m suffixes', () => {
    expect(parsePriceMax('35k')).toBe(35000);
    expect(parsePriceMax('under 20k')).toBe(20000);
  });

  it('returns null for non-price strings', () => {
    expect(parsePriceMax('No information')).toBeNull();
    expect(parsePriceMax('')).toBeNull();
    expect(parsePriceMax(null)).toBeNull();
    expect(parsePriceMax(undefined)).toBeNull();
  });

  it('ignores small numbers used as noise', () => {
    expect(parsePriceMax('5 seats, no price')).toBeNull();
  });
});

describe('parseBudgetMax', () => {
  it('extracts the ceiling of a range', () => {
    expect(parseBudgetMax('10000 - 20000 EUR')).toBe(20000);
    expect(parseBudgetMax('25000 - 35000')).toBe(35000);
  });

  it('parses single-value budgets', () => {
    expect(parseBudgetMax('50000 EUR')).toBe(50000);
    expect(parseBudgetMax('up to 50k')).toBe(50000);
  });

  it('returns null when no budget is expressed', () => {
    expect(parseBudgetMax('none')).toBeNull();
    expect(parseBudgetMax('')).toBeNull();
    expect(parseBudgetMax(null)).toBeNull();
    expect(parseBudgetMax(undefined)).toBeNull();
  });
});

describe('filterCarsWithinBudget', () => {
  const car = (price: string) => ({ make: 'X', price });

  it('excludes cars beyond budget + tolerance', () => {
    const result = filterCarsWithinBudget([car('30,000 EUR'), car('56,000 EUR')], 50000);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0].budgetCheck).toBe('within');
    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0].parsedPrice).toBe(56000);
  });

  it('keeps cars at the tolerance edge', () => {
    const result = filterCarsWithinBudget([car(`55000`)], 50000);
    expect(result.kept).toHaveLength(1);
    expect(result.excluded).toHaveLength(0);
    expect(55000).toBeLessThanOrEqual(50000 * BUDGET_TOLERANCE);
  });

  it('flags cars without a parseable price instead of dropping them', () => {
    const result = filterCarsWithinBudget([car('No information')], 20000);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0].budgetCheck).toBe('unknown');
    expect(result.excluded).toHaveLength(0);
  });

  it('keeps everything when no budget is given', () => {
    const result = filterCarsWithinBudget([car('999,999 EUR')], null);
    expect(result.kept).toHaveLength(1);
    expect(result.excluded).toHaveLength(0);
  });
});