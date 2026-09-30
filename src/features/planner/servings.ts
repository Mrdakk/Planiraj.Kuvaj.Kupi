import { parsePositiveQuantity } from '@/lib/formatQuantity';

export function defaultMealServings(baseServings: number | null | undefined): number {
  if (typeof baseServings === 'number' && Number.isFinite(baseServings) && baseServings > 0) {
    return Math.round(baseServings);
  }
  return 4;
}

/** Servings typed by the user; null when below 1 or not a number. */
export function parseServings(text: string): number | null {
  const value = parsePositiveQuantity(text);
  return value !== null && value >= 1 ? value : null;
}
