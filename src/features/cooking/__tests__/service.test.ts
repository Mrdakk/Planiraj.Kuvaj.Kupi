import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ConsumptionLog, Meal, PantryItem, RecipeIngredient } from '@/types';

jest.mock('@/services/repositories', () => ({
  recipeIngredientRepository: {
    findManyWhere: jest.fn(),
  },
  pantryItemRepository: {
    findAll: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
  consumptionLogRepository: {
    insert: jest.fn(),
    findManyWhere: jest.fn(),
    delete: jest.fn(),
  },
  mealRepository: {
    update: jest.fn(),
  },
  ingredientRepository: {
    findAll: jest.fn(),
  },
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-01T12:00:00.000Z',
}));

import {
  consumptionLogRepository,
  ingredientRepository,
  mealRepository,
  pantryItemRepository,
  recipeIngredientRepository,
} from '@/services/repositories';
import { buildConsumptionPreview, consumeMeal, displayIngredientName, unconsumeMeal } from '../service';

const recipes = recipeIngredientRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<RecipeIngredient[]>>;
};
const pantry = pantryItemRepository as unknown as {
  findAll: jest.Mock<() => Promise<PantryItem[]>>;
  update: jest.Mock<(item: PantryItem) => Promise<PantryItem>>;
  insert: jest.Mock<(item: PantryItem) => Promise<PantryItem>>;
};
const logsRepo = consumptionLogRepository as unknown as {
  insert: jest.Mock<(log: ConsumptionLog) => Promise<ConsumptionLog>>;
  findManyWhere: jest.Mock<(...args: never[]) => Promise<ConsumptionLog[]>>;
  delete: jest.Mock<(id: string) => Promise<void>>;
};
const meals = mealRepository as unknown as {
  update: jest.Mock<(meal: Meal) => Promise<Meal>>;
};
const ingredients = ingredientRepository as unknown as {
  findAll: jest.Mock<() => Promise<{ id: string; name: string; trackPresence?: boolean }[]>>;
};

function createMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    mealPlanId: 'plan-1',
    date: '2026-09-07',
    mealType: 'Ručak',
    recipeId: 'rec-1',
    servings: 4,
    notes: null,
    isCooked: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function createRecipeIngredient(overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return {
    id: 'ri-1',
    recipeId: 'rec-1',
    ingredientId: 'ing-eggs',
    quantity: 4,
    unit: 'kom',
    notes: null,
    sortOrder: 0,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function createPantryItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: 'pantry-1',
    ingredientId: 'ing-eggs',
    quantity: 12,
    unit: 'kom',
    expiresAt: null,
    notes: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function createConsumptionLog(overrides: Partial<ConsumptionLog> = {}): ConsumptionLog {
  return {
    id: 'log-1',
    mealId: 'meal-1',
    ingredientId: 'ing-eggs',
    quantity: 4,
    unit: 'kom',
    consumedAt: '2026-09-01T12:00:00.000Z',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('meal detail actions: mark as cooked', () => {
  beforeEach(() => {
    recipes.findManyWhere.mockReset();
    pantry.findAll.mockReset();
    pantry.update.mockReset();
    pantry.insert.mockReset();
    logsRepo.insert.mockReset();
    logsRepo.findManyWhere.mockReset();
    logsRepo.delete.mockReset();
    meals.update.mockReset();
    ingredients.findAll.mockReset();
    pantry.update.mockImplementation(async (item) => item);
    pantry.insert.mockImplementation(async (item) => item);
    logsRepo.insert.mockImplementation(async (log) => log);
    logsRepo.findManyWhere.mockResolvedValue([]);
    logsRepo.delete.mockImplementation(async () => undefined);
    meals.update.mockImplementation(async (meal) => meal);
    ingredients.findAll.mockResolvedValue([]);
  });

  it('preview shows required, available, and how much will be consumed', async () => {
    const meal = createMeal({ servings: 2 });
    recipes.findManyWhere.mockResolvedValue([
      createRecipeIngredient({ quantity: 4, unit: 'kom' }),
    ]);
    pantry.findAll.mockResolvedValue([createPantryItem({ quantity: 1, unit: 'kom' })]);

    const preview = await buildConsumptionPreview(meal, 4, new Map([['ing-eggs', 'Jaja']]));

    expect(preview.items).toHaveLength(1);
    expect(preview.items[0]).toMatchObject({
      ingredientName: 'Jaja',
      quantity: 2,
      available: 1,
      willConsume: 1,
      trackPresence: false,
    });
  });

  it('loads names from the database when the UI map is empty', async () => {
    const meal = createMeal();
    recipes.findManyWhere.mockResolvedValue([createRecipeIngredient()]);
    pantry.findAll.mockResolvedValue([]);
    ingredients.findAll.mockResolvedValue([{ id: 'ing-eggs', name: 'Jaja' }]);

    const preview = await buildConsumptionPreview(meal, 4, new Map());

    expect(preview.items[0]?.ingredientName).toBe('Jaja');
  });

  it('presence preview does not plan a quantity deduction', async () => {
    const meal = createMeal();
    recipes.findManyWhere.mockResolvedValue([
      createRecipeIngredient({ ingredientId: 'ing-onion', quantity: 2, unit: 'glavica' }),
    ]);
    pantry.findAll.mockResolvedValue([
      createPantryItem({ ingredientId: 'ing-onion', quantity: 1, unit: 'glavica' }),
    ]);
    ingredients.findAll.mockResolvedValue([
      { id: 'ing-onion', name: 'Crni luk', trackPresence: true },
    ]);

    const preview = await buildConsumptionPreview(meal, 4, new Map());

    expect(preview.items[0]).toMatchObject({
      trackPresence: true,
      willConsume: 0,
      quantity: 2,
    });
  });

  it('never shows a UUID as the ingredient name', () => {
    expect(displayIngredientName('48f53c4e-b1a5-4a44-a4e4-d54ba1751aa6')).toBe('Sastojak');
    expect(displayIngredientName('Crni luk')).toBe('Crni luk');
    expect(displayIngredientName('sol')).toBe('So');
  });

  it('Potvrdi: reduces pantry, writes a log, and marks the meal cooked', async () => {
    const meal = createMeal();
    recipes.findManyWhere.mockResolvedValue([
      createRecipeIngredient({ quantity: 4, unit: 'kom' }),
    ]);
    pantry.findAll.mockResolvedValue([createPantryItem({ quantity: 12, unit: 'kom' })]);

    const logs = await consumeMeal({ meal, recipeBaseServings: 4 });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.quantity).toBe(4);
    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pantry-1', quantity: 8 })
    );
    expect(meals.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'meal-1', isCooked: true })
    );
  });

  it('Delimično then Potvrdi: consumes only the override, not the full recipe amount', async () => {
    const meal = createMeal();
    recipes.findManyWhere.mockResolvedValue([
      createRecipeIngredient({ quantity: 4, unit: 'kom' }),
    ]);
    pantry.findAll.mockResolvedValue([createPantryItem({ quantity: 12, unit: 'kom' })]);

    const logs = await consumeMeal({
      meal,
      recipeBaseServings: 4,
      overrides: new Map([['ing-eggs', 1]]),
    });

    expect(logs[0]?.quantity).toBe(1);
    expect(pantry.update).toHaveBeenCalledWith(expect.objectContaining({ quantity: 11 }));
    expect(pantry.update).toHaveBeenCalledTimes(1);
  });

  it('sastojak without pantry stays at zero and still lets the meal be marked cooked', async () => {
    const meal = createMeal();
    recipes.findManyWhere.mockResolvedValue([
      createRecipeIngredient({ ingredientId: 'ing-ham', quantity: 120, unit: 'g' }),
    ]);
    pantry.findAll.mockResolvedValue([]);

    const logs = await consumeMeal({
      meal,
      recipeBaseServings: 4,
      overrides: new Map([['ing-ham', 0]]),
    });

    expect(logs).toHaveLength(0);
    expect(pantry.update).not.toHaveBeenCalled();
    expect(meals.update).toHaveBeenCalledWith(expect.objectContaining({ isCooked: true }));
  });

  it('does not deduct quantity for presence ingredients', async () => {
    const meal = createMeal();
    recipes.findManyWhere.mockResolvedValue([
      createRecipeIngredient({ ingredientId: 'ing-onion', quantity: 2, unit: 'glavica' }),
    ]);
    pantry.findAll.mockResolvedValue([
      createPantryItem({ id: 'pantry-onion', ingredientId: 'ing-onion', quantity: 1, unit: 'glavica' }),
    ]);
    ingredients.findAll.mockResolvedValue([
      { id: 'ing-onion', name: 'Crni luk', trackPresence: true },
    ]);

    const logs = await consumeMeal({
      meal,
      recipeBaseServings: 4,
      presenceStillHave: new Map([['ing-onion', true]]),
    });

    expect(logs).toHaveLength(0);
    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pantry-onion', quantity: 1 })
    );
    expect(meals.update).toHaveBeenCalledWith(expect.objectContaining({ isCooked: true }));
  });

  it('marks presence as out of stock when the cook sheet answers no', async () => {
    const meal = createMeal();
    recipes.findManyWhere.mockResolvedValue([
      createRecipeIngredient({ ingredientId: 'ing-onion', quantity: 2, unit: 'glavica' }),
    ]);
    pantry.findAll.mockResolvedValue([
      createPantryItem({ id: 'pantry-onion', ingredientId: 'ing-onion', quantity: 1, unit: 'glavica' }),
    ]);
    ingredients.findAll.mockResolvedValue([
      { id: 'ing-onion', name: 'Crni luk', trackPresence: true },
    ]);

    await consumeMeal({
      meal,
      recipeBaseServings: 4,
      presenceStillHave: new Map([['ing-onion', false]]),
    });

    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pantry-onion', quantity: 0 })
    );
  });
});

