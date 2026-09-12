import { describe, expect, it } from '@jest/globals';
import { suggestMeals } from '../suggestMeals';
import type { Ingredient, Meal, PantryItem, Recipe, RecipeIngredient } from '@/types';

const stamps = { createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' };

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'rec-1',
    name: 'Recept',
    description: null,
    imageUri: null,
    baseServings: 4,
    prepTimeMinutes: 30,
    mealTypes: ['Ručak', 'Večera'],
    dishType: 'Glavno jelo',
    isFavorite: false,
    steps: [],
    notes: null,
    emoji: null,
    ...stamps,
    ...overrides,
  };
}

function ingredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-1',
    name: 'Namirnica',
    category: 'Ostalo',
    defaultUnit: 'kom',
    emoji: null,
    trackPresence: false,
    ...stamps,
    ...overrides,
  };
}

function recipeIngredient(overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return {
    id: 'ri-1',
    recipeId: 'rec-1',
    ingredientId: 'ing-1',
    quantity: 1,
    unit: 'kom',
    notes: null,
    sortOrder: 0,
    ...stamps,
    ...overrides,
  };
}

function pantry(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: 'pan-1',
    ingredientId: 'ing-1',
    quantity: 10,
    unit: 'kom',
    expiresAt: null,
    notes: null,
    ...stamps,
    ...overrides,
  };
}

function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    mealPlanId: 'plan-1',
    date: '2026-09-10',
    mealType: 'Ručak',
    recipeId: 'rec-1',
    servings: 4,
    notes: null,
    isCooked: false,
    ...stamps,
    ...overrides,
  };
}

describe('suggestMeals Brzi', () => {
  it('ranks a fully stocked short recipe above one that needs shopping and takes longer', () => {
    const haveIng = ingredient({ id: 'ing-have', name: 'Jaja' });
    const missIng = ingredient({ id: 'ing-miss', name: 'Losos' });
    const quick = recipe({
      id: 'rec-quick',
      name: 'Kajgana',
      prepTimeMinutes: 10,
    });
    const slow = recipe({
      id: 'rec-slow',
      name: 'Losos',
      prepTimeMinutes: 90,
    });

    const result = suggestMeals({
      mealType: 'Ručak',
      pace: 'brzi',
      recipes: [slow, quick],
      recipeIngredients: [
        recipeIngredient({ id: 'ri-q', recipeId: 'rec-quick', ingredientId: 'ing-have' }),
        recipeIngredient({ id: 'ri-s', recipeId: 'rec-slow', ingredientId: 'ing-miss' }),
      ],
      ingredients: [haveIng, missIng],
      pantryItems: [pantry({ ingredientId: 'ing-have', quantity: 12 })],
      weekMeals: [],
    });

    expect(result.map((item) => item.recipe.id)).toEqual(['rec-quick', 'rec-slow']);
    expect(result[0].missingCount).toBe(0);
    expect(result[1].missingCount).toBe(1);
  });

  it('returns at most 3 suggestions', () => {
    const recipes = Array.from({ length: 5 }, (_, i) =>
      recipe({ id: `rec-${i}`, name: `Jelo ${i}`, mealTypes: ['Ručak'], prepTimeMinutes: 20 + i })
    );
    const result = suggestMeals({
      mealType: 'Ručak',
      pace: 'brzi',
      recipes,
      recipeIngredients: [],
      ingredients: [],
      pantryItems: [],
      weekMeals: [],
    });
    expect(result).toHaveLength(3);
  });
});

describe('suggestMeals meal type filter', () => {
  it('keeps breakfast recipes for Doručak', () => {
    const breakfast = recipe({ id: 'rec-b', name: 'Omlet', mealTypes: ['Doručak'], dishType: null });
    const dinner = recipe({ id: 'rec-d', name: 'Sendvič', mealTypes: ['Večera'], dishType: null });
    const result = suggestMeals({
      mealType: 'Doručak',
      pace: 'brzi',
      recipes: [breakfast, dinner],
      recipeIngredients: [],
      ingredients: [],
      pantryItems: [],
      weekMeals: [],
    });
    expect(result.map((item) => item.recipe.id)).toEqual(['rec-b']);
  });

  it('falls back to all recipes when none match the meal type', () => {
    const untitled = recipe({ id: 'rec-x', name: 'Mystery', mealTypes: [], dishType: null });
    const result = suggestMeals({
      mealType: 'Užina',
      pace: 'brzi',
      recipes: [untitled],
      recipeIngredients: [],
      ingredients: [],
      pantryItems: [],
      weekMeals: [],
    });
    expect(result.map((item) => item.recipe.id)).toEqual(['rec-x']);
  });

  it('treats Glavno jelo as both Ručak and Večera', () => {
    const main = recipe({ id: 'rec-m', name: 'Gulaš' });
    expect(
      suggestMeals({
        mealType: 'Ručak',
        pace: 'brzi',
        recipes: [main],
        recipeIngredients: [],
        ingredients: [],
        pantryItems: [],
        weekMeals: [],
      }).map((item) => item.recipe.id)
    ).toEqual(['rec-m']);
    expect(
      suggestMeals({
        mealType: 'Večera',
        pace: 'brzi',
        recipes: [main],
        recipeIngredients: [],
        ingredients: [],
        pantryItems: [],
        weekMeals: [],
      }).map((item) => item.recipe.id)
    ).toEqual(['rec-m']);
  });
});

