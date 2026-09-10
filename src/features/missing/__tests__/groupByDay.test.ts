import { describe, expect, it } from '@jest/globals';
import { calculate } from '@/calculations/engine';
import type { CalculationInput } from '@/calculations/engine';
import type { Ingredient, Meal, Recipe, RecipeIngredient } from '@/types';
import { groupMissingByDay } from '@/features/missing/groupByDay';

function createIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: overrides.id ?? 'ing-1',
    name: overrides.name ?? 'Sastojak',
    category: overrides.category ?? 'Ostalo',
    defaultUnit: overrides.defaultUnit ?? 'kom',
    emoji: overrides.emoji ?? null,
    trackPresence: overrides.trackPresence ?? false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function createRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: overrides.id ?? 'rec-1',
    name: overrides.name ?? 'Recept',
    description: null,
    imageUri: null,
    baseServings: overrides.baseServings ?? 4,
    prepTimeMinutes: null,
    category: null,
    isFavorite: false,
    steps: [],
    notes: null,
    emoji: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function createRecipeIngredient(overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return {
    id: overrides.id ?? 'ri-1',
    recipeId: overrides.recipeId ?? 'rec-1',
    ingredientId: overrides.ingredientId ?? 'ing-1',
    quantity: overrides.quantity ?? 1,
    unit: overrides.unit ?? 'kom',
    notes: null,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function createMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: overrides.id ?? 'meal-1',
    mealPlanId: overrides.mealPlanId ?? 'plan-1',
    date: overrides.date ?? '2026-09-01',
    mealType: overrides.mealType ?? 'Ručak',
    recipeId: overrides.recipeId ?? 'rec-1',
    servings: overrides.servings ?? 4,
    notes: null,
    isCooked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

describe('groupMissingByDay', () => {
  it('merges the same recipe twice on one day and sums ingredients', () => {
    const flour = createIngredient({ id: 'ing-flour', name: 'Prašak za pecivo', defaultUnit: 'pakovanje' });
    const recipe = createRecipe({ id: 'rec-pancakes', name: 'Palačinke', baseServings: 4 });
    const meals = [
      createMeal({ id: 'meal-1', recipeId: 'rec-pancakes', date: '2026-09-01', servings: 4 }),
      createMeal({ id: 'meal-2', recipeId: 'rec-pancakes', date: '2026-09-01', servings: 4 }),
    ];
    const input: CalculationInput = {
      ingredients: [flour],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({
          recipeId: 'rec-pancakes',
          ingredientId: 'ing-flour',
          quantity: 4,
          unit: 'pakovanje',
        }),
      ],
      meals,
      pantryItems: [],
    };

    const calculation = calculate(input);
    const byDay = groupMissingByDay(calculation.missing, meals, [recipe]);

    expect(byDay).toHaveLength(1);
    expect(byDay[0]?.recipes).toHaveLength(1);
    expect(byDay[0]?.recipes[0]?.recipeName).toBe('Palačinke');
    expect(byDay[0]?.recipes[0]?.mealCount).toBe(2);
    expect(byDay[0]?.recipes[0]?.items).toHaveLength(1);
    expect(byDay[0]?.recipes[0]?.items[0]?.quantity).toBe(8);
  });

  it('keeps the same recipe on different days as separate day totals', () => {
    const flour = createIngredient({ id: 'ing-flour', name: 'Prašak za pecivo', defaultUnit: 'pakovanje' });
    const recipe = createRecipe({ id: 'rec-pancakes', name: 'Palačinke', baseServings: 4 });
    const meals = [
      createMeal({ id: 'meal-1', recipeId: 'rec-pancakes', date: '2026-09-01', servings: 4 }),
      createMeal({ id: 'meal-2', recipeId: 'rec-pancakes', date: '2026-09-02', servings: 4 }),
    ];
    const input: CalculationInput = {
      ingredients: [flour],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({
          recipeId: 'rec-pancakes',
          ingredientId: 'ing-flour',
          quantity: 4,
          unit: 'pakovanje',
        }),
      ],
      meals,
      pantryItems: [],
    };

    const calculation = calculate(input);
    const byDay = groupMissingByDay(calculation.missing, meals, [recipe]);

    expect(byDay).toHaveLength(2);
    expect(byDay[0]?.recipes[0]?.items[0]?.quantity).toBe(4);
    expect(byDay[1]?.recipes[0]?.items[0]?.quantity).toBe(4);
    expect(calculation.shoppingList).toHaveLength(1);
    expect(calculation.shoppingList[0]?.quantity).toBe(8);
  });
});
