import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Meal, RecipeIngredient } from '@/types';

jest.mock('@/services/repositories', () => ({
  mealRepository: { findManyWhere: jest.fn(), delete: jest.fn() },
  recipeIngredientRepository: { findManyWhere: jest.fn(), delete: jest.fn() },
  recipeRepository: { delete: jest.fn() },
}));

import { mealRepository, recipeIngredientRepository, recipeRepository } from '@/services/repositories';
import { deleteRecipe, recipeDeletionImpact } from '../deleteRecipe';

const meals = mealRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<Meal[]>>;
  delete: jest.Mock<(id: string) => Promise<void>>;
};
const rows = recipeIngredientRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<RecipeIngredient[]>>;
  delete: jest.Mock<(id: string) => Promise<void>>;
};
const recipes = recipeRepository as unknown as { delete: jest.Mock<(id: string) => Promise<void>> };

const TODAY = '2026-09-30';

function meal(overrides: Partial<Meal>): Meal {
  return {
    id: 'meal-1',
    mealPlanId: 'plan-1',
    date: TODAY,
    mealType: 'Ručak',
    recipeId: 'rec-1',
    servings: 4,
    notes: null,
    isCooked: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('deleteRecipe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rows.findManyWhere.mockResolvedValue([{ id: 'ri-1' } as RecipeIngredient]);
  });

  it('counts upcoming and past meals', async () => {
    meals.findManyWhere.mockResolvedValue([
      meal({ id: 'a', date: TODAY }),
      meal({ id: 'b', date: '2026-09-01' }),
      meal({ id: 'c', date: '2026-10-02', isCooked: true }),
    ]);
    expect(await recipeDeletionImpact('rec-1', TODAY)).toEqual({ upcoming: 1, past: 2 });
  });

  it('refuses while the recipe is planned and deletes nothing', async () => {
    meals.findManyWhere.mockResolvedValue([meal({ date: '2026-10-01' })]);

    await expect(deleteRecipe('rec-1', TODAY)).rejects.toThrow(/u planu/);
    expect(rows.delete).not.toHaveBeenCalled();
    expect(recipes.delete).not.toHaveBeenCalled();
  });

  it('removes past meals, then ingredients, then the recipe', async () => {
    meals.findManyWhere.mockResolvedValue([meal({ id: 'old', date: '2026-09-01', isCooked: true })]);

    await deleteRecipe('rec-1', TODAY);

    expect(meals.delete).toHaveBeenCalledWith('old');
    expect(rows.delete).toHaveBeenCalledWith('ri-1');
    expect(recipes.delete).toHaveBeenCalledWith('rec-1');
  });
});
