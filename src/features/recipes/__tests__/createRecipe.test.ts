import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Ingredient, Recipe, RecipeIngredient } from '@/types';

jest.mock('@/services/repositories', () => ({
  ingredientRepository: {
    findAll: jest.fn(),
    insert: jest.fn(),
    findById: jest.fn(),
  },
  ingredientAliasRepository: {
    findAll: jest.fn(),
    insert: jest.fn(),
  },
  recipeRepository: {
    insert: jest.fn(),
    update: jest.fn(),
  },
  recipeIngredientRepository: {
    insert: jest.fn(),
    findManyWhere: jest.fn(),
    delete: jest.fn(),
  },
  pantryItemRepository: {
    findManyWhere: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock('@/services/ingredientNormalizer', () => ({
  normalizeIngredientName: jest.fn(),
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-12T12:00:00.000Z',
}));

jest.mock('@/lib/uuid', () => ({
  generateUUID: () => 'new-id',
}));

import { pantryItemRepository, recipeIngredientRepository, recipeRepository } from '@/services/repositories';
import { normalizeIngredientName } from '@/services/ingredientNormalizer';
import { createRecipeWithIngredients, updateRecipeWithIngredients } from '../service';

const recipes = recipeRepository as unknown as {
  insert: jest.Mock<(item: Recipe) => Promise<Recipe>>;
  update: jest.Mock<(item: Recipe) => Promise<Recipe>>;
};

const recipeIngredients = recipeIngredientRepository as unknown as {
  insert: jest.Mock<(item: RecipeIngredient) => Promise<RecipeIngredient>>;
  findManyWhere: jest.Mock<(...args: never[]) => Promise<RecipeIngredient[]>>;
  delete: jest.Mock<(id: string) => Promise<void>>;
};

const pantry = pantryItemRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<unknown[]>>;
  insert: jest.Mock<(item: unknown) => Promise<unknown>>;
};

const normalize = normalizeIngredientName as unknown as jest.Mock<
  (...args: never[]) => Promise<{
    ingredient: Ingredient | null;
    aliases: string[];
    confidence: 'exact' | 'alias' | 'suggested' | 'none';
  }>
>;

const existingIngredient: Ingredient = {
  id: 'ing-1',
  name: 'Pasulj',
  category: 'Ostalo',
  defaultUnit: 'g',
  emoji: null,
  trackPresence: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const input = {
  name: 'Pasulj',
  baseServings: 4,
  steps: ['Kuvaj.'],
  ingredients: [{ rawName: 'Pasulj', quantity: 500, unit: 'g' as const }],
};

describe('saving a recipe leaves the kitchen unchanged', () => {
  beforeEach(() => {
    recipes.insert.mockReset();
    recipes.update.mockReset();
    recipeIngredients.insert.mockReset();
    recipeIngredients.findManyWhere.mockReset();
    recipeIngredients.delete.mockReset();
    pantry.findManyWhere.mockReset();
    pantry.insert.mockReset();
    recipes.insert.mockImplementation(async (item) => item);
    recipes.update.mockImplementation(async (item) => item);
    recipeIngredients.insert.mockImplementation(async (item) => item);
    recipeIngredients.findManyWhere.mockResolvedValue([]);
    normalize.mockReset();
    normalize.mockResolvedValue({
      ingredient: existingIngredient,
      aliases: [],
      confidence: 'exact',
    });
  });

  it('createRecipeWithIngredients does not insert or look up pantry rows', async () => {
    await createRecipeWithIngredients(input);

    expect(recipes.insert).toHaveBeenCalledTimes(1);
    expect(recipes.insert.mock.calls[0]?.[0]).toMatchObject({
      mealTypes: ['Ručak'],
      dishType: null,
    });
    expect(recipeIngredients.insert).toHaveBeenCalledTimes(1);
    expect(pantry.insert).not.toHaveBeenCalled();
    expect(pantry.findManyWhere).not.toHaveBeenCalled();
  });

  it('updateRecipeWithIngredients does not insert or look up pantry rows', async () => {
    const recipe: Recipe = {
      id: 'rec-1',
      name: 'Pasulj',
      description: null,
      imageUri: null,
      baseServings: 4,
      prepTimeMinutes: null,
      mealTypes: [],
      dishType: null,
      isFavorite: false,
      steps: ['Kuvaj.'],
      notes: null,
      emoji: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    await updateRecipeWithIngredients(recipe, input);

    expect(recipes.update).toHaveBeenCalledTimes(1);
    expect(pantry.insert).not.toHaveBeenCalled();
    expect(pantry.findManyWhere).not.toHaveBeenCalled();
  });
});
