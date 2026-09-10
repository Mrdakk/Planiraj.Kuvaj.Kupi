import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { GroceryStoreSection } from '@/constants/categories';
import type { Unit } from '@/constants/units';
import type { ShoppingItem, ShoppingList } from '@/types';

type ShoppingAddLine = {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: GroceryStoreSection;
  sourceMealIds: string[];
};

jest.mock('@/services/repositories', () => ({
  shoppingListRepository: {
    findManyWhere: jest.fn(),
    insert: jest.fn(),
  },
  shoppingItemRepository: {
    findManyWhere: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  mealPlanRepository: {},
  mealRepository: {},
  recipeRepository: {},
  recipeIngredientRepository: {},
  pantryItemRepository: {},
  ingredientRepository: {},
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-10T12:00:00.000Z',
}));

import { shoppingItemRepository, shoppingListRepository } from '@/services/repositories';
import {
  applyAddToShopping,
  ensureShoppingList,
  previewAddToShopping,
} from '../service';

const lists = shoppingListRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<ShoppingList[]>>;
  insert: jest.Mock<(list: ShoppingList) => Promise<ShoppingList>>;
};

const items = shoppingItemRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<ShoppingItem[]>>;
  insert: jest.Mock<(item: ShoppingItem) => Promise<ShoppingItem>>;
  update: jest.Mock<(item: ShoppingItem) => Promise<ShoppingItem>>;
};

const WEEK_START = '2026-09-08';

function createList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return {
    id: 'list-1',
    weekStart: WEEK_START,
    name: 'Lista za 08-09-2026',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  };
}

function createItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'item-1',
    shoppingListId: 'list-1',
    ingredientId: 'ing-tomato',
    name: 'Paradajz',
    quantity: 2,
    unit: 'kom',
    category: 'Povrće',
    isChecked: false,
    isManual: false,
    sourceMealIds: ['meal-a'],
    notes: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  };
}

function createLine(overrides: Partial<ShoppingAddLine> = {}): ShoppingAddLine {
  return {
    ingredientId: 'ing-tomato',
    name: 'Paradajz',
    quantity: 3,
    unit: 'kom',
    category: 'Povrće',
    sourceMealIds: ['meal-b'],
    ...overrides,
  };
}

describe('ensureShoppingList', () => {
  beforeEach(() => {
    lists.findManyWhere.mockReset();
    lists.insert.mockReset();
  });

  it('does not insert a second list for the same week', async () => {
    const stored: ShoppingList[] = [];
    lists.findManyWhere.mockImplementation(async () => stored);
    lists.insert.mockImplementation(async (list) => {
      stored.push(list);
      return list;
    });

    const first = await ensureShoppingList(WEEK_START);
    const second = await ensureShoppingList(WEEK_START);

    expect(lists.insert).toHaveBeenCalledTimes(1);
    expect(second.id).toBe(first.id);
  });
});

describe('previewAddToShopping', () => {
  beforeEach(() => {
    lists.findManyWhere.mockReset();
    lists.insert.mockReset();
    items.findManyWhere.mockReset();
    items.insert.mockReset();
    items.update.mockReset();
    lists.findManyWhere.mockResolvedValue([createList()]);
    items.findManyWhere.mockResolvedValue([]);
  });

  it('puts unmatched ingredients on newLines', async () => {
    const preview = await previewAddToShopping(WEEK_START, [createLine()]);

    expect(preview.list.id).toBe('list-1');
    expect(preview.newLines).toHaveLength(1);
    expect(preview.newLines[0]?.ingredientId).toBe('ing-tomato');
    expect(preview.conflicts).toHaveLength(0);
  });

  it('marks same ingredient and unit as a conflict', async () => {
    items.findManyWhere.mockResolvedValue([createItem()]);

    const preview = await previewAddToShopping(WEEK_START, [createLine()]);

    expect(preview.newLines).toHaveLength(0);
    expect(preview.conflicts).toHaveLength(1);
    expect(preview.conflicts[0]?.existing.id).toBe('item-1');
    expect(preview.conflicts[0]?.line.quantity).toBe(3);
  });

  it('treats a different unit as a new line', async () => {
    items.findManyWhere.mockResolvedValue([createItem({ unit: 'kg' })]);

    const preview = await previewAddToShopping(WEEK_START, [createLine({ unit: 'kom' })]);

    expect(preview.newLines).toHaveLength(1);
    expect(preview.conflicts).toHaveLength(0);
  });
});

describe('applyAddToShopping', () => {
  beforeEach(() => {
    items.findManyWhere.mockReset();
    items.insert.mockReset();
    items.update.mockReset();
    items.findManyWhere.mockResolvedValue([]);
    items.insert.mockImplementation(async (item) => item);
    items.update.mockImplementation(async (item) => item);
  });

  it('inserts a new item when nothing matches', async () => {
    await applyAddToShopping('list-1', [createLine()], 'merge');

    expect(items.insert).toHaveBeenCalledTimes(1);
    expect(items.update).not.toHaveBeenCalled();
    const inserted = items.insert.mock.calls[0]?.[0];
    expect(inserted).toMatchObject({
      shoppingListId: 'list-1',
      ingredientId: 'ing-tomato',
      quantity: 3,
      unit: 'kom',
      isManual: false,
      isChecked: false,
      sourceMealIds: ['meal-b'],
    });
  });

  it('merges quantity and source meals onto the existing row', async () => {
    items.findManyWhere.mockResolvedValue([createItem()]);

    await applyAddToShopping('list-1', [createLine()], 'merge');

    expect(items.insert).not.toHaveBeenCalled();
    expect(items.update).toHaveBeenCalledTimes(1);
    expect(items.update.mock.calls[0]?.[0]).toMatchObject({
      id: 'item-1',
      quantity: 5,
      sourceMealIds: ['meal-a', 'meal-b'],
    });
  });

  it('inserts a separate row when conflict mode is separate', async () => {
    items.findManyWhere.mockResolvedValue([createItem()]);

    await applyAddToShopping('list-1', [createLine()], 'separate');

    expect(items.update).not.toHaveBeenCalled();
    expect(items.insert).toHaveBeenCalledTimes(1);
    expect(items.insert.mock.calls[0]?.[0]).toMatchObject({
      shoppingListId: 'list-1',
      ingredientId: 'ing-tomato',
      quantity: 3,
      isManual: false,
    });
  });
});
