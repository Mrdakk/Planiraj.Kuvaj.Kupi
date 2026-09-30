import { describe, expect, it } from '@jest/globals';
import type { CalculationResult } from '@/calculations/engine';
import type { IngredientCategory } from '@/constants/categories';
import type { Unit } from '@/constants/units';
import type { MissingDayGroup } from '../groupByDay';
import {
  allTogetherItemKey,
  byDayItemKey,
  collectAllTogetherLines,
  collectByDayLines,
  keysForDay,
  keysForRecipe,
  selectionHeaderState,
  toggleSelectionKey,
  toggleSelectionKeys,
} from '../selection';

const dayGroup: MissingDayGroup = {
  date: '2026-09-08',
  recipes: [
    {
      recipeId: 'rec-1',
      recipeName: 'Ajvar',
      mealCount: 1,
      mealIds: ['meal-1'],
      items: [
        {
          key: 'ing-tomato',
          ingredientId: 'ing-tomato',
          ingredientName: 'Paradajz',
          category: 'Povrće',
          quantity: 2,
          unit: 'kom',
        },
        {
          key: 'ing-pepper',
          ingredientId: 'ing-pepper',
          ingredientName: 'Paprika',
          category: 'Povrće',
          quantity: 1,
          unit: 'kom',
        },
      ],
    },
    {
      recipeId: 'rec-2',
      recipeName: 'Salata',
      mealCount: 1,
      mealIds: ['meal-2'],
      items: [
        {
          key: 'ing-tomato',
          ingredientId: 'ing-tomato',
          ingredientName: 'Paradajz',
          category: 'Povrće',
          quantity: 1,
          unit: 'kom',
        },
      ],
    },
  ],
};

function missingItem(
  ingredientId: string,
  name: string,
  missingQuantity: number,
  unit: Unit,
  mealIds: string[]
): CalculationResult {
  return {
    key: ingredientId,
    ingredientId,
    ingredientName: name,
    category: 'Povrće' as IngredientCategory,
    requiredQuantity: missingQuantity,
    requiredUnit: unit,
    availableQuantity: 0,
    availableUnit: unit,
    missingQuantity,
    missingUnit: unit,
    isMissing: true,
    trackPresence: false,
    meals: mealIds.map((mealId) => ({ mealId, quantity: missingQuantity, unit })),
  };
}

describe('missing selection keys', () => {
  it('toggles a single key on and off', () => {
    const key = byDayItemKey('2026-09-08', 'rec-1', 'ing-tomato');
    const selected = toggleSelectionKey(new Set(), key);
    expect(selected.has(key)).toBe(true);
    expect(toggleSelectionKey(selected, key).has(key)).toBe(false);
  });

  it('selects all child keys then deselects them', () => {
    const keys = keysForDay(dayGroup);
    expect(keys).toEqual([
      '2026-09-08|rec-1|ing-tomato',
      '2026-09-08|rec-1|ing-pepper',
      '2026-09-08|rec-2|ing-tomato',
    ]);

    const allOn = toggleSelectionKeys(new Set(), keys);
    expect(selectionHeaderState(allOn, keys)).toBe('all');
    const allOff = toggleSelectionKeys(allOn, keys);
    expect(selectionHeaderState(allOff, keys)).toBe('none');
  });

  it('reports a mixed header when only some children are selected', () => {
    const recipeKeys = keysForRecipe(dayGroup.date, dayGroup.recipes[0]!);
    const selected = new Set([recipeKeys[0]!]);
    expect(selectionHeaderState(selected, recipeKeys)).toBe('some');
  });
});

describe('collectSelectedLines', () => {
  it('uses the day/meal quantity for by-day selection', () => {
    const selected = new Set([byDayItemKey('2026-09-08', 'rec-1', 'ing-tomato')]);
    const lines = collectByDayLines(selected, [dayGroup]);
    expect(lines).toEqual([
      {
        ingredientId: 'ing-tomato',
        name: 'Paradajz',
        quantity: 2,
        unit: 'kom',
        category: 'Povrće',
        sourceMealIds: ['meal-1'],
      },
    ]);
  });

  it('sums the same ingredient when two meals are selected', () => {
    const selected = new Set([
      byDayItemKey('2026-09-08', 'rec-1', 'ing-tomato'),
      byDayItemKey('2026-09-08', 'rec-2', 'ing-tomato'),
    ]);
    const lines = collectByDayLines(selected, [dayGroup]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      ingredientId: 'ing-tomato',
      quantity: 3,
      sourceMealIds: ['meal-1', 'meal-2'],
    });
  });

  it('uses missingQuantity for all-together selection', () => {
    const selected = new Set([allTogetherItemKey('ing-tomato')]);
    const lines = collectAllTogetherLines(selected, [
      missingItem('ing-tomato', 'Paradajz', 4, 'kom', ['meal-1', 'meal-2']),
    ]);
    expect(lines).toEqual([
      {
        ingredientId: 'ing-tomato',
        name: 'Paradajz',
        quantity: 4,
        unit: 'kom',
        category: 'Povrće',
        sourceMealIds: ['meal-1', 'meal-2'],
      },
    ]);
  });
});
