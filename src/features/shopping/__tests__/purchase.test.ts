import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Ingredient, PantryItem, ShoppingItem } from '@/types';

jest.mock('@/services/repositories', () => ({
  shoppingItemRepository: {
    delete: jest.fn(),
  },
  pantryItemRepository: {
    findManyWhere: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
  ingredientRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
  },
  recipeIngredientRepository: {},
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-10T12:00:00.000Z',
}));

jest.mock('@/lib/uuid', () => ({
  generateUUID: () => 'pantry-new',
}));

jest.mock('@/features/recipes/service', () => ({
  resolveOrCreateIngredient: jest.fn(),
}));

import {
  ingredientRepository,
  pantryItemRepository,
  shoppingItemRepository,
} from '@/services/repositories';
import { resolveOrCreateIngredient } from '@/features/recipes/service';
import { addPurchasedQuantity, purchaseCheckedItems } from '../purchase';

const resolveIngredient = resolveOrCreateIngredient as unknown as jest.Mock<
  (...args: never[]) => Promise<{ ingredient: Ingredient }>
>;

const pantry = pantryItemRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<PantryItem[]>>;
  insert: jest.Mock<(item: PantryItem) => Promise<PantryItem>>;
  update: jest.Mock<(item: PantryItem) => Promise<PantryItem>>;
};

const ingredients = ingredientRepository as unknown as {
  findAll: jest.Mock<() => Promise<Ingredient[]>>;
  findById: jest.Mock<(id: string) => Promise<Ingredient | null>>;
};

const shopping = shoppingItemRepository as unknown as {
  delete: jest.Mock<(id: string) => Promise<void>>;
};

function pantryItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: 'pantry-1',
    ingredientId: 'ing-flour',
    quantity: 200,
    unit: 'g',
    expiresAt: null,
    notes: null,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    ...overrides,
  };
}

function ingredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-flour',
    name: 'Brašno',
    category: 'Testenine i žitarice',
    defaultUnit: 'g',
    emoji: null,
    trackPresence: false,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    ...overrides,
  };
}

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'shop-1',
    shoppingListId: 'list-1',
    ingredientId: 'ing-flour',
    name: 'Brašno',
    quantity: 500,
    unit: 'g',
    category: 'Testenine i žitarice',
    isChecked: true,
    isManual: false,
    sourceMealIds: [],
    notes: null,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    ...overrides,
  };
}

describe('addPurchasedQuantity', () => {
  it('adds the same unit onto existing stock', () => {
    const next = addPurchasedQuantity(pantryItem({ quantity: 200, unit: 'g' }), 500, 'g');
    expect(next.quantity).toBe(700);
    expect(next.unit).toBe('g');
  });

  it('converts kg into pantry grams', () => {
    const next = addPurchasedQuantity(pantryItem({ quantity: 200, unit: 'g' }), 1, 'kg');
    expect(next.quantity).toBe(1200);
    expect(next.unit).toBe('g');
  });

  it('takes the shopping unit when the kitchen row is empty and units differ', () => {
    const next = addPurchasedQuantity(pantryItem({ quantity: 0, unit: 'kom' }), 500, 'g');
    expect(next.quantity).toBe(500);
    expect(next.unit).toBe('g');
  });
});

describe('purchaseCheckedItems', () => {
  beforeEach(() => {
    pantry.findManyWhere.mockReset();
    pantry.insert.mockReset();
    pantry.update.mockReset();
    ingredients.findAll.mockReset();
    ingredients.findById.mockReset();
    shopping.delete.mockReset();
    pantry.insert.mockImplementation(async (item) => item);
    pantry.update.mockImplementation(async (item) => item);
    pantry.findManyWhere.mockResolvedValue([pantryItem()]);
    ingredients.findAll.mockResolvedValue([ingredient()]);
    ingredients.findById.mockResolvedValue(ingredient());
  });

  it('adds purchased quantity and deletes checked counted items', async () => {
    await purchaseCheckedItems([
      shoppingItem(),
      shoppingItem({ id: 'shop-2', isChecked: false, quantity: 100 }),
    ]);

    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 700, unit: 'g' })
    );
    expect(shopping.delete).toHaveBeenCalledTimes(1);
    expect(shopping.delete).toHaveBeenCalledWith('shop-1');
  });

  it('sets presence ingredients to in stock and ignores the list quantity', async () => {
    const onion = ingredient({
      id: 'ing-onion',
      name: 'Crni luk',
      defaultUnit: 'glavica',
      trackPresence: true,
    });
    pantry.findManyWhere.mockResolvedValue([
      pantryItem({ id: 'pantry-onion', ingredientId: 'ing-onion', quantity: 0, unit: 'glavica' }),
    ]);
    ingredients.findAll.mockResolvedValue([onion]);
    ingredients.findById.mockResolvedValue(onion);

    await purchaseCheckedItems([
      shoppingItem({
        id: 'shop-onion',
        ingredientId: 'ing-onion',
        name: 'Crni luk',
        quantity: 3,
        unit: 'glavica',
      }),
    ]);

    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pantry-onion', quantity: 1 })
    );
    expect(shopping.delete).toHaveBeenCalledWith('shop-onion');
  });

  it('keeps units that cannot convert in a separate kitchen row', async () => {
    pantry.findManyWhere.mockResolvedValue([
      pantryItem({ id: 'pantry-eggs', ingredientId: 'ing-eggs', quantity: 2, unit: 'kom' }),
    ]);
    ingredients.findAll.mockResolvedValue([ingredient({ id: 'ing-eggs', name: 'Jaja', defaultUnit: 'kom' })]);
    ingredients.findById.mockResolvedValue(ingredient({ id: 'ing-eggs', name: 'Jaja', defaultUnit: 'kom' }));

    await purchaseCheckedItems([
      shoppingItem({ id: 'shop-eggs', ingredientId: 'ing-eggs', name: 'Jaja', quantity: 1, unit: 'pakovanje' }),
    ]);

    expect(pantry.update).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'pantry-eggs' }));
    expect(pantry.insert).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 'ing-eggs', unit: 'pakovanje' })
    );
    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pantry-new', quantity: 1, unit: 'pakovanje' })
    );
  });

  it('puts manually added items into the kitchen too', async () => {
    const salt = ingredient({ id: 'ing-salt', name: 'So', defaultUnit: 'pakovanje' });
    resolveIngredient.mockResolvedValue({ ingredient: salt });
    pantry.findManyWhere.mockResolvedValue([]);
    ingredients.findById.mockResolvedValue(salt);

    await purchaseCheckedItems([
      shoppingItem({ id: 'shop-salt', ingredientId: null, name: 'So', isManual: true, quantity: 1, unit: 'pakovanje' }),
    ]);

    expect(resolveIngredient).toHaveBeenCalledWith('So', 'pakovanje', 'Ostalo');
    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 'ing-salt', quantity: 1, unit: 'pakovanje' })
    );
    expect(shopping.delete).toHaveBeenCalledWith('shop-salt');
  });
});