describe('suggestMeals Klasičan', () => {
  it('does not return the same recipe ids as Brzi when more candidates exist', () => {
    const recipes = [
      recipe({ id: 'rec-a', name: 'A', mealTypes: ['Užina'], dishType: null, prepTimeMinutes: 5, isFavorite: false }),
      recipe({ id: 'rec-b', name: 'B', mealTypes: ['Užina'], dishType: null, prepTimeMinutes: 10, isFavorite: false }),
      recipe({ id: 'rec-c', name: 'C', mealTypes: ['Užina'], dishType: null, prepTimeMinutes: 15, isFavorite: false }),
      recipe({
        id: 'rec-d',
        name: 'D',
        mealTypes: ['Užina'],
        dishType: null,
        prepTimeMinutes: 80,
        isFavorite: true,
      }),
      recipe({
        id: 'rec-e',
        name: 'E',
        mealTypes: ['Užina'],
        dishType: null,
        prepTimeMinutes: 90,
        isFavorite: true,
      }),
      recipe({
        id: 'rec-f',
        name: 'F',
        mealTypes: ['Užina'],
        dishType: null,
        prepTimeMinutes: 100,
        isFavorite: true,
      }),
    ];
    const input = {
      mealType: 'Užina' as const,
      recipes,
      recipeIngredients: [],
      ingredients: [],
      pantryItems: [],
      weekMeals: [],
    };

    const brzi = suggestMeals({ ...input, pace: 'brzi' });
    const klasican = suggestMeals({ ...input, pace: 'klasican' });

    expect(brzi).toHaveLength(3);
    expect(klasican).toHaveLength(3);
    const brziIds = new Set(brzi.map((item) => item.recipe.id));
    expect(klasican.every((item) => !brziIds.has(item.recipe.id))).toBe(true);
  });

  it('prefers a favorite that is not already on this week over one that is cooked', () => {
    const fillers = [
      recipe({ id: 'rec-fast-1', name: 'Brzi 1', mealTypes: ['Večera'], dishType: null, prepTimeMinutes: 5 }),
      recipe({ id: 'rec-fast-2', name: 'Brzi 2', mealTypes: ['Večera'], dishType: null, prepTimeMinutes: 6 }),
      recipe({ id: 'rec-fast-3', name: 'Brzi 3', mealTypes: ['Večera'], dishType: null, prepTimeMinutes: 7 }),
    ];
    const planned = recipe({
      id: 'rec-planned',
      name: 'Planiran',
      mealTypes: ['Večera'],
      dishType: null,
      prepTimeMinutes: 40,
      isFavorite: false,
    });
    const cooked = recipe({
      id: 'rec-cooked',
      name: 'Skuvan',
      mealTypes: ['Večera'],
      dishType: null,
      prepTimeMinutes: 40,
      isFavorite: false,
    });
    const favorite = recipe({
      id: 'rec-fav',
      name: 'Omiljen',
      mealTypes: ['Večera'],
      dishType: null,
      prepTimeMinutes: 40,
      isFavorite: true,
    });

    const result = suggestMeals({
      mealType: 'Večera',
      pace: 'klasican',
      recipes: [...fillers, planned, cooked, favorite],
      recipeIngredients: [],
      ingredients: [],
      pantryItems: [],
      weekMeals: [
        meal({ id: 'm1', recipeId: 'rec-planned', isCooked: false }),
        meal({ id: 'm2', recipeId: 'rec-cooked', isCooked: true }),
      ],
    });

    expect(result[0].recipe.id).toBe('rec-fav');
  });
});
