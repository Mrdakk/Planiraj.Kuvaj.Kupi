import { describe, expect, it } from '@jest/globals';
import { buildMealCookView } from '../cookView';
import type { Meal, RecipeWithIngredients } from '@/types';

function createMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    mealPlanId: 'plan-1',
    date: '2026-09-12',
    mealType: 'Ručak',
    recipeId: 'rec-1',
    servings: 4,
    notes: null,
    isCooked: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function createRecipe(overrides: Partial<RecipeWithIngredients> = {}): RecipeWithIngredients {
  return {
    id: 'rec-1',
    name: 'Pasulj',
    description: null,
    imageUri: null,
    baseServings: 4,
    prepTimeMinutes: 90,
    mealTypes: ['Ručak'],
    dishType: 'Glavno jelo',
    isFavorite: false,
    steps: ['Namoci pasulj.', 'Kuvaj dok ne omekša.'],
    notes: 'Bolje sutradan.',
    emoji: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ingredients: [
      {
        id: 'ri-2',
        recipeId: 'rec-1',
        ingredientId: 'ing-luk',
        quantity: 2,
        unit: 'glavica',
        notes: 'sitno seckan',
        sortOrder: 1,
        ingredientName: 'Crni luk',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'ri-1',
        recipeId: 'rec-1',
        ingredientId: 'ing-pasulj',
        quantity: 500,
        unit: 'g',
        notes: null,
        sortOrder: 0,
        ingredientName: 'Pasulj',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ],
    ...overrides,
  };
}

describe('buildMealCookView', () => {
  it('scales ingredient quantities to the meal servings', () => {
    const view = buildMealCookView(createMeal({ servings: 2 }), createRecipe());

    expect(view.ingredients).toEqual([
      expect.objectContaining({
        ingredientId: 'ing-pasulj',
        name: 'Pasulj',
        quantity: 250,
        unit: 'g',
      }),
      expect.objectContaining({
        ingredientId: 'ing-luk',
        name: 'Crni luk',
        quantity: 1,
        unit: 'glavica',
        notes: 'sitno seckan',
      }),
    ]);
  });

  it('keeps recipe quantities when servings match the base', () => {
    const view = buildMealCookView(createMeal({ servings: 4 }), createRecipe());

    expect(view.ingredients[0]?.quantity).toBe(500);
    expect(view.ingredients[1]?.quantity).toBe(2);
  });

  it('orders ingredients by sortOrder even when the recipe list is unsorted', () => {
    const view = buildMealCookView(createMeal(), createRecipe());

    expect(view.ingredients.map((item) => item.ingredientId)).toEqual(['ing-pasulj', 'ing-luk']);
  });

  it('does not mutate the original recipe ingredient quantities', () => {
    const recipe = createRecipe();
    buildMealCookView(createMeal({ servings: 8 }), recipe);

    expect(recipe.ingredients[0]?.quantity).toBe(2);
    expect(recipe.ingredients[1]?.quantity).toBe(500);
  });

  it('passes steps, meal notes, recipe notes and the recipe id for the cook screen', () => {
    const view = buildMealCookView(
      createMeal({ notes: 'Bez luka.' }),
      createRecipe()
    );

    expect(view.steps).toEqual(['Namoci pasulj.', 'Kuvaj dok ne omekša.']);
    expect(view.mealNotes).toBe('Bez luka.');
    expect(view.recipeNotes).toBe('Bolje sutradan.');
    expect(view.recipeId).toBe('rec-1');
    expect(view.servings).toBe(4);
    expect(view.baseServings).toBe(4);
  });

  it('treats blank meal and recipe notes as missing', () => {
    const view = buildMealCookView(
      createMeal({ notes: '   ' }),
      createRecipe({ notes: '  ', steps: [] })
    );

    expect(view.mealNotes).toBeNull();
    expect(view.recipeNotes).toBeNull();
    expect(view.steps).toEqual([]);
  });

  it('falls back to a catalog name when the recipe ingredient has no name', () => {
    const recipe = createRecipe({
      ingredients: [
        {
          id: 'ri-1',
          recipeId: 'rec-1',
          ingredientId: 'ing-pasulj',
          quantity: 500,
          unit: 'g',
          notes: null,
          sortOrder: 0,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
    });

    const view = buildMealCookView(
      createMeal(),
      recipe,
      new Map([['ing-pasulj', 'Pasulj iz kataloga']])
    );

    expect(view.ingredients[0]?.name).toBe('Pasulj iz kataloga');
  });
});
