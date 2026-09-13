import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Ingredient } from '@/types';

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
  recipeRepository: {},
  recipeIngredientRepository: {},
  pantryItemRepository: {
    findManyWhere: jest.fn(async () => []),
    insert: jest.fn(),
  },
}));

jest.mock('@/services/ingredientNormalizer', () => ({
  normalizeIngredientName: jest.fn(),
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-10T12:00:00.000Z',
}));

jest.mock('@/lib/uuid', () => ({
  generateUUID: () => 'ing-new',
}));

import { ingredientRepository } from '@/services/repositories';
import { normalizeIngredientName } from '@/services/ingredientNormalizer';
import { resolveOrCreateIngredient } from '../service';

const ingredients = ingredientRepository as unknown as {
  insert: jest.Mock<(item: Ingredient) => Promise<Ingredient>>;
};

const normalize = normalizeIngredientName as unknown as jest.Mock<
  (...args: never[]) => Promise<{
    ingredient: Ingredient | null;
    aliases: string[];
    confidence: 'exact' | 'alias' | 'none';
  }>
>;

describe('resolveOrCreateIngredient category', () => {
  beforeEach(() => {
    ingredients.insert.mockReset();
    ingredients.insert.mockImplementation(async (item) => item);
    normalize.mockReset();
    normalize.mockResolvedValue({ ingredient: null, aliases: [], confidence: 'none' });
  });

  it('stores the provided category on a new ingredient', async () => {
    const result = await resolveOrCreateIngredient('Malina', 'g', 'Voće');

    expect(ingredients.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Malina',
        category: 'Voće',
        defaultUnit: 'g',
      })
    );
    expect(result.ingredient.category).toBe('Voće');
    expect(result.isNew).toBe(true);
  });

  it('keeps Ostalo when no category is passed', async () => {
    await resolveOrCreateIngredient('So', 'kašičica');

    expect(ingredients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Ostalo' })
    );
  });

  it('creates a new ingredient instead of merging an alias match', async () => {
    normalize.mockResolvedValue({
      ingredient: {
        id: 'jogurt-id',
        name: 'Jogurt',
        category: 'Mlečni proizvodi',
        defaultUnit: 'g',
        emoji: null,
        trackPresence: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      aliases: ['grčki jogurt'],
      confidence: 'alias',
    });

    const result = await resolveOrCreateIngredient(
      'grčki jogurt',
      'g',
      'Mlečni proizvodi'
    );

    expect(ingredients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'grčki jogurt' })
    );
    expect(result.isNew).toBe(true);
    expect(result.ingredient.id).not.toBe('jogurt-id');
  });
});
