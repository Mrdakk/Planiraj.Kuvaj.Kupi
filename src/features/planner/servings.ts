export function defaultMealServings(baseServings: number | null | undefined): number {
  if (typeof baseServings === 'number' && Number.isFinite(baseServings) && baseServings > 0) {
    return Math.round(baseServings);
  }
  return 4;
}
