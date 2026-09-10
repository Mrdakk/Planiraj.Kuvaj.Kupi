import type { CalculationResult } from '@/calculations/engine';

export function partitionMissing(missing: CalculationResult[]): {
  presence: CalculationResult[];
  counted: CalculationResult[];
} {
  const presence: CalculationResult[] = [];
  const counted: CalculationResult[] = [];
  for (const item of missing) {
    if (item.trackPresence) presence.push(item);
    else counted.push(item);
  }
  return { presence, counted };
}
