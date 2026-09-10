import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type {
  ConsumptionLog,
  Ingredient,
  IngredientAlias,
  PantryItem,
  RecipeIngredient,
  ShoppingItem,
} from '@/types';

jest.mock('@/services/repositories', () => ({
  ingredientRepository: {
    findById: jest.fn(),
    delete: jest.fn(),
  },
  ingredientAliasRepository: {
    findManyWhere: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
  recipeIngredientRepository: {
    findManyWhere: jest.fn(),
    update: jest.fn(),
  },
  pantryItemRepository: {
    findManyWhere: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  shoppingItemRepository: {
    findManyWhere: jest.fn(),
    update: jest.fn(),
  },
  consumptionLogRepository: {
    findManyWhere: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-10T18:00:00.000Z',
}));

jest.mock('@/lib/uuid', () => ({
  generateUUID: () => 'alias-new',
}));

import {
  consumptionLogRepository,
  ingredientAliasRepository,
  ingredientRepository,
  pantryItemRepository,
  recipeIngredientRepository,
  shoppingItemRepository,
} from '@/services/repositories';
import { linkIngredients, linkableIngredients } from '../link';

const ingredients = ingredientRepository as unknown as {
  findById: jest.Mock<(id: string) => Promise<Ingredient | null>>;
  delete: jest.Mock<(id: string) => Promise<void>>;
};
const aliases = ingredientAliasRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<IngredientAlias[]>>;
  insert: jest.Mock<(row: IngredientAlias) => Promise<IngredientAlias>>;
  update: jest.Mock<(row: IngredientAlias) => Promise<IngredientAlias>>;
};
const recipes = recipeIngredientRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<RecipeIngredient[]>>;
  update: jest.Mock<(row: RecipeIngredient) => Promise<RecipeIngredient>>;
};
const pantry = pantryItemRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<PantryItem[]>>;
  update: jest.Mock<(row: PantryItem) => Promise<PantryItem>>;
  delete: jest.Mock<(id: string) => Promise<void>>;
};
const shopping = shoppingItemRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<ShoppingItem[]>>;
  update: jest.Mock<(row: ShoppingItem) => Promise<ShoppingItem>>;
};
const logs = consumptionLogRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<ConsumptionLog[]>>;
  update: jest.Mock<(row: ConsumptionLog) => Promise<ConsumptionLog>>;
};

