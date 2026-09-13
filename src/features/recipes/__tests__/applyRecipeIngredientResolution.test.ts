import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Ingredient } from '@/types';

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
  recipeRepository: {},
  recipeIngredientRepository: {
    findManyWhere: jest.fn(),
    update: jest.fn(),
  },
  pantryItemRepository: {
    findManyWhere: jest.fn(async () => []),
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
  nowISO: () => '2026-09-13T12:00:00.000Z',
}));

jest.mock('@/lib/uuid', () => ({
  generateUUID: () => 'alias-new',
}));

jest.mock('@/features/ingredients/link', () => ({
  linkIngredients: jest.fn(),
  ensureAlias: jest.fn(),
}));

import { ingredientRepository } from '@/services/repositories';
import { normalizeIngredientName } from '@/services/ingredientNormalizer';
import { ensureAlias, linkIngredients } from '@/features/ingredients/link';
import { applyRecipeIngredientResolution } from '../service';

const link = linkIngredients as unknown as jest.Mock<
  (absorbId: string, keepId: string) => Promise<void>
>;
const alias = ensureAlias as unknown as jest.Mock<(ingredientId: string, name: string) => Promise<void>>;

const ingredients = ingredientRepository as unknown as {
  insert: jest.Mock<(item: Ingredient) => Promise<Ingredient>>;
  findById: jest.Mock<(id: string) => Promise<Ingredient | null>>;
  update: jest.Mock<(item: Ingredient) => Promise<Ingredient>>;
};

const normalize = normalizeIngredientName as unknown as jest.Mock<
  (...args: never[]) => Promise<{
    ingredient: Ingredient | null;
    aliases: string[];
    confidence: 'exact' | 'none';
  }>
>;

function ingredient(id: string, name: string): Ingredient {
  return {
    id,
    name,
    category: 'Ostalo',
    defaultUnit: 'g',
    emoji: null,
    trackPresence: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

const salt = ingredient('so-id', 'So');
const pinch = ingredient('pinch-id', 'prstenak soli');

describe('applyRecipeIngredientResolution', () => {
  beforeEach(() => {
    ingredients.insert.mockReset();
    ingredients.findById.mockReset();
    ingredients.update.mockReset();
    ingredients.insert.mockImplementation(async (item) => item);
    ingredients.update.mockImplementation(async (item) => item);
    normalize.mockReset();
    link.mockReset();
    alias.mockReset();
    link.mockImplementation(async () => undefined);
    alias.mockImplementation(async () => undefined);
  });

  it('links to an existing ingredient and aliases the source name without creating a new one', async () => {
    ingredients.findById.mockImplementation(async (id) => (id === 'so-id' ? salt : null));

    const result = await applyRecipeIngredientResolution({
      rawName: 'So',
      sourceName: 'prstenak soli',
      linkToIngredientId: 'so-id',
      quantity: 1,
      unit: 'kašičica',
    });

    expect(result.ingredient.id).toBe('so-id');
    expect(result.isNew).toBe(false);
    expect(ingredients.insert).not.toHaveBeenCalled();
    expect(link).not.toHaveBeenCalled();
    expect(alias).toHaveBeenCalledWith('so-id', 'prstenak soli');
  });

  it('renames to an existing name by merging and aliasing the source', async () => {
    normalize.mockResolvedValue({
      ingredient: salt,
      aliases: [],
      confidence: 'exact',
    });

    const result = await applyRecipeIngredientResolution({
      rawName: 'So',
      sourceName: 'prstenak soli',
      quantity: 1,
      unit: 'kašičica',
    });

    expect(result.ingredient.id).toBe('so-id');
    expect(ingredients.insert).not.toHaveBeenCalled();
    expect(alias).toHaveBeenCalledWith('so-id', 'prstenak soli');
  });

  it('creates a new ingredient when renamed to a name that does not exist', async () => {
    normalize.mockResolvedValue({ ingredient: null, aliases: [], confidence: 'none' });

    const result = await applyRecipeIngredientResolution({
      rawName: 'Morska so',
      sourceName: 'prstenak soli',
      quantity: 1,
      unit: 'kašičica',
    });

    expect(result.isNew).toBe(true);
    expect(ingredients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Morska so' })
    );
    expect(alias).toHaveBeenCalledWith(result.ingredient.id, 'prstenak soli');
  });

  it('absorbs the previous ingredient when an edited recipe line is linked', async () => {
    ingredients.findById.mockImplementation(async (id) => {
      if (id === 'so-id') return salt;
      if (id === 'pinch-id') return pinch;
      return null;
    });

    const result = await applyRecipeIngredientResolution({
      ingredientId: 'pinch-id',
      rawName: 'So',
      sourceName: 'prstenak soli',
      linkToIngredientId: 'so-id',
      quantity: 1,
      unit: 'kašičica',
    });

    expect(result.ingredient.id).toBe('so-id');
    expect(link).toHaveBeenCalledWith('pinch-id', 'so-id');
    expect(alias).toHaveBeenCalledWith('so-id', 'prstenak soli');
  });

  it('renames the existing kitchen ingredient in place when the new name is unique', async () => {
    ingredients.findById.mockResolvedValue(pinch);
    normalize.mockResolvedValue({ ingredient: null, aliases: [], confidence: 'none' });

    const result = await applyRecipeIngredientResolution({
      ingredientId: 'pinch-id',
      rawName: 'Morska so',
      sourceName: 'prstenak soli',
      quantity: 1,
      unit: 'kašičica',
    });

    expect(result.ingredient.id).toBe('pinch-id');
    expect(result.ingredient.name).toBe('Morska so');
    expect(ingredients.insert).not.toHaveBeenCalled();
    expect(link).not.toHaveBeenCalled();
    expect(ingredients.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pinch-id', name: 'Morska so' })
    );
    expect(alias).toHaveBeenCalledWith('pinch-id', 'prstenak soli');
  });
});
