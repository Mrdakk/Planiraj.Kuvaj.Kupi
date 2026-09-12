import { describe, it, expect } from '@jest/globals';
import { calculate } from '../engine';
import type { CalculationInput } from '../engine';
import type { Ingredient, Recipe, RecipeIngredient, Meal, PantryItem } from '@/types';

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
    mealTypes: [],
    dishType: null,
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
    date: overrides.date ?? '2024-01-01',
    mealType: overrides.mealType ?? 'Ručak',
    recipeId: overrides.recipeId ?? 'rec-1',
    servings: overrides.servings ?? 4,
    notes: null,
    isCooked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function createPantryItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: overrides.id ?? 'pantry-1',
    ingredientId: overrides.ingredientId ?? 'ing-1',
    quantity: overrides.quantity ?? 0,
    unit: overrides.unit ?? 'kom',
    expiresAt: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

describe('Calculation Engine', () => {
  it('Test 1: Required 1000 g, have 500 g -> missing 500 g', () => {
    const ingredient = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [ingredient],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-chicken', quantity: 1000, unit: 'g' }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 4 })],
      pantryItems: [createPantryItem({ ingredientId: 'ing-chicken', quantity: 500, unit: 'g' })],
    };

    const result = calculate(input);
    const chicken = result.byIngredient.find((r) => r.ingredientId === 'ing-chicken');
    expect(chicken).toBeDefined();
    expect(chicken!.missingQuantity).toBe(500);
    expect(chicken!.missingUnit).toBe('g');
  });

  it('Test 2: Required 1000 g, have 1000 g -> missing 0', () => {
    const ingredient = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [ingredient],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-chicken', quantity: 1000, unit: 'g' }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 4 })],
      pantryItems: [createPantryItem({ ingredientId: 'ing-chicken', quantity: 1000, unit: 'g' })],
    };

    const result = calculate(input);
    const chicken = result.byIngredient.find((r) => r.ingredientId === 'ing-chicken');
    expect(chicken!.missingQuantity).toBe(0);
    expect(chicken!.isMissing).toBe(false);
  });

  it('Test 3: Required 1000 g, have 1500 g -> missing 0', () => {
    const ingredient = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [ingredient],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-chicken', quantity: 1000, unit: 'g' }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 4 })],
      pantryItems: [createPantryItem({ ingredientId: 'ing-chicken', quantity: 1500, unit: 'g' })],
    };

    const result = calculate(input);
    const chicken = result.byIngredient.find((r) => r.ingredientId === 'ing-chicken');
    expect(chicken!.missingQuantity).toBe(0);
  });

  it('Test 4: Recipe A 2 peppers + Recipe B 3 peppers, have 4 peppers -> missing 1 pepper', () => {
    const pepper = createIngredient({ id: 'ing-pepper', name: 'Paprika', defaultUnit: 'kom' });
    const recipeA = createRecipe({ id: 'rec-a', baseServings: 4 });
    const recipeB = createRecipe({ id: 'rec-b', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [pepper],
      recipes: [recipeA, recipeB],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-a', ingredientId: 'ing-pepper', quantity: 2, unit: 'kom' }),
        createRecipeIngredient({ recipeId: 'rec-b', ingredientId: 'ing-pepper', quantity: 3, unit: 'kom' }),
      ],
      meals: [
        createMeal({ id: 'meal-a', recipeId: 'rec-a', servings: 4 }),
        createMeal({ id: 'meal-b', recipeId: 'rec-b', servings: 4 }),
      ],
      pantryItems: [createPantryItem({ ingredientId: 'ing-pepper', quantity: 4, unit: 'kom' })],
    };

    const result = calculate(input);
    const pepperResult = result.byIngredient.find((r) => r.ingredientId === 'ing-pepper');
    expect(pepperResult!.requiredQuantity).toBe(5);
    expect(pepperResult!.availableQuantity).toBe(4);
    expect(pepperResult!.missingQuantity).toBe(1);
    expect(pepperResult!.missingUnit).toBe('kom');
  });

  it('Test 5: 4 servings -> 6 servings, all ingredients scale correctly', () => {
    const chicken = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const rice = createIngredient({ id: 'ing-rice', name: 'Pirinač', defaultUnit: 'g' });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [chicken, rice],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-chicken', quantity: 600, unit: 'g' }),
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-rice', quantity: 300, unit: 'g' }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 6 })],
      pantryItems: [],
    };

    const result = calculate(input);
    const chickenResult = result.byIngredient.find((r) => r.ingredientId === 'ing-chicken');
    const riceResult = result.byIngredient.find((r) => r.ingredientId === 'ing-rice');

    expect(chickenResult!.requiredQuantity).toBe(900); // 600 * 6 / 4
    expect(riceResult!.requiredQuantity).toBe(450); // 300 * 6 / 4
  });

  it('Test 6: Meal changed to another recipe -> shopping list recalculated', () => {
    const chicken = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const pasta = createIngredient({ id: 'ing-pasta', name: 'Špagete', defaultUnit: 'g' });
    const chickenRecipe = createRecipe({ id: 'rec-chicken', baseServings: 4 });
    const pastaRecipe = createRecipe({ id: 'rec-pasta', baseServings: 4 });

    const inputBefore: CalculationInput = {
      ingredients: [chicken, pasta],
      recipes: [chickenRecipe, pastaRecipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-chicken', ingredientId: 'ing-chicken', quantity: 600, unit: 'g' }),
        createRecipeIngredient({ recipeId: 'rec-pasta', ingredientId: 'ing-pasta', quantity: 400, unit: 'g' }),
      ],
      meals: [createMeal({ id: 'meal-1', recipeId: 'rec-chicken', servings: 4 })],
      pantryItems: [],
    };

    const resultBefore = calculate(inputBefore);
    expect(resultBefore.shoppingList.some((i) => i.ingredientId === 'ing-chicken')).toBe(true);
    expect(resultBefore.shoppingList.some((i) => i.ingredientId === 'ing-pasta')).toBe(false);

    const inputAfter: CalculationInput = {
      ...inputBefore,
      meals: [createMeal({ id: 'meal-1', recipeId: 'rec-pasta', servings: 4 })],
    };

    const resultAfter = calculate(inputAfter);
    expect(resultAfter.shoppingList.some((i) => i.ingredientId === 'ing-pasta')).toBe(true);
    expect(resultAfter.shoppingList.some((i) => i.ingredientId === 'ing-chicken')).toBe(false);
  });

  it('Test 7: Meal deleted -> ingredients removed from calculations', () => {
    const chicken = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [chicken],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-chicken', quantity: 600, unit: 'g' }),
      ],
      meals: [],
      pantryItems: [],
    };

    const result = calculate(input);
    expect(result.byIngredient).toHaveLength(0);
    expect(result.shoppingList).toHaveLength(0);
  });

  it('Test 8: Cooked does not auto-reduce stock in calculation', () => {
    const chicken = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [chicken],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-chicken', quantity: 600, unit: 'g' }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 4, isCooked: true })],
      pantryItems: [createPantryItem({ ingredientId: 'ing-chicken', quantity: 300, unit: 'g' })],
    };

    const result = calculate(input);
    const chickenResult = result.byIngredient.find((r) => r.ingredientId === 'ing-chicken');
    // Calculation engine does not consume stock. It should still report missing 300 g.
    expect(chickenResult!.missingQuantity).toBe(300);
  });

  it('Test 9: Same ingredient in multiple recipes aggregated correctly', () => {
    const pepper = createIngredient({ id: 'ing-pepper', name: 'Paprika', defaultUnit: 'kom' });
    const recipeA = createRecipe({ id: 'rec-a', baseServings: 4 });
    const recipeB = createRecipe({ id: 'rec-b', baseServings: 4 });
    const recipeC = createRecipe({ id: 'rec-c', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [pepper],
      recipes: [recipeA, recipeB, recipeC],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-a', ingredientId: 'ing-pepper', quantity: 2, unit: 'kom' }),
        createRecipeIngredient({ recipeId: 'rec-b', ingredientId: 'ing-pepper', quantity: 3, unit: 'kom' }),
        createRecipeIngredient({ recipeId: 'rec-c', ingredientId: 'ing-pepper', quantity: 1, unit: 'kom' }),
      ],
      meals: [
        createMeal({ id: 'meal-a', recipeId: 'rec-a', servings: 4 }),
        createMeal({ id: 'meal-b', recipeId: 'rec-b', servings: 4 }),
        createMeal({ id: 'meal-c', recipeId: 'rec-c', servings: 4 }),
      ],
      pantryItems: [createPantryItem({ ingredientId: 'ing-pepper', quantity: 4, unit: 'kom' })],
    };

    const result = calculate(input);
    const pepperResult = result.byIngredient.find((r) => r.ingredientId === 'ing-pepper');
    expect(pepperResult!.requiredQuantity).toBe(6);
    expect(pepperResult!.missingQuantity).toBe(2);
  });

  it('Test 10: Offline data is preserved and recalculated consistently', () => {
    // This test verifies that the engine is deterministic and stateless:
    // the same input always produces the same output, so local changes can be
    // stored offline and recalculated later without data loss.
    const ingredient = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [ingredient],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-chicken', quantity: 1000, unit: 'g' }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 4 })],
      pantryItems: [createPantryItem({ ingredientId: 'ing-chicken', quantity: 500, unit: 'g' })],
    };

    const first = calculate(input);
    const second = calculate(input);
    expect(first).toEqual(second);
    expect(first.missing[0].missingQuantity).toBe(500);
  });

  it('converts compatible units (kg pantry to g required)', () => {
    const chicken = createIngredient({ id: 'ing-chicken', name: 'Piletina', defaultUnit: 'g' });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [chicken],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({ recipeId: 'rec-1', ingredientId: 'ing-chicken', quantity: 1200, unit: 'g' }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 4 })],
      pantryItems: [createPantryItem({ ingredientId: 'ing-chicken', quantity: 1, unit: 'kg' })],
    };

    const result = calculate(input);
    const chickenResult = result.byIngredient.find((r) => r.ingredientId === 'ing-chicken');
    expect(chickenResult!.requiredQuantity).toBe(1200);
    expect(chickenResult!.availableQuantity).toBe(1000);
    expect(chickenResult!.missingQuantity).toBe(200);
  });

  it('sums the same ingredient across two meals of the same recipe into one shopping row', () => {
    const flour = createIngredient({
      id: 'ing-flour',
      name: 'Prašak za pecivo',
      defaultUnit: 'pakovanje',
    });
    const recipe = createRecipe({ id: 'rec-pancakes', name: 'Palačinke', baseServings: 4 });
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
      meals: [
        createMeal({ id: 'meal-1', recipeId: 'rec-pancakes', date: '2026-09-01', servings: 4 }),
        createMeal({ id: 'meal-2', recipeId: 'rec-pancakes', date: '2026-09-02', servings: 4 }),
      ],
      pantryItems: [],
    };

    const result = calculate(input);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.requiredQuantity).toBe(8);
    expect(result.shoppingList).toHaveLength(1);
    expect(result.shoppingList[0]?.quantity).toBe(8);
    expect(result.shoppingList[0]?.sourceMealIds).toHaveLength(2);
  });

  it('treats so and sol as one salt ingredient named So', () => {
    const so = createIngredient({ id: 'ing-so', name: 'So', defaultUnit: 'kašičica' });
    const sol = createIngredient({ id: 'ing-sol', name: 'sol', defaultUnit: 'kašičica' });
    const pancakes = createRecipe({ id: 'rec-1', name: 'Palačinke', baseServings: 4 });
    const musaka = createRecipe({ id: 'rec-2', name: 'Musaka', baseServings: 6 });
    const input: CalculationInput = {
      ingredients: [so, sol],
      recipes: [pancakes, musaka],
      recipeIngredients: [
        createRecipeIngredient({
          id: 'ri-1',
          recipeId: 'rec-1',
          ingredientId: 'ing-sol',
          quantity: 4,
          unit: 'kašičica',
        }),
        createRecipeIngredient({
          id: 'ri-2',
          recipeId: 'rec-2',
          ingredientId: 'ing-so',
          quantity: 1,
          unit: 'kašičica',
        }),
      ],
      meals: [
        createMeal({ id: 'meal-1', recipeId: 'rec-1', servings: 4 }),
        createMeal({ id: 'meal-2', recipeId: 'rec-2', servings: 6 }),
      ],
      pantryItems: [],
    };

    const result = calculate(input);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.ingredientName).toBe('So');
    expect(result.missing[0]?.requiredQuantity).toBe(5);
    expect(result.shoppingList).toHaveLength(1);
    expect(result.shoppingList[0]?.name).toBe('So');
  });

  it('presence in stock is never missing even when the recipe needs more heads', () => {
    const onion = createIngredient({
      id: 'ing-onion',
      name: 'Crni luk',
      defaultUnit: 'glavica',
      trackPresence: true,
    });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [onion],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({
          recipeId: 'rec-1',
          ingredientId: 'ing-onion',
          quantity: 3,
          unit: 'glavica',
        }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 4 })],
      pantryItems: [createPantryItem({ ingredientId: 'ing-onion', quantity: 1, unit: 'glavica' })],
    };

    const result = calculate(input);
    const row = result.byIngredient.find((item) => item.ingredientId === 'ing-onion');
    expect(row?.requiredQuantity).toBe(3);
    expect(row?.isMissing).toBe(false);
    expect(row?.missingQuantity).toBe(0);
    expect(row?.trackPresence).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('presence out of stock is missing even with no meals this week', () => {
    const onion = createIngredient({
      id: 'ing-onion',
      name: 'Crni luk',
      defaultUnit: 'glavica',
      trackPresence: true,
    });
    const input: CalculationInput = {
      ingredients: [onion],
      recipes: [],
      recipeIngredients: [],
      meals: [],
      pantryItems: [createPantryItem({ ingredientId: 'ing-onion', quantity: 0, unit: 'glavica' })],
    };

    const result = calculate(input);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toMatchObject({
      ingredientId: 'ing-onion',
      trackPresence: true,
      isMissing: true,
      missingQuantity: 1,
      missingUnit: 'glavica',
    });
  });

  it('presence out of stock uses the planned quantity as missing', () => {
    const onion = createIngredient({
      id: 'ing-onion',
      name: 'Crni luk',
      defaultUnit: 'glavica',
      trackPresence: true,
    });
    const recipe = createRecipe({ id: 'rec-1', baseServings: 4 });
    const input: CalculationInput = {
      ingredients: [onion],
      recipes: [recipe],
      recipeIngredients: [
        createRecipeIngredient({
          recipeId: 'rec-1',
          ingredientId: 'ing-onion',
          quantity: 2,
          unit: 'glavica',
        }),
      ],
      meals: [createMeal({ recipeId: 'rec-1', servings: 4 })],
      pantryItems: [createPantryItem({ ingredientId: 'ing-onion', quantity: 0, unit: 'glavica' })],
    };

    const result = calculate(input);
    expect(result.missing[0]?.missingQuantity).toBe(2);
    expect(result.missing[0]?.requiredQuantity).toBe(2);
    expect(result.missing[0]?.trackPresence).toBe(true);
  });
});