function ingredient(id: string, name: string): Ingredient {
  return {
    id,
    name,
    category: 'Povrće',
    defaultUnit: 'kom',
    emoji: null,
    trackPresence: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

function pantryItem(id: string, ingredientId: string, quantity: number, unit: PantryItem['unit']): PantryItem {
  return {
    id,
    ingredientId,
    quantity,
    unit,
    expiresAt: null,
    notes: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

describe('linkIngredients', () => {
  beforeEach(() => {
    ingredients.findById.mockReset();
    ingredients.delete.mockReset();
    aliases.findManyWhere.mockReset();
    aliases.insert.mockReset();
    aliases.update.mockReset();
    recipes.findManyWhere.mockReset();
    recipes.update.mockReset();
    pantry.findManyWhere.mockReset();
    pantry.update.mockReset();
    pantry.delete.mockReset();
    shopping.findManyWhere.mockReset();
    shopping.update.mockReset();
    logs.findManyWhere.mockReset();
    logs.update.mockReset();

    recipes.findManyWhere.mockResolvedValue([]);
    pantry.findManyWhere.mockResolvedValue([]);
    shopping.findManyWhere.mockResolvedValue([]);
    logs.findManyWhere.mockResolvedValue([]);
    aliases.findManyWhere.mockResolvedValue([]);
    aliases.insert.mockImplementation(async (row) => row);
  });

  it('retargets recipes, sums matching pantry units, aliases the absorbed name, and deletes absorb', async () => {
    ingredients.findById.mockImplementation(async (id) => {
      if (id === 'keep') return ingredient('keep', 'Paradajz');
      if (id === 'absorb') return ingredient('absorb', 'Paradajz konzerva');
      return null;
    });
    recipes.findManyWhere.mockResolvedValue([
      {
        id: 'ri-1',
        recipeId: 'rec-1',
        ingredientId: 'absorb',
        quantity: 1,
        unit: 'konzerva',
        notes: null,
        sortOrder: 0,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
    pantry.findManyWhere.mockImplementation(async (_where: string, params: unknown[]) => {
      const id = String(params[0]);
      if (id === 'absorb') return [pantryItem('p-abs', 'absorb', 2, 'kom')];
      if (id === 'keep') return [pantryItem('p-keep', 'keep', 3, 'kom')];
      return [];
    });

    await linkIngredients('absorb', 'keep');

    expect(recipes.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ri-1', ingredientId: 'keep' })
    );
    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p-keep', quantity: 5 })
    );
    expect(pantry.delete).toHaveBeenCalledWith('p-abs');
    expect(aliases.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredientId: 'keep',
        alias: 'paradajz konzerva',
      })
    );
    expect(ingredients.delete).toHaveBeenCalledWith('absorb');
    expect(ingredients.delete).not.toHaveBeenCalledWith('keep');
  });

  it('reassigns pantry rows when units differ', async () => {
    ingredients.findById.mockImplementation(async (id) => {
      if (id === 'keep') return ingredient('keep', 'Paradajz');
      if (id === 'absorb') return ingredient('absorb', 'Pelat');
      return null;
    });
    pantry.findManyWhere.mockImplementation(async (_where: string, params: unknown[]) => {
      const id = String(params[0]);
      if (id === 'absorb') return [pantryItem('p-abs', 'absorb', 400, 'g')];
      if (id === 'keep') return [pantryItem('p-keep', 'keep', 3, 'kom')];
      return [];
    });

    await linkIngredients('absorb', 'keep');

    expect(pantry.delete).not.toHaveBeenCalled();
    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p-abs', ingredientId: 'keep', quantity: 400, unit: 'g' })
    );
  });

  it('converts grams into kilograms when merging pantry stock', async () => {
    ingredients.findById.mockImplementation(async (id) => {
      if (id === 'keep') return ingredient('keep', 'Brašno');
      if (id === 'absorb') return ingredient('absorb', 'Pšenično brašno');
      return null;
    });
    pantry.findManyWhere.mockImplementation(async (_where: string, params: unknown[]) => {
      const id = String(params[0]);
      if (id === 'absorb') return [pantryItem('p-abs', 'absorb', 500, 'g')];
      if (id === 'keep') return [pantryItem('p-keep', 'keep', 1, 'kg')];
      return [];
    });

    await linkIngredients('absorb', 'keep');

    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p-keep', quantity: 1.5, unit: 'kg' })
    );
    expect(pantry.delete).toHaveBeenCalledWith('p-abs');
  });
});

describe('linkableIngredients', () => {
  const flour = ingredient('keep', 'Brašno');
  const wheat = ingredient('absorb', 'Pšenično brašno');
  const milk = ingredient('milk', 'Mleko');
  const eggs = ingredient('eggs', 'Jaja');

  it('includes weight items stored in g or kg', () => {
    const list = linkableIngredients(
      pantryItem('p-keep', 'keep', 1, 'kg'),
      [
        pantryItem('p-keep', 'keep', 1, 'kg'),
        pantryItem('p-abs', 'absorb', 500, 'g'),
        pantryItem('p-milk', 'milk', 1, 'l'),
        pantryItem('p-eggs', 'eggs', 6, 'kom'),
      ],
      [flour, wheat, milk, eggs]
    );
    expect(list.map((row) => row.id)).toEqual(['absorb']);
  });

  it('includes volume items stored in ml or l', () => {
    const list = linkableIngredients(
      pantryItem('p-milk', 'milk', 1, 'l'),
      [
        pantryItem('p-milk', 'milk', 1, 'l'),
        pantryItem('p-oil', 'absorb', 500, 'ml'),
        pantryItem('p-keep', 'keep', 1, 'kg'),
      ],
      [flour, wheat, milk]
    );
    expect(list.map((row) => row.id)).toEqual(['absorb']);
  });

  it('does not mix count units with weight', () => {
    const list = linkableIngredients(
      pantryItem('p-eggs', 'eggs', 6, 'kom'),
      [
        pantryItem('p-eggs', 'eggs', 6, 'kom'),
        pantryItem('p-keep', 'keep', 1, 'kg'),
      ],
      [flour, eggs]
    );
    expect(list).toEqual([]);
  });
});
