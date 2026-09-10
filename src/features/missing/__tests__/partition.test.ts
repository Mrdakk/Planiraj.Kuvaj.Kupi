import { describe, expect, it } from '@jest/globals';
import type { CalculationResult } from '@/calculations/engine';
import { partitionMissing } from '../partition';

function missing(overrides: Partial<CalculationResult>): CalculationResult {
  return {
    ingredientId: 'ing-1',
    ingredientName: 'Sastojak',
    category: 'Ostalo',
    requiredQuantity: 1,
    requiredUnit: 'kom',
    availableQuantity: 0,
    availableUnit: 'kom',
    missingQuantity: 1,
    missingUnit: 'kom',
    isMissing: true,
    trackPresence: false,
    meals: [],
    ...overrides,
  };
}

describe('partitionMissing', () => {
  it('puts presence items first group and counted second', () => {
    const onion = missing({
      ingredientId: 'ing-onion',
      ingredientName: 'Crni luk',
      trackPresence: true,
    });
    const chicken = missing({
      ingredientId: 'ing-chicken',
      ingredientName: 'Piletina',
      trackPresence: false,
    });

    const { presence, counted } = partitionMissing([chicken, onion]);

    expect(presence.map((item) => item.ingredientId)).toEqual(['ing-onion']);
    expect(counted.map((item) => item.ingredientId)).toEqual(['ing-chicken']);
  });
});
