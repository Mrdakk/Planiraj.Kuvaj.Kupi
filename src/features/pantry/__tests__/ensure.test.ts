import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PantryItem } from '@/types';

jest.mock('@/services/repositories', () => ({
  pantryItemRepository: {
    findManyWhere: jest.fn(),
    findAll: jest.fn(),
    insert: jest.fn(),
  },
  recipeIngredientRepository: {
    findAll: jest.fn(),
  },
  ingredientRepository: {
    findById: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-10T12:00:00.000Z',
}));

jest.mock('@/lib/uuid', () => ({
  generateUUID: () => 'pantry-zero',
}));

import { pantryItemRepository, recipeIngredientRepository, ingredientRepository } from '@/services/repositories';
import { ensurePantryPresence, ensureKitchenItemsFromRecipes } from '../ensure';
import type { Ingredient } from '@/types';

const pantry = pantryItemRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<PantryItem[]>>;
  findAll: jest.Mock<(...args: never[]) => Promise<PantryItem[]>>;
  insert: jest.Mock<(item: PantryItem) => Promise<PantryItem>>;
};

const recipeIngredients = recipeIngredientRepository as unknown as {
  findAll: jest.Mock<(...args: never[]) => Promise<{ ingredientId: string; unit: string }[]>>;
};

const ingredients = ingredientRepository as unknown as {
  findById: jest.Mock<(id: string) => Promise<Ingredient | null>>;
  findAll: jest.Mock<() => Promise<Ingredient[]>>;
};

function presenceIngredient(id: string): Ingredient {
  return {
    id,
    name: 'Crni luk',
    category: 'Povrće',
    defaultUnit: 'glavica',
    emoji: null,
    trackPresence: true,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };
}

describe('ensurePantryPresence', () => {
  beforeEach(() => {
    pantry.findManyWhere.mockReset();
    pantry.insert.mockReset();
    pantry.insert.mockImplementation(async (item) => item);
    ingredients.findById.mockReset();
    ingredients.findById.mockResolvedValue(null);
  });

  it('inserts a zero-quantity kitchen item when the ingredient is missing', async () => {
    pantry.findManyWhere.mockResolvedValue([]);

    const created = await ensurePantryPresence('ing-water', 'ml');

    expect(pantry.insert).toHaveBeenCalledTimes(1);
    expect(created).toMatchObject({
      ingredientId: 'ing-water',
      quantity: 0,
      unit: 'ml',
    });
  });

  it('does not insert when the ingredient is already in the kitchen', async () => {
    const existing: PantryItem = {
      id: 'pantry-1',
      ingredientId: 'ing-tomato',
      quantity: 8,
      unit: 'kom',
      expiresAt: null,
      notes: null,
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    };
    pantry.findManyWhere.mockResolvedValue([existing]);

    const result = await ensurePantryPresence('ing-tomato', 'kom');

    expect(pantry.insert).not.toHaveBeenCalled();
    expect(result.id).toBe('pantry-1');
    expect(result.quantity).toBe(8);
  });

  it('inserts an in-stock kitchen item when the ingredient tracks presence', async () => {
    pantry.findManyWhere.mockResolvedValue([]);
    ingredients.findById.mockResolvedValue(presenceIngredient('ing-onion'));

    const created = await ensurePantryPresence('ing-onion', 'glavica');

    expect(created).toMatchObject({
      ingredientId: 'ing-onion',
      quantity: 1,
      unit: 'glavica',
    });
  });
});

describe('ensureKitchenItemsFromRecipes', () => {
  beforeEach(() => {
    pantry.findAll.mockReset();
    pantry.findManyWhere.mockReset();
    pantry.insert.mockReset();
    pantry.insert.mockImplementation(async (item) => item);
    recipeIngredients.findAll.mockReset();
    ingredients.findAll.mockReset();
    ingredients.findAll.mockResolvedValue([]);
  });

  it('adds missing recipe ingredients with quantity 0', async () => {
    recipeIngredients.findAll.mockResolvedValue([
      { ingredientId: 'ing-water', unit: 'ml' },
      { ingredientId: 'ing-tomato', unit: 'kom' },
    ]);
    pantry.findAll.mockResolvedValue([
      {
        id: 'pantry-1',
        ingredientId: 'ing-tomato',
        quantity: 8,
        unit: 'kom',
        expiresAt: null,
        notes: null,
        createdAt: '2026-09-10T12:00:00.000Z',
        updatedAt: '2026-09-10T12:00:00.000Z',
      },
    ]);

    await ensureKitchenItemsFromRecipes();

    expect(pantry.insert).toHaveBeenCalledTimes(1);
    expect(pantry.insert.mock.calls[0]?.[0]).toMatchObject({
      ingredientId: 'ing-water',
      quantity: 0,
      unit: 'ml',
    });
  });

  it('adds missing presence ingredients as in stock', async () => {
    recipeIngredients.findAll.mockResolvedValue([{ ingredientId: 'ing-onion', unit: 'glavica' }]);
    pantry.findAll.mockResolvedValue([]);
    ingredients.findAll.mockResolvedValue([presenceIngredient('ing-onion')]);

    await ensureKitchenItemsFromRecipes();

    expect(pantry.insert.mock.calls[0]?.[0]).toMatchObject({
      ingredientId: 'ing-onion',
      quantity: 1,
      unit: 'glavica',
    });
  });
});