describe('unconsumeMeal', () => {
  beforeEach(() => {
    pantry.findAll.mockReset();
    pantry.update.mockReset();
    pantry.insert.mockReset();
    logsRepo.findManyWhere.mockReset();
    logsRepo.delete.mockReset();
    meals.update.mockReset();
    pantry.update.mockImplementation(async (item) => item);
    pantry.insert.mockImplementation(async (item) => item);
    logsRepo.delete.mockImplementation(async () => undefined);
    meals.update.mockImplementation(async (meal) => meal);
  });

  it('restores pantry from logs, deletes logs, and unlocks the meal', async () => {
    const meal = createMeal({ isCooked: true });
    logsRepo.findManyWhere.mockResolvedValue([createConsumptionLog({ quantity: 4 })]);
    pantry.findAll.mockResolvedValue([createPantryItem({ quantity: 8 })]);

    await unconsumeMeal(meal);

    expect(pantry.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pantry-1', quantity: 12 })
    );
    expect(logsRepo.delete).toHaveBeenCalledWith('log-1');
    expect(meals.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'meal-1', isCooked: false })
    );
  });

  it('creates a pantry row when the ingredient is gone', async () => {
    const meal = createMeal({ isCooked: true });
    logsRepo.findManyWhere.mockResolvedValue([
      createConsumptionLog({ ingredientId: 'ing-ham', quantity: 120, unit: 'g' }),
    ]);
    pantry.findAll.mockResolvedValue([]);

    await unconsumeMeal(meal);

    expect(pantry.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredientId: 'ing-ham',
        quantity: 120,
        unit: 'g',
      })
    );
    expect(meals.update).toHaveBeenCalledWith(expect.objectContaining({ isCooked: false }));
  });

  it('still unlocks a cooked meal that has no consumption logs', async () => {
    const meal = createMeal({ isCooked: true });
    logsRepo.findManyWhere.mockResolvedValue([]);
    pantry.findAll.mockResolvedValue([]);

    await unconsumeMeal(meal);

    expect(pantry.update).not.toHaveBeenCalled();
    expect(pantry.insert).not.toHaveBeenCalled();
    expect(logsRepo.delete).not.toHaveBeenCalled();
    expect(meals.update).toHaveBeenCalledWith(expect.objectContaining({ isCooked: false }));
  });

  it('refuses to undo a meal that is not cooked', async () => {
    await expect(unconsumeMeal(createMeal({ isCooked: false }))).rejects.toThrow(
      'Obrok nije označen kao kuvano.'
    );
    expect(meals.update).not.toHaveBeenCalled();
  });
});

