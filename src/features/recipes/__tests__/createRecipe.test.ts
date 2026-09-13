import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Ingredient, Recipe, RecipeIngredient } from '@/types';

jest.mock('@/services/repositories', () => ({
  ingredientRepository: {
    findAll: jest.fn(),
    insert: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  ingredientAliasRepository: {
    findAll: jest.fn(),
    findManyWhere: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
  recipeRepository: {
    insert: jest.fn(),
    update: jest.fn(),
  },
  recipeIngredientRepository: {
    insert: jest.fn(),
    findManyWhere: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  pantryItemRepository: {
    findManyWhere: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  shoppingItemRepository: {
    findManyWhere: jest.fn(async () => []),
    update: jest.fn(),
  },
  consumptionLogRepository: {
    findManyWhere: jest.fn(async () => []),
    update: jest.fn(),
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

import {
  ingredientAliasRepository,
  ingredientRepository,
  pantryItemRepository,
  recipeIngredientRepository,
  recipeRepository,
} from '@/services/repositories';
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

const ingredients = ingredientRepository as unknown as {
  insert: jest.Mock<(item: Ingredient) => Promise<Ingredient>>;
  findById: jest.Mock<(id: string) => Promise<Ingredient | null>>;
  update: jest.Mock<(item: Ingredient) => Promise<Ingredient>>;
  delete: jest.Mock<(id: string) => Promise<void>>;
};

const aliases = ingredientAliasRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<unknown[]>>;
  insert: jest.Mock<(row: unknown) => Promise<unknown>>;
};

const normalize = normalizeIngredientName as unknown as jest.Mock<
  (...args: never[]) => Promise<{
    ingredient: Ingredient | null;
    aliases: string[];
    confidence: 'exact' | 'none';
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

const salt: Ingredient = {
  id: 'so-id',
  name: 'So',
  category: 'Ostalo',
  defaultUnit: 'kašičica',
  emoji: null,
  trackPresence: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const pinch: Ingredient = {
  ...salt,
  id: 'pinch-id',
  name: 'prstenak soli',
};

const recipe: Recipe = {
  id: 'rec-1',
  name: 'Supa',
  description: null,
  imageUri: null,
  baseServings: 4,
  prepTimeMinutes: null,
  mealTypes: ['Ručak'],
  dishType: null,
  isFavorite: false,
  steps: ['Kuvaj.'],
  notes: null,
  emoji: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

describe('saving a recipe with Preimenuj and Poveži', () => {
  beforeEach(() => {
    recipes.insert.mockReset();
    recipes.update.mockReset();
    recipeIngredients.insert.mockReset();
    recipeIngredients.findManyWhere.mockReset();
    recipeIngredients.delete.mockReset();
    pantry.findManyWhere.mockReset();
    pantry.insert.mockReset();
    ingredients.insert.mockReset();
    ingredients.findById.mockReset();
    ingredients.update.mockReset();
    ingredients.delete.mockReset();
    aliases.findManyWhere.mockReset();
    aliases.insert.mockReset();
    recipes.insert.mockImplementation(async (item) => item);
    recipes.update.mockImplementation(async (item) => item);
    recipeIngredients.insert.mockImplementation(async (item) => item);
    recipeIngredients.findManyWhere.mockResolvedValue([]);
    ingredients.insert.mockImplementation(async (item) => item);
    ingredients.update.mockImplementation(async (item) => item);
    aliases.findManyWhere.mockResolvedValue([]);
    aliases.insert.mockImplementation(async (row) => row);
    pantry.findManyWhere.mockResolvedValue([]);
    normalize.mockReset();
  });

  it('links to an existing ingredient and aliases the imported name', async () => {
    ingredients.findById.mockResolvedValue(salt);

    await createRecipeWithIngredients({
      name: 'Supa',
      baseServings: 4,
      steps: ['Kuvaj.'],
      ingredients: [
        {
          rawName: 'So',
          sourceName: 'prstenak soli',
          linkToIngredientId: 'so-id',
          quantity: 1,
          unit: 'kašičica',
        },
      ],
    });

    expect(ingredients.insert).not.toHaveBeenCalled();
    expect(recipeIngredients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 'so-id' })
    );
    expect(aliases.insert).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 'so-id', alias: 'prstenak soli' })
    );
  });

  it('renames to an existing kitchen name by using it and aliasing the source', async () => {
    normalize.mockResolvedValue({
      ingredient: salt,
      aliases: [],
      confidence: 'exact',
    });

    await createRecipeWithIngredients({
      name: 'Supa',
      baseServings: 4,
      steps: ['Kuvaj.'],
      ingredients: [
        {
          rawName: 'So',
          sourceName: 'prstenak soli',
          quantity: 1,
          unit: 'kašičica',
        },
      ],
    });

    expect(ingredients.insert).not.toHaveBeenCalled();
    expect(recipeIngredients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 'so-id' })
    );
    expect(aliases.insert).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 'so-id', alias: 'prstenak soli' })
    );
  });

  it('creates a kitchen ingredient when the renamed name does not exist', async () => {
    normalize.mockResolvedValue({ ingredient: null, aliases: [], confidence: 'none' });

    await createRecipeWithIngredients({
      name: 'Supa',
      baseServings: 4,
      steps: ['Kuvaj.'],
      ingredients: [
        {
          rawName: 'Morska so',
          sourceName: 'prstenak soli',
          quantity: 1,
          unit: 'kašičica',
        },
      ],
    });

    expect(ingredients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Morska so' })
    );
    expect(aliases.insert).toHaveBeenCalledWith(
      expect.objectContaining({ alias: 'prstenak soli' })
    );
  });

  it('absorbs the previous kitchen ingredient when an edited recipe line is linked', async () => {
    ingredients.findById.mockImplementation(async (id) => {
      if (id === 'so-id') return salt;
      if (id === 'pinch-id') return pinch;
      return null;
    });

    await updateRecipeWithIngredients(recipe, {
      name: 'Supa',
      baseServings: 4,
      steps: ['Kuvaj.'],
      ingredients: [
        {
          ingredientId: 'pinch-id',
          rawName: 'So',
          sourceName: 'prstenak soli',
          linkToIngredientId: 'so-id',
          quantity: 1,
          unit: 'kašičica',
        },
      ],
    });

    expect(ingredients.delete).toHaveBeenCalledWith('pinch-id');
    expect(recipeIngredients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 'so-id' })
    );
    expect(aliases.insert).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 'so-id', alias: 'prstenak soli' })
    );
  });
});
