import { describe, expect, it } from '@jest/globals';
import { buildCookedMealHistory } from '../history';
import type { Meal, Recipe } from '@/types';

function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    mealPlanId: 'plan-1',
    date: '2026-09-12',
    mealType: 'Ručak',
    recipeId: 'rec-1',
    servings: 4,
    notes: null,
    isCooked: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'rec-1',
    name: 'Pasulj',
    description: null,
    imageUri: null,
    baseServings: 4,
    prepTimeMinutes: null,
    mealTypes: [],
    dishType: null,
    isFavorite: false,
    steps: [],
    notes: null,
    emoji: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildCookedMealHistory', () => {
  it('lists only cooked meals with recipe name and date, newest first', () => {
    const rows = buildCookedMealHistory(
      [
        meal({ id: 'uncooked', isCooked: false, date: '2026-09-13' }),
        meal({ id: 'older', recipeId: 'rec-2', date: '2026-09-10' }),
        meal({ id: 'newer', recipeId: 'rec-1', date: '2026-09-12' }),
      ],
      [recipe(), recipe({ id: 'rec-2', name: 'Pita' })]
    );

    expect(rows).toEqual([
      { id: 'newer', recipeName: 'Pasulj', date: '2026-09-12', mealType: 'Ručak' },
      { id: 'older', recipeName: 'Pita', date: '2026-09-10', mealType: 'Ručak' },
    ]);
  });

  it('uses Obrok when the recipe is missing', () => {
    const rows = buildCookedMealHistory([meal({ recipeId: 'gone' })], []);
    expect(rows).toEqual([
      { id: 'meal-1', recipeName: 'Obrok', date: '2026-09-12', mealType: 'Ručak' },
    ]);
  });
});
