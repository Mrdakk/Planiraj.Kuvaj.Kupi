import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Ingredient, PantryItem } from '@/types';
import { sortPantryItemsByIngredientName } from '../sort';

jest.mock('@/features/recipes/service', () => ({
  resolveOrCreateIngredient: jest.fn(),
}));

jest.mock('@/services/repositories', () => ({
  pantryItemRepository: {
    insert: jest.fn(),
    findManyWhere: jest.fn(),
  },
  ingredientRepository: {
    update: jest.fn(),
  },
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-10T12:00:00.000Z',
}));

jest.mock('@/lib/uuid', () => ({
  generateUUID: () => 'pantry-new',
}));

import { resolveOrCreateIngredient } from '@/features/recipes/service';
import { pantryItemRepository, ingredientRepository } from '@/services/repositories';
import { addPantryItem } from '../service';

function item(id: string, ingredientId: string): PantryItem {
  return {
    id,
    ingredientId,
    quantity: 1,
    unit: 'kom',
    expiresAt: null,
    notes: null,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
  };
}

describe('sortPantryItemsByIngredientName', () => {
  it('sorts by ingredient name, not by pantry row fields', () => {
    const names = new Map([
      ['ing-b', 'Biber'],
      ['ing-a', 'Crni luk'],
    ]);
    const sorted = sortPantryItemsByIngredientName(
      [item('2', 'ing-b'), item('1', 'ing-a')],
      (ingredientId) => names.get(ingredientId) ?? ''
    );
    expect(sorted.map((row) => row.ingredientId)).toEqual(['ing-b', 'ing-a']);
  });

  it('keeps zero-quantity items at the bottom', () => {
    const names = new Map([
      ['ing-a', 'Avokado'],
      ['ing-z', 'So'],
      ['ing-b', 'Biber'],
    ]);
    const sorted = sortPantryItemsByIngredientName(
      [
        { ...item('1', 'ing-a'), quantity: 0 },
        { ...item('2', 'ing-z'), quantity: 1 },
        { ...item('3', 'ing-b'), quantity: 0 },
      ],
      (ingredientId) => names.get(ingredientId) ?? ''
    );
    expect(sorted.map((row) => row.ingredientId)).toEqual(['ing-z', 'ing-a', 'ing-b']);
  });
});

const resolve = resolveOrCreateIngredient as unknown as jest.Mock<
  (...args: never[]) => Promise<{ ingredient: Ingredient; isNew: boolean; aliases: string[] }>
>;
const pantry = pantryItemRepository as unknown as {
  insert: jest.Mock<(item: PantryItem) => Promise<PantryItem>>;
  findManyWhere: jest.Mock<(...args: never[]) => Promise<PantryItem[]>>;
};
const ingredientsRepo = ingredientRepository as unknown as {
  update: jest.Mock<(item: Ingredient) => Promise<Ingredient>>;
};

function createIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-1',
    name: 'Paradajz',
    category: 'Povrće',
    defaultUnit: 'kom',
    emoji: null,
    trackPresence: false,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('addPantryItem', () => {
  beforeEach(() => {
    resolve.mockReset();
    pantry.insert.mockReset();
    pantry.findManyWhere.mockReset();
    ingredientsRepo.update.mockReset();
    pantry.insert.mockImplementation(async (row) => row);
    pantry.findManyWhere.mockResolvedValue([]);
    ingredientsRepo.update.mockImplementation(async (row) => row);
    resolve.mockResolvedValue({
      ingredient: createIngredient(),
      isNew: true,
      aliases: [],
    });
  });

  it('passes the chosen category when creating the ingredient', async () => {
    await addPantryItem({
      rawName: 'Paradajz',
      quantity: 4,
      unit: 'kom',
      category: 'Povrće',
    });

    expect(resolve).toHaveBeenCalledWith('Paradajz', 'kom', 'Povrće');
  });

  it('defaults to Ostalo when no category is given', async () => {
    await addPantryItem({
      rawName: 'So',
      quantity: 1,
      unit: 'kašičica',
    });

    expect(resolve).toHaveBeenCalledWith('So', 'kašičica', 'Ostalo');
  });

  it('rejects a second kitchen item with the same ingredient', async () => {
    pantry.findManyWhere.mockResolvedValue([item('pantry-1', 'ing-1')]);

    await expect(
      addPantryItem({
        rawName: 'paradajz',
        quantity: 2,
        unit: 'kom',
      })
    ).rejects.toMatchObject({
      name: 'DuplicateKitchenItemError',
      message: 'Paradajz već postoji u kuhinji.',
    });

    expect(pantry.insert).not.toHaveBeenCalled();
  });

  it('stores presence ingredients as in stock without using the typed quantity', async () => {
    await addPantryItem({
      rawName: 'Crni luk',
      quantity: 6,
      unit: 'glavica',
      trackPresence: true,
    });

    expect(ingredientsRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ trackPresence: true })
    );
    expect(pantry.insert).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1 }));
  });
});
