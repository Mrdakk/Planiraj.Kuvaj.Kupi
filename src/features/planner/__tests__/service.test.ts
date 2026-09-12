import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Meal, MealPlan } from '@/types';

jest.mock('@/services/repositories', () => ({
  mealPlanRepository: {
    findManyWhere: jest.fn(),
    insert: jest.fn(),
  },
  mealRepository: {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-01T12:00:00.000Z',
}));

jest.mock('@/lib/dates', () => {
  const actual = jest.requireActual('@/lib/dates') as typeof import('@/lib/dates');
  return {
    ...actual,
    todayISO: () => '2026-09-10',
  };
});

import { mealPlanRepository, mealRepository } from '@/services/repositories';
import {
  addMeal,
  assertMealDateNotPast,
  compareMealsByPlanOrder,
  copyMeal,
  defaultDayForWeek,
  ensureMealPlanForDate,
  formatWeekNavRange,
  getSeedPlanWeekStarts,
  getWeekDates,
  getWeekStart,
  isCurrentWeek,
  isPastDay,
  moveMeal,
  canDeleteMeal,
  deleteMeal,
  weekDayChipLabel,
} from '../service';

const plans = mealPlanRepository as unknown as {
  findManyWhere: jest.Mock<(...args: never[]) => Promise<MealPlan[]>>;
  insert: jest.Mock<(plan: MealPlan) => Promise<MealPlan>>;
};
const meals = mealRepository as unknown as {
  insert: jest.Mock<(meal: Meal) => Promise<Meal>>;
  update: jest.Mock<(meal: Meal) => Promise<Meal>>;
  delete: jest.Mock<(id: string) => Promise<void>>;
};

function createMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    mealPlanId: 'plan-week-1',
    date: '2026-09-07',
    mealType: 'Ručak',
    recipeId: 'rec-1',
    servings: 4,
    notes: 'original',
    isCooked: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function createPlan(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    id: 'plan-week-1',
    weekStart: '2026-09-07',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

describe('meal detail actions: copy and move', () => {
  beforeEach(() => {
    plans.findManyWhere.mockReset();
    plans.insert.mockReset();
    meals.insert.mockReset();
    meals.update.mockReset();
    meals.delete.mockReset();
    plans.insert.mockImplementation(async (plan) => plan);
    meals.insert.mockImplementation(async (meal) => meal);
    meals.update.mockImplementation(async (meal) => meal);
    meals.delete.mockImplementation(async () => undefined);
  });

  it('Kopiraj: keeps the original and inserts a new uncooked meal on the target date', async () => {
    const source = createMeal();
    plans.findManyWhere.mockResolvedValue([createPlan()]);

    const copy = await copyMeal(source, '2026-09-11', 'Večera');

    expect(copy.id).not.toBe(source.id);
    expect(copy.date).toBe('2026-09-11');
    expect(copy.mealType).toBe('Večera');
    expect(copy.recipeId).toBe(source.recipeId);
    expect(copy.isCooked).toBe(false);
    expect(copy.mealPlanId).toBe('plan-week-1');
    expect(meals.insert).toHaveBeenCalledTimes(1);
    expect(meals.update).not.toHaveBeenCalled();
  });

  it('Kopiraj: attaches the copy to the plan of the target week', async () => {
    const source = createMeal();
    plans.findManyWhere.mockResolvedValue([]);

    const copy = await copyMeal(source, '2026-09-14', 'Doručak');

    expect(getWeekStart(new Date(2026, 8, 14))).toBe('2026-09-14');
    expect(plans.insert).toHaveBeenCalledTimes(1);
    const createdPlan = plans.insert.mock.calls[0][0] as MealPlan;
    expect(createdPlan.weekStart).toBe('2026-09-14');
    expect(copy.mealPlanId).toBe(createdPlan.id);
    expect(copy.mealPlanId).not.toBe(source.mealPlanId);
  });

  it('Pomeri: updates the same meal instead of inserting a copy', async () => {
    const source = createMeal({ isCooked: false });
    plans.findManyWhere.mockResolvedValue([createPlan()]);

    const moved = await moveMeal(source, '2026-09-11', 'Užina');

    expect(moved.id).toBe(source.id);
    expect(moved.date).toBe('2026-09-11');
    expect(moved.mealType).toBe('Užina');
    expect(meals.update).toHaveBeenCalledTimes(1);
    expect(meals.insert).not.toHaveBeenCalled();
  });

  it('Pomeri: moves the meal onto the target week plan', async () => {
    const source = createMeal();
    const nextWeekPlan = createPlan({ id: 'plan-week-2', weekStart: '2026-09-14' });
    plans.findManyWhere.mockResolvedValue([nextWeekPlan]);

    const moved = await moveMeal(source, '2026-09-14', 'Ručak');

    expect(moved.mealPlanId).toBe('plan-week-2');
    expect(moved.date).toBe('2026-09-14');
  });

  it('canDeleteMeal: cooked meals cannot be deleted', () => {
    expect(canDeleteMeal(createMeal({ isCooked: false }))).toBe(true);
    expect(canDeleteMeal(createMeal({ isCooked: true }))).toBe(false);
  });

  it('deleteMeal: refuses a cooked meal and does not touch the repository', async () => {
    await expect(deleteMeal(createMeal({ isCooked: true }))).rejects.toThrow(
      'Skuvani obrok se ne može obrisati.'
    );
    expect(meals.delete).not.toHaveBeenCalled();
  });

  it('deleteMeal: removes an uncooked meal', async () => {
    const meal = createMeal({ isCooked: false });
    await deleteMeal(meal);
    expect(meals.delete).toHaveBeenCalledWith(meal.id);
  });

  it('ensureMealPlanForDate: Monday of the given date is used as week_start', async () => {
    plans.findManyWhere.mockResolvedValue([]);
    const plan = await ensureMealPlanForDate('2026-09-09');
    expect(plan.weekStart).toBe('2026-09-07');
  });
});

describe('assertMealDateNotPast', () => {
  it('throws for dates before today', () => {
    expect(() => assertMealDateNotPast('2026-09-09')).toThrow(
      'Obrok se ne može dodati za datum pre današnjeg.'
    );
  });

  it('allows today and future dates', () => {
    expect(() => assertMealDateNotPast('2026-09-10')).not.toThrow();
    expect(() => assertMealDateNotPast('2026-09-11')).not.toThrow();
  });
});

describe('addMeal, copyMeal, moveMeal refuse past dates', () => {
  beforeEach(() => {
    plans.findManyWhere.mockReset();
    plans.insert.mockReset();
    meals.insert.mockReset();
    meals.update.mockReset();
    plans.insert.mockImplementation(async (plan) => plan);
    meals.insert.mockImplementation(async (meal) => meal);
    meals.update.mockImplementation(async (meal) => meal);
    plans.findManyWhere.mockResolvedValue([createPlan()]);
  });

  it('addMeal: rejects yesterday and does not insert', async () => {
    await expect(addMeal('plan-week-1', '2026-09-09', 'Ručak', 'rec-1', 4)).rejects.toThrow(
      'Obrok se ne može dodati za datum pre današnjeg.'
    );
    expect(meals.insert).not.toHaveBeenCalled();
  });

  it('addMeal: allows today and tomorrow', async () => {
    await expect(addMeal('plan-week-1', '2026-09-10', 'Ručak', 'rec-1', 4)).resolves.toMatchObject({
      date: '2026-09-10',
    });
    await expect(addMeal('plan-week-1', '2026-09-11', 'Večera', 'rec-1', 2)).resolves.toMatchObject({
      date: '2026-09-11',
    });
    expect(meals.insert).toHaveBeenCalledTimes(2);
  });

  it('addMeal: stores blank notes as null', async () => {
    const meal = await addMeal('plan-week-1', '2026-09-11', 'Ručak', 'rec-1', 4, '   ');
    expect(meal.notes).toBeNull();
    expect(meals.insert).toHaveBeenCalledWith(expect.objectContaining({ notes: null }));
  });

  it('addMeal: stores trimmed meal notes', async () => {
    const meal = await addMeal('plan-week-1', '2026-09-11', 'Ručak', 'rec-1', 4, '  Bez luka.  ');
    expect(meal.notes).toBe('Bez luka.');
    expect(meals.insert).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Bez luka.' }));
  });

  it('addMeal: allowPast inserts a past date for seed data', async () => {
    await expect(
      addMeal('plan-week-1', '2026-09-09', 'Ručak', 'rec-1', 4, undefined, { allowPast: true })
    ).resolves.toMatchObject({ date: '2026-09-09' });
    expect(meals.insert).toHaveBeenCalledTimes(1);
  });

  it('copyMeal: rejects a past target date', async () => {
    await expect(copyMeal(createMeal(), '2026-09-09', 'Ručak')).rejects.toThrow(
      'Obrok se ne može dodati za datum pre današnjeg.'
    );
    expect(meals.insert).not.toHaveBeenCalled();
  });

  it('moveMeal: rejects a past target date', async () => {
    await expect(moveMeal(createMeal({ isCooked: false }), '2026-09-09', 'Ručak')).rejects.toThrow(
      'Obrok se ne može dodati za datum pre današnjeg.'
    );
    expect(meals.update).not.toHaveBeenCalled();
  });
});

describe('plan tab week day chips', () => {
  const today = '2026-09-10';
  const weekStart = '2026-09-08';

  it('getWeekDates: returns 7 ISO dates from Monday', () => {
    expect(getWeekDates(weekStart)).toEqual([
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
    ]);
  });

  it('weekDayChipLabel: today is Danas, other days use weekday codes', () => {
    expect(weekDayChipLabel('2026-09-10', today)).toBe('Danas');
    expect(weekDayChipLabel('2026-09-11', today)).toBe('PET');
  });

  it('defaultDayForWeek: today when in the week, otherwise Monday', () => {
    expect(defaultDayForWeek(weekStart, today)).toBe('2026-09-10');
    expect(defaultDayForWeek('2026-09-14', today)).toBe('2026-09-14');
  });

  it('compareMealsByPlanOrder: Užina comes before Ručak', () => {
    const snack = createMeal({ id: 'snack', mealType: 'Užina' });
    const lunch = createMeal({ id: 'lunch', mealType: 'Ručak' });
    expect(compareMealsByPlanOrder(snack, lunch)).toBeLessThan(0);
    expect(compareMealsByPlanOrder(lunch, snack)).toBeGreaterThan(0);
  });

  it('isCurrentWeek: true only for the week that contains today', () => {
    expect(isCurrentWeek('2026-09-07', today)).toBe(true);
    expect(isCurrentWeek('2026-09-14', today)).toBe(false);
  });

  it('formatWeekNavRange: same month uses one month name', () => {
    expect(formatWeekNavRange(weekStart)).toBe('8–14. septembar');
  });

  it('formatWeekNavRange: splits months when the week crosses a boundary', () => {
    expect(formatWeekNavRange('2026-09-28')).toBe('28. septembar – 4. oktobar');
  });

  it('isPastDay: dates before today are past, today and later are not', () => {
    expect(isPastDay('2026-09-09', today)).toBe(true);
    expect(isPastDay('2026-09-10', today)).toBe(false);
    expect(isPastDay('2026-09-11', today)).toBe(false);
  });

  it('getSeedPlanWeekStarts: includes the week Plan tab opens on, then next week', () => {
    expect(getSeedPlanWeekStarts(new Date(2026, 8, 10))).toEqual(['2026-09-07', '2026-09-14']);
  });
});
